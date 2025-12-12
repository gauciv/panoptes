using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Panoptes.Core.Entities;
using Panoptes.Core.Interfaces;
using Argus.Sync.Reducers;
using Argus.Sync.Data.Models;
using Chrysalis.Cbor.Types.Cardano.Core;
using Chrysalis.Cbor.Types.Cardano.Core.Transaction;
using Chrysalis.Cbor.Types.Cardano.Core.Common;
using Chrysalis.Cbor.Extensions.Cardano.Core;
using Chrysalis.Cbor.Extensions.Cardano.Core.Header;
using Chrysalis.Cbor.Extensions.Cardano.Core.Transaction;
using Chrysalis.Cbor.Extensions.Cardano.Core.Common;
using System;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Text.Json;

namespace Panoptes.Infrastructure.Services
{
    public record PanoptesModel : IReducerModel;

    public class PanoptesReducer : IReducer<PanoptesModel>
    {
        private readonly IAppDbContext _dbContext;
        private readonly IWebhookDispatcher _dispatcher;
        private readonly ILogger<PanoptesReducer>? _logger;
        
        // Rate limit tracking: subscriptionId -> (webhooks in last minute, webhooks in last hour, timestamps)
        private readonly Dictionary<Guid, (Queue<DateTime> minuteWindow, Queue<DateTime> hourWindow)> _rateLimitTracking = new();
        
        // Track subscriptions that have been disabled during current processing (to skip them immediately)
        private readonly HashSet<Guid> _disabledDuringProcessing = new();
        
        // Catch-up mode detection
        private DateTime _lastBlockProcessedAt = DateTime.UtcNow;
        private bool _isCatchingUp = false;
        private int _consecutiveFastBlocks = 0;
        
        // Expose catch-up state for API consumption
        public bool IsCatchingUp => _isCatchingUp;
        
        // Webhook batching: subscriptionId -> list of pending webhooks
        private readonly Dictionary<Guid, List<object>> _pendingWebhooks = new();
        private DateTime _lastBatchFlushAt = DateTime.UtcNow;
        private const int BATCH_SIZE_DURING_CATCHUP = 10; // Max webhooks per subscription during catch-up
        private const int BATCH_FLUSH_INTERVAL_SECONDS = 5; // Flush batches every 5 seconds during catch-up

        public PanoptesReducer(IAppDbContext dbContext, IWebhookDispatcher dispatcher, ILogger<PanoptesReducer>? logger = null)
        {
            _dbContext = dbContext;
            _dispatcher = dispatcher;
            _logger = logger;
        }

        /// <summary>
        /// Checks if a transaction is relevant for a subscription based on wallet address filtering.
        /// Returns true if: subscription has no address filter (null/empty), or transaction involves any filtered address.
        /// </summary>
        private bool IsRelevantForSubscription(WebhookSubscription subscription, HashSet<string> outputAddresses)
        {
            // No filter = listen to all
            if (subscription.WalletAddresses == null || !subscription.WalletAddresses.Any())
                return true;
            
            // Check if any of the subscription's addresses appear in transaction outputs
            foreach (var filterAddress in subscription.WalletAddresses)
            {
                var filterLower = filterAddress.ToLowerInvariant();
                
                // Try exact match first
                if (outputAddresses.Contains(filterLower))
                    return true;
                
                // Also support partial matching (for hex addresses)
                if (outputAddresses.Any(addr => addr.Contains(filterLower) || filterLower.Contains(addr)))
                    return true;
            }
            
            return false;
        }

        public async Task RollForwardAsync(Block block)
        {
            var slot = block.Header().HeaderBody().Slot();
            var blockHash = block.Header().Hash();
            var blockHeight = block.Header().HeaderBody().BlockNumber();
            
            // Detect catch-up mode: if processing blocks very fast, we're catching up
            var now = DateTime.UtcNow;
            var timeSinceLastBlock = (now - _lastBlockProcessedAt).TotalSeconds;
            _lastBlockProcessedAt = now;
            
            // If processing blocks faster than 0.5 seconds each, likely catching up
            if (timeSinceLastBlock < 0.5)
            {
                _consecutiveFastBlocks++;
                if (_consecutiveFastBlocks > 10 && !_isCatchingUp)
                {
                    _isCatchingUp = true;
                    _logger?.LogWarning("🚀 CATCH-UP MODE DETECTED - Enabling webhook batching to prevent rate limit exhaustion");
                }
            }
            else
            {
                _consecutiveFastBlocks = 0;
                if (_isCatchingUp)
                {
                    _isCatchingUp = false;
                    await FlushAllBatchesAsync(); // Flush any remaining batched webhooks
                    _logger?.LogInformation("✅ CATCH-UP COMPLETE - Resuming real-time webhook delivery");
                }
            }

            // Only log every 100 blocks to reduce spam during sync
            if (blockHeight % 100 == 0)
            {
                var mode = _isCatchingUp ? "[CATCH-UP]" : "[REAL-TIME]";
                _logger?.LogInformation("{Mode} Processing block at slot {Slot}, height {Height}", mode, slot, blockHeight);
            }
            
            // Clear the disabled-during-processing set at the start of each block
            // (subscriptions disabled in previous blocks are already excluded by the DB query)
            _disabledDuringProcessing.Clear();

            // Fetch ALL subscriptions first, then filter based on actual rate limit status
            var allSubscriptions = await _dbContext.WebhookSubscriptions
                .Where(s => !s.IsCircuitBroken) // Circuit broken is a persistent flag
                .ToListAsync();
            
            // Check actual rate limit status from delivery logs for each subscription
            var rateLimitCheckTime = DateTime.UtcNow;
            var oneMinuteAgo = rateLimitCheckTime.AddMinutes(-1);
            var oneHourAgo = rateLimitCheckTime.AddHours(-1);
            
            var subscriptions = new List<WebhookSubscription>();
            
            foreach (var sub in allSubscriptions)
            {
                // Calculate actual rate limit status from delivery logs (same as controller does for UI)
                var recentLogs = await _dbContext.DeliveryLogs
                    .Where(l => l.SubscriptionId == sub.Id && l.AttemptedAt >= oneHourAgo)
                    .ToListAsync();
                
                var inLastMinute = recentLogs.Count(l => l.AttemptedAt >= oneMinuteAgo);
                var inLastHour = recentLogs.Count;
                
                var isActuallyRateLimited = 
                    (sub.MaxWebhooksPerMinute > 0 && inLastMinute >= sub.MaxWebhooksPerMinute) ||
                    (sub.MaxWebhooksPerHour > 0 && inLastHour >= sub.MaxWebhooksPerHour);
                
                // Update the DB flag if it doesn't match reality
                if (isActuallyRateLimited != sub.IsRateLimited)
                {
                    sub.IsRateLimited = isActuallyRateLimited;
                    await _dbContext.SaveChangesAsync();
                }
                
                // Only include non-rate-limited subscriptions
                if (!isActuallyRateLimited)
                {
                    subscriptions.Add(sub);
                }
                else
                {
                    _logger?.LogDebug("Skipping rate-limited subscription {Name} ({MinRate}% min, {HourRate}% hour)", 
                        sub.Name, 
                        sub.MaxWebhooksPerMinute > 0 ? (inLastMinute * 100 / sub.MaxWebhooksPerMinute) : 0,
                        sub.MaxWebhooksPerHour > 0 ? (inLastHour * 100 / sub.MaxWebhooksPerHour) : 0);
                }
            }

            // Log subscription count periodically
            if (blockHeight % 100 == 0 && subscriptions.Any())
            {
                var activeCount = subscriptions.Count(s => s.IsActive);
                _logger?.LogInformation("Found {Count} subscriptions ({Active} active, {Paused} paused)", subscriptions.Count, activeCount, subscriptions.Count - activeCount);
            }

            if (subscriptions.Any())
            {
                var txs = block.TransactionBodies();
                if (txs != null && txs.Any())
                {
                    // Log when we find transactions with active subscriptions
                    if (blockHeight % 100 == 0)
                    {
                        _logger?.LogInformation("Block {Height} has {TxCount} transactions", blockHeight, txs.Count());
                    }
                    
                    var txIndex = 0;
                    foreach (var tx in txs)
                    {
                        await ProcessTransaction(tx, txIndex, slot, blockHash, blockHeight, subscriptions);
                        txIndex++;
                    }
                }
            }
            
            // During catch-up, flush batches periodically
            if (_isCatchingUp && (now - _lastBatchFlushAt).TotalSeconds >= BATCH_FLUSH_INTERVAL_SECONDS)
            {
                await FlushAllBatchesAsync();
                _lastBatchFlushAt = now;
            }

            // Update Checkpoint (both slot AND hash for proper resume)
            await UpdateCheckpoint(slot, blockHash);
        }

        private async Task ProcessTransaction(
            TransactionBody tx, 
            int txIndex,
            ulong slot, 
            string blockHash, 
            ulong blockHeight,
            List<WebhookSubscription> subscriptions)
        {
            try
            {
                var txHash = tx.Hash();
                var outputs = tx.Outputs()?.ToList() ?? new List<TransactionOutput>();
                var inputs = tx.Inputs()?.ToList() ?? new List<TransactionInput>();

                // Extract addresses and assets from outputs
                var outputAddresses = new HashSet<string>();
                var policyIds = new HashSet<string>();

                foreach (var output in outputs)
                {
                    // Get output address (returns byte[], convert to hex)
                    var addressBytes = output.Address();
                    if (addressBytes != null && addressBytes.Length > 0)
                    {
                        var addressHex = Convert.ToHexString(addressBytes).ToLowerInvariant();
                        outputAddresses.Add(addressHex);
                    }

                    // Get multi-assets (NFTs/tokens) - use Value extension method
                    var amount = output.Amount();
                    if (amount is LovelaceWithMultiAsset lovelaceWithMultiAsset)
                    {
                        var multiAsset = lovelaceWithMultiAsset.MultiAsset;
                        if (multiAsset?.Value != null)
                        {
                            foreach (var policy in multiAsset.Value.Keys)
                            {
                                var policyHex = Convert.ToHexString(policy).ToLowerInvariant();
                                policyIds.Add(policyHex);
                            }
                        }
                    }
                }

                // Check each subscription for matches
                foreach (var sub in subscriptions)
                {
                    // First check: wallet address filtering (if enabled)
                    if (!IsRelevantForSubscription(sub, outputAddresses))
                    {
                        // Transaction doesn't involve any of the filtered addresses - skip
                        continue;
                    }

                    bool shouldDispatch = false;
                    string matchReason = "";
                    
                    // Debug: Log subscription details on first transaction of significant blocks
                    if (txIndex == 0 && blockHeight % 500 == 0)
                    {
                        _logger?.LogInformation("Checking subscription '{Name}' (EventType: '{EventType}', TargetAddress: '{Addr}', WalletFilter: {Filter}, Active: {Active})", 
                            sub.Name, sub.EventType, sub.TargetAddress ?? "(none)", sub.WalletAddresses?.Count ?? 0, sub.IsActive);
                    }

                    switch (sub.EventType?.ToLowerInvariant())
                    {
                        case "transaction":
                            // Match by address if specified, otherwise match all transactions
                            if (string.IsNullOrEmpty(sub.TargetAddress))
                            {
                                shouldDispatch = true;
                                matchReason = "All transactions";
                            }
                            else
                            {
                                // Try matching both hex format and bech32 format
                                var targetAddressLower = sub.TargetAddress.ToLowerInvariant();
                                
                                // Check if any output address contains the target (for hex comparison)
                                // or if the target is a bech32 address, we match against hex
                                if (outputAddresses.Contains(targetAddressLower))
                                {
                                    shouldDispatch = true;
                                    matchReason = $"Address match (hex): {sub.TargetAddress}";
                                }
                                // Also check if the target address (possibly bech32) matches any output
                                // For now, if user enters partial hex, try to match
                                else if (outputAddresses.Any(addr => addr.Contains(targetAddressLower) || targetAddressLower.Contains(addr)))
                                {
                                    shouldDispatch = true;
                                    matchReason = $"Address partial match: {sub.TargetAddress}";
                                }
                            }
                            break;

                        case "nft mint":
                        case "nftmint":
                        case "mint":
                            // Check if this transaction mints assets (has mint field)
                            var mint = tx.Mint();
                            if (mint != null && mint.Any())
                            {
                                if (string.IsNullOrEmpty(sub.PolicyId))
                                {
                                    shouldDispatch = true;
                                    matchReason = "Any mint event";
                                }
                                else
                                {
                                    var mintPolicies = mint.Keys.Select(k => Convert.ToHexString(k).ToLowerInvariant());
                                    if (mintPolicies.Contains(sub.PolicyId.ToLowerInvariant()))
                                    {
                                        shouldDispatch = true;
                                        matchReason = $"Policy match: {sub.PolicyId}";
                                    }
                                }
                            }
                            break;

                        case "asset move":
                        case "assetmove":
                        case "transfer":
                            // Match asset transfers by policy ID
                            if (string.IsNullOrEmpty(sub.PolicyId))
                            {
                                if (policyIds.Any())
                                {
                                    shouldDispatch = true;
                                    matchReason = "Any asset transfer";
                                }
                            }
                            else if (policyIds.Contains(sub.PolicyId.ToLowerInvariant()))
                            {
                                shouldDispatch = true;
                                matchReason = $"Policy transfer: {sub.PolicyId}";
                            }
                            break;

                        default:
                            // Unknown event type - skip
                            break;
                    }

                    if (shouldDispatch)
                    {
                        // Build enhanced payload with more details
                        var payload = BuildEnhancedPayload(tx, txIndex, slot, blockHash, blockHeight, 
                            txHash, inputs, outputs, outputAddresses, policyIds, sub.EventType ?? "Unknown", matchReason);
                        
                        // SKIP ENTIRELY if subscription is disabled (rate-limited or circuit-broken)
                        // This is a safety check in case the subscription wasn't filtered properly
                        if (sub.IsRateLimited || sub.IsCircuitBroken || _disabledDuringProcessing.Contains(sub.Id))
                        {
                            _logger?.LogDebug("Skipping disabled subscription {Name} - not recording or dispatching", sub.Name);
                            continue;
                        }
                        
                        // Handle paused (inactive) subscriptions: record the event but don't dispatch
                        if (!sub.IsActive)
                        {
                            _logger?.LogInformation("⏸️ Subscription {Name} is paused - recording event without dispatching", sub.Name);
                            await RecordPausedEvent(sub, payload);
                            continue;
                        }
                        
                        // During catch-up, batch webhooks instead of dispatching immediately
                        if (_isCatchingUp)
                        {
                            // Add to batch
                            if (!_pendingWebhooks.ContainsKey(sub.Id))
                            {
                                _pendingWebhooks[sub.Id] = new List<object>();
                            }
                            
                            _pendingWebhooks[sub.Id].Add(payload);
                            
                            // If batch is full, send the most recent one and clear
                            if (_pendingWebhooks[sub.Id].Count >= BATCH_SIZE_DURING_CATCHUP)
                            {
                                var mostRecentPayload = _pendingWebhooks[sub.Id].Last();
                                _pendingWebhooks[sub.Id].Clear();
                                
                                _logger?.LogInformation("📦 [BATCH] Sending 1 of {Count} webhooks for {Name} (keeping most recent)", 
                                    BATCH_SIZE_DURING_CATCHUP, sub.Name);
                                
                                // Check rate limits before dispatching
                                if (await CheckRateLimitAsync(sub))
                                {
                                    await DispatchWebhook(sub, mostRecentPayload);
                                }
                            }
                        }
                        else
                        {
                            // Real-time mode: dispatch immediately with rate limiting
                            if (!await CheckRateLimitAsync(sub))
                            {
                                _logger?.LogWarning("⚠️ Rate limit exceeded for {Name}, skipping webhook", sub.Name);
                                continue;
                            }
                            
                            _logger?.LogInformation("🔔 Dispatching webhook to {Name} for {EventType}: {Reason}", 
                                sub.Name, sub.EventType, matchReason);
                            
                            await DispatchWebhook(sub, payload);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error processing transaction at slot {Slot}", slot);
            }
        }

        private async Task DispatchWebhook(WebhookSubscription sub, object payload)
        {
            // Skip if subscription is disabled (circuit broken, rate limited, inactive, or disabled during this processing cycle)
            if (sub.IsCircuitBroken || sub.IsRateLimited || !sub.IsActive || _disabledDuringProcessing.Contains(sub.Id))
            {
                _logger?.LogDebug("Skipping webhook dispatch for {Name} - subscription is disabled (CircuitBroken={CB}, RateLimited={RL}, Inactive={Inactive}, DisabledDuringProcessing={DDP})", 
                    sub.Name, sub.IsCircuitBroken, sub.IsRateLimited, !sub.IsActive, _disabledDuringProcessing.Contains(sub.Id));
                return;
            }

            try
            {
                var log = await _dispatcher.DispatchAsync(sub, payload);
                
                // Set status based on response
                if (log.IsSuccess)
                {
                    log.Status = DeliveryStatus.Success;
                    
                    // Reset circuit breaker on success
                    sub.ConsecutiveFailures = 0;
                    sub.FirstFailureInWindowAt = null;
                    sub.LastFailureAt = null;
                }
                else if (log.IsRateLimited)
                {
                    // Schedule retry with Retry-After header or exponential backoff
                    log.Status = DeliveryStatus.Retrying;
                    
                    if (log.RetryAfterSeconds.HasValue)
                    {
                        log.NextRetryAt = DateTime.UtcNow.AddSeconds(log.RetryAfterSeconds.Value);
                        _logger?.LogWarning("Rate limited (429) for {Name}, retrying in {Seconds}s based on Retry-After header", 
                            sub.Name, log.RetryAfterSeconds.Value);
                    }
                    else
                    {
                        log.NextRetryAt = DateTime.UtcNow.AddSeconds(30); // First retry: 30 seconds
                        _logger?.LogWarning("Rate limited (429) for {Name}, retrying in 30s (default)", sub.Name);
                    }
                }
                else
                {
                    // Other failures: schedule for retry with exponential backoff
                    log.Status = DeliveryStatus.Retrying;
                    log.NextRetryAt = DateTime.UtcNow.AddSeconds(30); // First retry in 30 seconds
                    
                    // Track failure for circuit breaker
                    sub.ConsecutiveFailures++;
                    sub.LastFailureAt = DateTime.UtcNow;
                    
                    if (sub.FirstFailureInWindowAt == null)
                    {
                        sub.FirstFailureInWindowAt = DateTime.UtcNow;
                    }
                    
                    // Check if URL has become consistently unresponsive
                    // Status code 0 indicates network/timeout errors (URL unreachable)
                    if (log.ResponseStatusCode == 0)
                    {
                        _logger?.LogWarning("Webhook URL unreachable for {Name}, consecutive failures: {Count}", 
                            sub.Name, sub.ConsecutiveFailures);
                        
                        // Quick circuit breaker: Auto-pause after 5 consecutive network failures
                        if (sub.ConsecutiveFailures >= 5)
                        {
                            sub.IsActive = false;
                            sub.IsCircuitBroken = true;
                            sub.CircuitBrokenReason = $"Webhook URL is unreachable - failed {sub.ConsecutiveFailures} consecutive times with network/timeout errors. Last error: {log.ResponseBody}";
                            _logger?.LogError("⚠️ CIRCUIT BREAKER: Auto-paused subscription {Name} - URL unreachable after {Count} attempts", sub.Name, sub.ConsecutiveFailures);
                        }
                    }
                    else
                    {
                        _logger?.LogWarning("Webhook failed (status {Status}) for {Name}, consecutive failures: {Count}", 
                            log.ResponseStatusCode, sub.Name, sub.ConsecutiveFailures);
                        
                        // Auto-pause after 15 consecutive HTTP error responses
                        if (sub.ConsecutiveFailures >= 15)
                        {
                            sub.IsActive = false;
                            sub.IsCircuitBroken = true;
                            sub.CircuitBrokenReason = $"Webhook has failed {sub.ConsecutiveFailures} consecutive times. Last status: {log.ResponseStatusCode}";
                            _logger?.LogError("⚠️ CIRCUIT BREAKER: Auto-paused subscription {Name} after {Count} consecutive failures", sub.Name, sub.ConsecutiveFailures);
                        }
                    }
                    
                    // Time-based circuit breaker: Auto-pause if failing continuously for 12+ hours
                    if (sub.FirstFailureInWindowAt.HasValue)
                    {
                        var failureDuration = DateTime.UtcNow - sub.FirstFailureInWindowAt.Value;
                        if (failureDuration.TotalHours >= 12)
                        {
                            sub.IsActive = false;
                            sub.IsCircuitBroken = true;
                            sub.CircuitBrokenReason = $"Continuous failures for {failureDuration.TotalHours:F1}+ hours ({sub.ConsecutiveFailures} failures)";
                            _logger?.LogError("⚠️ CIRCUIT BREAKER: Auto-paused subscription {Name} after {Hours:F1} hours of continuous failures", sub.Name, failureDuration.TotalHours);
                        }
                    }
                }
                
                _dbContext.DeliveryLogs.Add(log);
                await _dbContext.SaveChangesAsync();

                _logger?.LogInformation(
                    "Dispatched webhook to {Name} ({Url}) - Status: {StatusCode}, DeliveryStatus: {Status}", 
                    sub.Name, sub.TargetUrl, log.ResponseStatusCode, log.Status);
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error dispatching webhook to {Name}", sub.Name);
            }
        }

        /// <summary>
        /// Record an event for a paused subscription without dispatching.
        /// The event will be dispatched when the subscription is resumed.
        /// </summary>
        private async Task RecordPausedEvent(WebhookSubscription sub, object payload)
        {
            try
            {
                var payloadJson = System.Text.Json.JsonSerializer.Serialize(payload);
                
                var log = new DeliveryLog
                {
                    Id = Guid.NewGuid(),
                    SubscriptionId = sub.Id,
                    PayloadJson = payloadJson,
                    AttemptedAt = DateTime.UtcNow,
                    ResponseStatusCode = 0, // No attempt made
                    ResponseBody = "Subscription paused - delivery pending",
                    LatencyMs = 0,
                    Status = DeliveryStatus.Paused,
                    RetryCount = 0,
                    MaxRetries = 3
                };
                
                _dbContext.DeliveryLogs.Add(log);
                await _dbContext.SaveChangesAsync();
                
                _logger?.LogDebug("Recorded paused event for {Name}, log ID: {LogId}", sub.Name, log.Id);
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error recording paused event for {Name}", sub.Name);
            }
        }

        private async Task UpdateCheckpoint(ulong slot, string blockHash)
        {
            // Update slot
            var slotState = await _dbContext.SystemStates.FirstOrDefaultAsync(s => s.Key == "LastSyncedSlot");
            if (slotState == null)
            {
                slotState = new SystemState { Key = "LastSyncedSlot", Value = slot.ToString() };
                _dbContext.SystemStates.Add(slotState);
            }
            else
            {
                slotState.Value = slot.ToString();
            }

            // Update hash (required for proper resume)
            var hashState = await _dbContext.SystemStates.FirstOrDefaultAsync(s => s.Key == "LastSyncedHash");
            if (hashState == null)
            {
                hashState = new SystemState { Key = "LastSyncedHash", Value = blockHash };
                _dbContext.SystemStates.Add(hashState);
            }
            else
            {
                hashState.Value = blockHash;
            }

            await _dbContext.SaveChangesAsync();
        }

        public async Task RollBackwardAsync(ulong slot)
        {
            _logger?.LogWarning("Rolling back to slot {Slot}", slot);

            var slotState = await _dbContext.SystemStates.FirstOrDefaultAsync(s => s.Key == "LastSyncedSlot");
            if (slotState != null)
            {
                slotState.Value = slot.ToString();
            }

            // Clear the hash on rollback - will be set on next rollforward
            var hashState = await _dbContext.SystemStates.FirstOrDefaultAsync(s => s.Key == "LastSyncedHash");
            if (hashState != null)
            {
                hashState.Value = "";
            }

            await _dbContext.SaveChangesAsync();
        }

        /// <summary>
        /// Check if subscription has exceeded rate limits
        /// </summary>
        /// <summary>
        /// Flush all pending batched webhooks (called when exiting catch-up mode)
        /// </summary>
        private async Task FlushAllBatchesAsync()
        {
            if (_pendingWebhooks.Count == 0)
            {
                return;
            }
            
            _logger?.LogInformation("📤 Flushing {Count} batched webhook queues...", _pendingWebhooks.Count);
            
            foreach (var (subId, payloads) in _pendingWebhooks.ToList())
            {
                if (payloads.Count == 0)
                {
                    continue;
                }
                
                // Get subscription
                var sub = await _dbContext.WebhookSubscriptions.FindAsync(subId);
                if (sub == null || !sub.IsActive)
                {
                    continue;
                }
                
                // Send only the most recent payload from the batch
                var mostRecentPayload = payloads.Last();
                
                _logger?.LogInformation("📤 Flushing {Name}: Sending 1 most recent of {Count} batched webhooks", 
                    sub.Name, payloads.Count);
                
                // Check rate limit and dispatch
                if (await CheckRateLimitAsync(sub))
                {
                    await DispatchWebhook(sub, mostRecentPayload);
                }
                else
                {
                    _logger?.LogWarning("⚠️ Rate limit exceeded for {Name} during batch flush, skipping", sub.Name);
                }
            }
            
            // Clear all batches
            _pendingWebhooks.Clear();
        }
        
        private async Task<bool> CheckRateLimitAsync(WebhookSubscription sub)
        {
            // If rate limits disabled (0), allow all
            if (sub.MaxWebhooksPerMinute == 0 && sub.MaxWebhooksPerHour == 0)
            {
                return true;
            }

            var now = DateTime.UtcNow;
            
            // Initialize tracking for this subscription if needed
            if (!_rateLimitTracking.ContainsKey(sub.Id))
            {
                _rateLimitTracking[sub.Id] = (new Queue<DateTime>(), new Queue<DateTime>());
            }

            var (minuteWindow, hourWindow) = _rateLimitTracking[sub.Id];

            // Clean up old timestamps (older than 1 minute)
            while (minuteWindow.Count > 0 && (now - minuteWindow.Peek()).TotalMinutes > 1)
            {
                minuteWindow.Dequeue();
            }

            // Clean up old timestamps (older than 1 hour)
            while (hourWindow.Count > 0 && (now - hourWindow.Peek()).TotalHours > 1)
            {
                hourWindow.Dequeue();
            }

            // Check limits
            if (sub.MaxWebhooksPerMinute > 0 && minuteWindow.Count >= sub.MaxWebhooksPerMinute)
            {
                sub.IsRateLimited = true;
                _disabledDuringProcessing.Add(sub.Id); // Track locally to skip immediately
                await _dbContext.SaveChangesAsync();
                _logger?.LogWarning("🚫 Rate limit exceeded for {Name}: {Count}/{Max} per minute - subscription disabled", 
                    sub.Name, minuteWindow.Count, sub.MaxWebhooksPerMinute);
                return false;
            }

            if (sub.MaxWebhooksPerHour > 0 && hourWindow.Count >= sub.MaxWebhooksPerHour)
            {
                sub.IsRateLimited = true;
                _disabledDuringProcessing.Add(sub.Id); // Track locally to skip immediately
                await _dbContext.SaveChangesAsync();
                _logger?.LogWarning("🚫 Rate limit exceeded for {Name}: {Count}/{Max} per hour - subscription disabled", 
                    sub.Name, hourWindow.Count, sub.MaxWebhooksPerHour);
                return false;
            }

            // Record this webhook
            minuteWindow.Enqueue(now);
            hourWindow.Enqueue(now);

            return await Task.FromResult(true);
        }

        /// <summary>
        /// Convert hex address to Bech32 format (addr1...)
        /// </summary>
        private string ConvertToBech32Address(string hexAddress, string network = "preprod")
        {
            if (string.IsNullOrEmpty(hexAddress))
                return hexAddress;

            try
            {
                var bytes = Convert.FromHexString(hexAddress);
                if (bytes.Length == 0)
                    return hexAddress;

                // Determine prefix from header byte (first byte indicates network)
                var header = bytes[0];
                var isTestnet = (header & 0xF0) != 0x00;
                var prefix = isTestnet ? "addr_test" : "addr";

                // Encode to Bech32
                var encoded = Bech32Encode(prefix, bytes);
                return encoded;
            }
            catch
            {
                // Fallback to hex if Bech32 encoding fails
                return hexAddress;
            }
        }

        /// <summary>
        /// Bech32 encoding implementation for Cardano addresses
        /// </summary>
        private string Bech32Encode(string hrp, byte[] data)
        {
            const string charset = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
            
            // Convert 8-bit data to 5-bit groups
            var converted = ConvertBits(data, 8, 5, true);
            if (converted == null)
                return string.Empty;
            
            // Create checksum
            var values = new List<byte>();
            values.AddRange(ExpandHrp(hrp));
            values.AddRange(converted);
            values.AddRange(new byte[] { 0, 0, 0, 0, 0, 0 });
            
            var polymod = Bech32Polymod(values);
            var checksum = new byte[6];
            for (int i = 0; i < 6; i++)
            {
                checksum[i] = (byte)((polymod >> (5 * (5 - i))) & 31);
            }
            
            // Combine everything
            var combined = new List<byte>(converted);
            combined.AddRange(checksum);
            
            var result = hrp + "1";
            foreach (var value in combined)
            {
                result += charset[value];
            }
            
            return result;
        }

        private byte[]? ConvertBits(byte[] data, int fromBits, int toBits, bool pad)
        {
            var acc = 0;
            var bits = 0;
            var result = new List<byte>();
            var maxv = (1 << toBits) - 1;

            foreach (var value in data)
            {
                acc = (acc << fromBits) | value;
                bits += fromBits;
                while (bits >= toBits)
                {
                    bits -= toBits;
                    result.Add((byte)((acc >> bits) & maxv));
                }
            }

            if (pad && bits > 0)
            {
                result.Add((byte)((acc << (toBits - bits)) & maxv));
            }
            else if (bits >= fromBits || ((acc << (toBits - bits)) & maxv) != 0)
            {
                return null;
            }

            return result.ToArray();
        }

        private byte[] ExpandHrp(string hrp)
        {
            var result = new List<byte>();
            foreach (var c in hrp)
            {
                result.Add((byte)(c >> 5));
            }
            result.Add(0);
            foreach (var c in hrp)
            {
                result.Add((byte)(c & 31));
            }
            return result.ToArray();
        }

        private uint Bech32Polymod(List<byte> values)
        {
            uint[] gen = { 0x3b6a57b2u, 0x26508e6du, 0x1ea119fau, 0x3d4233ddu, 0x2a1462b3u };
            uint chk = 1;
            
            foreach (var value in values)
            {
                var top = chk >> 25;
                chk = ((chk & 0x1ffffff) << 5) ^ value;
                for (int i = 0; i < 5; i++)
                {
                    if (((top >> i) & 1) != 0)
                    {
                        chk ^= gen[i];
                    }
                }
            }
            
            return chk ^ 1;
        }

        /// <summary>
        /// Build enhanced webhook payload with comprehensive transaction details
        /// </summary>
        private object BuildEnhancedPayload(
            TransactionBody tx,
            int txIndex,
            ulong slot,
            string blockHash,
            ulong blockHeight,
            string txHash,
            List<TransactionInput> inputs,
            List<TransactionOutput> outputs,
            HashSet<string> outputAddresses,
            HashSet<string> policyIds,
            string eventType,
            string matchReason)
        {
            // Extract input addresses for proper change detection
            var inputAddresses = new HashSet<string>();
            foreach (var input in inputs)
            {
                // Note: We can't get the address directly from TransactionInput
                // We'd need to fetch the previous transaction output
                // For now, we'll use a different heuristic
            }
            
            // Calculate total ADA from outputs and build enhanced output details
            ulong totalOutputLovelace = 0;
            var outputDetails = new List<object>();
            
            foreach (var output in outputs.Take(20))
            {
                var addressBytes = output.Address();
                var addressHex = addressBytes != null && addressBytes.Length > 0 
                    ? Convert.ToHexString(addressBytes).ToLowerInvariant() 
                    : "";

                ulong lovelace = 0;
                var assets = new List<object>();

                var amount = output.Amount();
                
                // DIAGNOSTIC: Log the raw amount type for debugging
                var amountTypeName = amount?.GetType().FullName ?? "null";
                _logger?.LogDebug($"Output amount type: {amountTypeName}");
                
                // Get lovelace amount - handle multiple possible types
                if (amount is LovelaceWithMultiAsset lovelaceWithMultiAsset)
                {
                    lovelace = lovelaceWithMultiAsset.Lovelace();
                    _logger?.LogDebug($"Parsed Lovelace from LovelaceWithMultiAsset: {lovelace} at address {addressHex}");
                    totalOutputLovelace += lovelace;

                    var multiAsset = lovelaceWithMultiAsset.MultiAsset;
                    if (multiAsset?.Value != null)
                    {
                        foreach (var policy in multiAsset.Value.Keys)
                        {
                            var policyHex = Convert.ToHexString(policy).ToLowerInvariant();
                            
                            // Get asset names from the policy
                            if (multiAsset.Value.TryGetValue(policy, out var policyAssets) && policyAssets?.Value != null)
                            {
                                foreach (var assetName in policyAssets.Value.Keys)
                                {
                                    var assetNameHex = Convert.ToHexString(assetName).ToLowerInvariant();
                                    
                                    // Try to decode as UTF-8, but keep hex as source of truth
                                    string? assetNameUtf8 = null;
                                    try
                                    {
                                        var decoded = System.Text.Encoding.UTF8.GetString(assetName);
                                        // Verify it's valid UTF-8 (no control chars or invalid sequences)
                                        if (decoded.All(c => !char.IsControl(c) || char.IsWhiteSpace(c)))
                                            assetNameUtf8 = decoded;
                                    }
                                    catch { /* Invalid UTF-8, keep null */ }
                                    
                                    if (policyAssets.Value.TryGetValue(assetName, out var quantity))
                                    {
                                        assets.Add(new
                                        {
                                            PolicyId = policyHex,
                                            NameHex = assetNameHex,
                                            NameUTF8 = assetNameUtf8,
                                            Quantity = quantity
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
                else if (amount != null)
                {
                    // Handle other amount types (e.g., plain Lovelace, Coin, etc.)
                    var amountType = amount.GetType();
                    _logger?.LogWarning($"Unknown amount type: {amountType.FullName} at address {addressHex}");
                    _logger?.LogWarning($"  Attempting alternate parsing methods...");
                    
                    // Strategy 1: Check for Coin property/method (older Chrysalis versions)
                    {
                        var coinProperty = amountType.GetProperty("Coin");
                        if (coinProperty != null)
                        {
                            var coinValue = coinProperty.GetValue(amount);
                            if (coinValue is ulong coinLovelace)
                            {
                                lovelace = coinLovelace;
                                _logger?.LogWarning($"  ✅ Extracted {lovelace} lovelace from Coin property");
                                totalOutputLovelace += lovelace;
                            }
                        }
                        
                        // Strategy 3: Try to convert to ulong if possible
                        if (lovelace == 0)
                        {
                            try
                            {
                                // Try direct conversion
                                var convertedValue = Convert.ToUInt64(amount);
                                lovelace = convertedValue;
                                _logger?.LogWarning($"  ✅ Converted amount to ulong: {lovelace} lovelace");
                                totalOutputLovelace += lovelace;
                            }
                            catch (Exception ex)
                            {
                                _logger?.LogWarning($"  ❌ Failed to convert amount to ulong: {ex.Message}");
                                
                                // Strategy 4: Use reflection to inspect all properties
                                var properties = amountType.GetProperties();
                                _logger?.LogWarning($"  Available properties on {amountType.Name}:");
                                foreach (var prop in properties)
                                {
                                    try
                                    {
                                        var propValue = prop.GetValue(amount);
                                        _logger?.LogWarning($"    - {prop.Name}: {propValue} (Type: {prop.PropertyType.Name})");
                                    }
                                    catch
                                    {
                                        _logger?.LogWarning($"    - {prop.Name}: <unable to read>");
                                    }
                                }
                            }
                        }
                    }
                }
                else
                {
                    _logger?.LogError($"Amount is null for output at address {addressHex}");
                }

                // CRITICAL DIAGNOSTIC: Check for suspicious 0-value outputs
                // On Cardano, outputs MUST have minimum ADA (usually ~1 ADA)
                // If we see 0, it means our parser failed to read the value correctly
                if (lovelace == 0 && assets.Count == 0)
                {
                    _logger?.LogWarning($"⚠️ SUSPICIOUS ZERO VALUE DETECTED - Parsing may have failed!");
                    _logger?.LogWarning($"  Address: {addressHex} (Bech32: {ConvertToBech32Address(addressHex)})");
                    _logger?.LogWarning($"  Raw Amount Type: {amount?.GetType().FullName ?? "null"}");
                    _logger?.LogWarning($"  Amount is LovelaceWithMultiAsset: {amount is LovelaceWithMultiAsset}");
                    
                    // Try alternate parsing methods
                    if (amount != null)
                    {
                        _logger?.LogWarning($"  Amount ToString: {amount}");
                        _logger?.LogWarning($"  Amount object dump: {System.Text.Json.JsonSerializer.Serialize(amount)}");
                    }
                    
                    _logger?.LogWarning($"  Assets found: {assets.Count}");
                    _logger?.LogWarning($"  OutputIndex in transaction: {outputs.IndexOf(output)}");
                    _logger?.LogWarning($"  Total outputs in tx: {outputs.Count}");
                    _logger?.LogWarning("  ⚠️ This output will be HIDDEN from webhook payload - potential data loss!");
                    
                    continue;
                }
                
                // Additional safety check: Warn if lovelace is suspiciously low but non-zero
                if (lovelace > 0 && lovelace < 1_000_000) // Less than 1 ADA
                {
                    _logger?.LogWarning($"Low ADA output detected: {lovelace} lovelace ({lovelace / 1_000_000.0:F6} ADA) at {addressHex}");
                }

                // Convert hex address to Bech32
                var bech32Address = ConvertToBech32Address(addressHex);

                outputDetails.Add(new
                {
                    Address = bech32Address,
                    AddressHex = addressHex,
                    Amount = new
                    {
                        Lovelace = lovelace,
                        Ada = Math.Round(lovelace / 1_000_000.0, 2)
                    },
                    Assets = assets,
                    // CRITICAL: IsChange = null when input hydration is disabled
                    // Reason: Without knowing input addresses, we CANNOT determine if this is change
                    // Default false would be a lie (implying "this is a payment to recipient")
                    // Default true would be a lie (implying "this is change back to sender")
                    // null = "We don't know - developer must determine from context"
                    // 
                    // For bot developers: Treat null as "potential payment" to be safe
                    // False positive (alerting on change) is better than false negative (missing real payment)
                    IsChange = (bool?)null
                });
            }

            // FIX #3: Calculate TotalReceived per address (OUTPUT ONLY - NOT net balance)
            // WARNING: This is NOT a balance calculation (which requires Input - Output)
            // This shows how much ADA each address RECEIVED in this transaction
            var totalReceivedPerAddress = new Dictionary<string, long>();
            
            // Sum all outputs per address
            foreach (var output in outputDetails)
            {
                var outputAddr = ((dynamic)output).Address.ToString();
                var outputLovelace = (ulong)((dynamic)output).Amount.Lovelace;
                
                if (!string.IsNullOrEmpty(outputAddr))
                {
                    if (!totalReceivedPerAddress.ContainsKey(outputAddr))
                        totalReceivedPerAddress[outputAddr] = 0;
                    totalReceivedPerAddress[outputAddr] += (long)outputLovelace;
                }
            }
            
            // Format as ADA strings (no +/- signs - this is absolute received amount)
            var totalReceivedFormatted = totalReceivedPerAddress
                .Where(b => b.Value != 0)
                .ToDictionary(
                    b => b.Key,
                    b => {
                        var ada = b.Value / 1_000_000.0;
                        return $"{ada:F2} ADA";
                    }
                );

            // Build input list
            // NOTE: Input amounts are NOT hydrated in this version
            // Reason: Requires fetching previous transaction outputs (expensive blockchain queries)
            // Workaround: Use TxHash + OutputIndex to query block explorer APIs if needed
            var inputDetails = inputs.Take(20).Select(input => new
            {
                TxHash = Convert.ToHexString(input.TransactionId()).ToLowerInvariant(),
                OutputIndex = input.Index()
                // Amount: NOT AVAILABLE - requires querying previous tx outputs
            }).ToList();

            var fee = tx.Fee();
            
            return new
            {
                Event = eventType,
                TxHash = txHash,
                
                // Transaction metadata - use this to verify data completeness
                Metadata = new
                {
                    MatchReason = matchReason,
                    InputCount = inputs.Count,
                    OutputCount = outputs.Count,
                    OutputsIncluded = outputDetails.Count,
                    InputsIncluded = inputDetails.Count,
                    InputAmountsHydrated = false, // We don't fetch previous tx data
                    TotalOutputAda = Math.Round(totalOutputLovelace / 1_000_000.0, 2),
                    TruncationNote = inputs.Count > 20 || outputs.Count > 20 
                        ? "Transaction has more than 20 inputs/outputs. Only first 20 shown." 
                        : null,
                    // CRITICAL SANITY CHECK: If OutputCount > OutputsIncluded AND TotalOutputAda is 0
                    // This suggests we filtered outputs due to parsing failures (not just truncation)
                    DataLossWarning = outputs.Count > outputDetails.Count && totalOutputLovelace == 0
                        ? "⚠️ CRITICAL: Outputs were filtered due to 0 ADA values. This may indicate a parsing bug. Check logs for 'SUSPICIOUS ZERO VALUE' warnings."
                        : outputs.Count > outputDetails.Count
                        ? $"Note: {outputs.Count - outputDetails.Count} output(s) filtered (0 ADA values or truncation limit)"
                        : null
                },
                
                // WARNING: TotalReceived is OUTPUT-ONLY. Not a net balance calculation.
                // Since InputAmountsHydrated=false, we cannot calculate true balance (In - Out)
                // TotalReceived shows: "How much ADA this address received in outputs"
                // For self-transfers, this does NOT mean the address "gained" this amount
                TotalReceived = totalReceivedFormatted.Count > 0 ? totalReceivedFormatted : null,
                
                // Grouped fee information
                Fees = new
                {
                    Lovelace = fee,
                    Ada = Math.Round(fee / 1_000_000.0, 2)
                },
                
                // Detailed transaction data
                Inputs = inputDetails,
                Outputs = outputDetails,
                
                // Context information
                Block = new
                {
                    Slot = slot,
                    Hash = blockHash,
                    Height = blockHeight
                },
                
                Timestamp = DateTime.UtcNow.ToString("o")
            };
        }
    }
}
