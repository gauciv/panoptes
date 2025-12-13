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
            // Fetch active, non-deleted subscriptions
            var allSubscriptions = await _dbContext.WebhookSubscriptions
                .Where(s => !s.IsCircuitBroken && !s.IsDeleted) // <--- FIX HERE
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

                // --- STEP 1: PRE-CALCULATE (With Dual-Format Support) ---
                
                ulong totalTxLovelace = 0;
                
                // Dictionary now tracks amounts by address string (could be Hex OR Bech32)
                // We will add entries for BOTH formats to ensure easy matching
                var addressAmounts = new Dictionary<string, ulong>(); 
                
                // Output addresses set for quick lookups
                var outputAddresses = new HashSet<string>();
                var policyIds = new HashSet<string>();

                foreach (var output in outputs)
                {
                    var addressBytes = output.Address();
                    if (addressBytes == null || addressBytes.Length == 0) continue;

                    // 1. Get HEX Format
                    var addressHex = Convert.ToHexString(addressBytes).ToLowerInvariant();
                    
                    // 2. Get BECH32 Format (addr_test1...) using existing helper
                    // Note: We assume "preprod" network here, but helper handles prefix
                    var addressBech32 = ConvertToBech32Address(addressHex).ToLowerInvariant();

                    // Add BOTH to the set so filters match either one
                    outputAddresses.Add(addressHex);
                    outputAddresses.Add(addressBech32);

                    // Calculate Amount
                    ulong outputLovelace = 0;
                    var amount = output.Amount();

                    if (amount is LovelaceWithMultiAsset lma)
                    {
                        outputLovelace = lma.Lovelace();
                        var multiAsset = lma.MultiAsset;
                        if (multiAsset?.Value != null)
                        {
                            foreach (var policy in multiAsset.Value.Keys)
                            {
                                policyIds.Add(Convert.ToHexString(policy).ToLowerInvariant());
                            }
                        }
                    }
                    else if (amount != null)
                    {
                        try { outputLovelace = Convert.ToUInt64(amount); } catch { }
                    }

                    totalTxLovelace += outputLovelace;
                    
                    // Track amount against HEX key
                    if (!addressAmounts.ContainsKey(addressHex)) addressAmounts[addressHex] = 0;
                    addressAmounts[addressHex] += outputLovelace;

                    // Track amount against BECH32 key (Duplicate tracking for easy lookup)
                    if (!addressAmounts.ContainsKey(addressBech32)) addressAmounts[addressBech32] = 0;
                    addressAmounts[addressBech32] += outputLovelace;
                }

                // --- STEP 2: CHECK SUBSCRIPTIONS ---
                foreach (var sub in subscriptions)
                {
                    // Filter 1: Wallet Address Match
                    // Now works because outputAddresses contains both Hex and Bech32
                    if (!IsRelevantForSubscription(sub, outputAddresses)) continue;

                    // Filter 2: Minimum ADA
                    if (sub.MinimumLovelace.HasValue && sub.MinimumLovelace.Value > 0)
                    {
                        ulong relevantAmount = 0;

                        // Case A: User specifically put addresses in the "Wallet Addresses" list (The Chips UI)
                        // We prioritize this over "TargetAddress" (legacy field)
                        if (sub.WalletAddresses != null && sub.WalletAddresses.Any())
                        {
                            // Check amounts received by ANY of the watched addresses
                            foreach (var walletAddr in sub.WalletAddresses)
                            {
                                var walletLower = walletAddr.ToLowerInvariant();
                                if (addressAmounts.TryGetValue(walletLower, out var amt))
                                {
                                    relevantAmount += amt;
                                }
                            }
                        }
                        // Case B: Legacy TargetAddress field (if used)
                        else if (!string.IsNullOrEmpty(sub.TargetAddress))
                        {
                            var targetLower = sub.TargetAddress.ToLowerInvariant();
                            if (addressAmounts.TryGetValue(targetLower, out var amt))
                            {
                                relevantAmount = amt;
                            }
                        }
                        else
                        {
                            // Case C: Firehose (All transactions) -> Check total tx volume
                            relevantAmount = totalTxLovelace;
                        }

                        if (relevantAmount < sub.MinimumLovelace.Value)
                        {
                            continue; // Amount too low
                        }
                    }

                    // ... (Dispatch Logic) ...
                    
                    bool shouldDispatch = false;
                    string matchReason = "";

                    switch (sub.EventType?.ToLowerInvariant())
                    {
                        case "transaction":
                            // If we passed the filters above, we dispatch
                            shouldDispatch = true;
                            matchReason = "Transaction match"; 
                            break;
                            
                        case "nft mint":
                        case "mint":
                            var mint = tx.Mint();
                            if (mint != null && mint.Any()) { shouldDispatch = true; matchReason = "Mint event"; }
                            break;
                            
                        case "asset move":
                        case "assetmove":
                            if (policyIds.Any()) { shouldDispatch = true; matchReason = "Asset transfer"; }
                            break;
                    }

                    if (shouldDispatch)
                    {
                        // FIX: Ensure we never pass "Unknown" if we can avoid it.
                        // If sub.EventType is somehow null, default to "Transaction" as it's the safest assumption.
                        string finalEventType = !string.IsNullOrWhiteSpace(sub.EventType) 
                            ? sub.EventType 
                            : "Transaction";

                        // Build payload using the clean Event Type
                        var payload = BuildEnhancedPayload(tx, txIndex, slot, blockHash, blockHeight, 
                            txHash, inputs, outputs, outputAddresses, policyIds, finalEventType, matchReason);
                        
                        if (sub.IsRateLimited || sub.IsCircuitBroken || _disabledDuringProcessing.Contains(sub.Id)) continue;
                        if (!sub.IsActive) { await RecordPausedEvent(sub, payload); continue; }
                        
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
                                var rl2 = await CheckRateLimitAsync(sub);
                                if (rl2.Allowed)
                                {
                                    await DispatchWebhook(sub, mostRecentPayload);
                                }
                                else
                                {
                                    _logger?.LogWarning("⚠️ Rate limit exceeded for {Name} (catch-up batch), skipping (window={Window}, retry in ~{Retry}s)", sub.Name, rl2.Window, rl2.RetryInSeconds);
                                    await RecordThrottledEvent(sub, mostRecentPayload, rl2);
                                }
                            }
                        }
                        else
                        {
                            // Real-time mode: dispatch immediately with rate limiting
                            var rl = await CheckRateLimitAsync(sub);
                            if (!rl.Allowed)
                            {
                                _logger?.LogWarning("⚠️ Rate limit exceeded for {Name}, skipping webhook (window={Window}, retry in ~{Retry}s)", sub.Name, rl.Window, rl.RetryInSeconds);
                                await RecordThrottledEvent(sub, payload, rl);
                                continue;
                            }
                            
                            _logger?.LogInformation("🔔 Dispatching webhook to {Name} for {EventType}: {Reason}", 
                                sub.Name, sub.EventType, matchReason);
                            
                            await DispatchWebhook(sub, payload);
                        }
                        // Force Real-Time (Catch-up Disabled)
                        var rlCheck = await CheckRateLimitAsync(sub);
                        if (rlCheck.Allowed) await DispatchWebhook(sub, payload);
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
                var rl = await CheckRateLimitAsync(sub);
                if (rl.Allowed)
                {
                    await DispatchWebhook(sub, mostRecentPayload);
                }
                else
                {
                    _logger?.LogWarning("⚠️ Rate limit exceeded for {Name} during batch flush, skipping (window={Window}, retry in ~{Retry}s)", sub.Name, rl.Window, rl.RetryInSeconds);
                    await RecordThrottledEvent(sub, mostRecentPayload, rl);
                }
            }
            
            // Clear all batches
            _pendingWebhooks.Clear();
        }
        
        private record RateLimitCheckResult(bool Allowed, string? Window, int? RetryInSeconds);

        private async Task<RateLimitCheckResult> CheckRateLimitAsync(WebhookSubscription sub)
        {
            // If rate limits disabled (0), allow all
            if (sub.MaxWebhooksPerMinute == 0 && sub.MaxWebhooksPerHour == 0)
            {
                return new RateLimitCheckResult(true, null, null);
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
                var oldest = minuteWindow.Count > 0 ? minuteWindow.Peek() : now;
                var elapsed = (int)Math.Max((now - oldest).TotalSeconds, 0);
                var retryIn = Math.Max(60 - elapsed, 1);
                _logger?.LogWarning("🚫 Rate limit exceeded for {Name}: {Count}/{Max} per minute - subscription disabled (retry in ~{Retry}s)", 
                    sub.Name, minuteWindow.Count, sub.MaxWebhooksPerMinute, retryIn);
                return new RateLimitCheckResult(false, "minute", retryIn);
            }

            if (sub.MaxWebhooksPerHour > 0 && hourWindow.Count >= sub.MaxWebhooksPerHour)
            {
                sub.IsRateLimited = true;
                _disabledDuringProcessing.Add(sub.Id); // Track locally to skip immediately
                await _dbContext.SaveChangesAsync();
                var oldestH = hourWindow.Count > 0 ? hourWindow.Peek() : now;
                var elapsedH = (int)Math.Max((now - oldestH).TotalSeconds, 0);
                var retryInH = Math.Max(3600 - elapsedH, 60);
                _logger?.LogWarning("🚫 Rate limit exceeded for {Name}: {Count}/{Max} per hour - subscription disabled (retry in ~{Retry}s)", 
                    sub.Name, hourWindow.Count, sub.MaxWebhooksPerHour, retryInH);
                return new RateLimitCheckResult(false, "hour", retryInH);
            }

            // Record this webhook
            minuteWindow.Enqueue(now);
            hourWindow.Enqueue(now);

            return await Task.FromResult(new RateLimitCheckResult(true, null, null));
        }

        /// <summary>
        /// Record an internal throttled event with 429 to distinguish from endpoint 429
        /// </summary>
        private async Task RecordThrottledEvent(WebhookSubscription sub, object payload, RateLimitCheckResult rl)
        {
            try
            {
                var payloadJson = System.Text.Json.JsonSerializer.Serialize(payload);
                var reason = rl.Window == "hour" ? "THROTTLED: Internal rate limit exceeded (per-hour)" : "THROTTLED: Internal rate limit exceeded (per-minute)";
                if (rl.RetryInSeconds.HasValue)
                {
                    reason += $". Retry in ~{rl.RetryInSeconds.Value}s";
                }

                var log = new DeliveryLog
                {
                    Id = Guid.NewGuid(),
                    SubscriptionId = sub.Id,
                    PayloadJson = payloadJson,
                    AttemptedAt = DateTime.UtcNow,
                    ResponseStatusCode = 429,
                    ResponseBody = reason,
                    LatencyMs = 0,
                    Status = DeliveryStatus.Retrying,
                    RetryCount = 0,
                    MaxRetries = 3,
                    NextRetryAt = rl.RetryInSeconds.HasValue ? DateTime.UtcNow.AddSeconds(rl.RetryInSeconds.Value) : DateTime.UtcNow.AddSeconds(60),
                    IsRateLimitRetry = false
                };

                _dbContext.DeliveryLogs.Add(log);
                await _dbContext.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error recording throttled event for {Name}", sub.Name);
            }
        }

        /// <summary>
        /// Convert hex address to Bech32 format (addr1...)
        /// </summary>
        private string ConvertToBech32Address(string hexAddress, string network = "preprod")
        {
            if (string.IsNullOrEmpty(hexAddress)) return hexAddress;

            try
            {
                var bytes = Convert.FromHexString(hexAddress);
                if (bytes.Length == 0) return hexAddress;

                // --- FIX STARTS HERE ---
                // Cardano Header Byte: [Type (4 bits) | Network (4 bits)]
                var header = bytes[0];
                var networkId = header & 0x0F; // Extract lower 4 bits
                
                // Network ID 0 = Testnet (Preprod/Preview) -> prefix "addr_test"
                // Network ID 1 = Mainnet -> prefix "addr"
                var prefix = (networkId == 1) ? "addr" : "addr_test";
                // --- FIX ENDS HERE ---

                return Bech32Encode(prefix, bytes);
            }
            catch (Exception ex)
            {
                _logger?.LogWarning("Failed to convert hex to bech32: {Error}", ex.Message);
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
                
                // --- PARSING FIX (Handle Coin Wrapper) ---
                if (amount is LovelaceWithMultiAsset lovelaceWithMultiAsset)
                {
                    lovelace = lovelaceWithMultiAsset.Lovelace();
                    
                    var multiAsset = lovelaceWithMultiAsset.MultiAsset;
                    if (multiAsset?.Value != null)
                    {
                        foreach (var policy in multiAsset.Value.Keys)
                        {
                            var policyHex = Convert.ToHexString(policy).ToLowerInvariant();
                            if (multiAsset.Value.TryGetValue(policy, out var policyAssets) && policyAssets?.Value != null)
                            {
                                foreach (var assetName in policyAssets.Value.Keys)
                                {
                                    var assetNameHex = Convert.ToHexString(assetName).ToLowerInvariant();
                                    string? assetNameUtf8 = null;
                                    try {
                                        var decoded = System.Text.Encoding.UTF8.GetString(assetName);
                                        if (decoded.All(c => !char.IsControl(c) || char.IsWhiteSpace(c)))
                                            assetNameUtf8 = decoded;
                                    } catch {}
                                    
                                    if (policyAssets.Value.TryGetValue(assetName, out var quantity))
                                    {
                                        assets.Add(new {
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
                    // The "Coin" type is likely an object wrapper, not a primitive.
                    // We use 'dynamic' to inspect it at runtime without needing the exact type import.
                    try 
                    { 
                        // 1. Try casting to dynamic to access properties
                        dynamic dynamicAmount = amount;
                        
                        // Check common property names for Coin wrappers
                        try { lovelace = (ulong)dynamicAmount; } // Implicit cast
                        catch {
                            try { lovelace = (ulong)dynamicAmount.Value; } // .Value property
                            catch { 
                                // Fallback: Reflection for "Coin" property (seen in older logs)
                                var prop = amount.GetType().GetProperty("Coin") ?? amount.GetType().GetProperty("Value");
                                if (prop != null) lovelace = Convert.ToUInt64(prop.GetValue(amount));
                            }
                        }
                    } 
                    catch {
                        _logger?.LogWarning("Failed to parse Coin object for {Addr}. Type: {Type}", addressHex, amount.GetType().Name);
                    }
                }
                // --- END FIX ---

                totalOutputLovelace += lovelace;

                // Use the Bech32 converter we fixed earlier
                var bech32Address = ConvertToBech32Address(addressHex);

                outputDetails.Add(new
                {
                    Address = bech32Address,
                    AddressHex = addressHex,
                    Amount = new
                    {
                        Lovelace = lovelace,
                        Ada = Math.Round(lovelace / 1_000_000.0, 6)
                    },
                    Assets = assets,
                    IsChange = (bool?)null
                });
            }

            // Calculate Total Received per address
            var totalReceivedPerAddress = new Dictionary<string, string>(); // Changed to string for formatted ADA
            var tempTotals = new Dictionary<string, double>();

            foreach (var detail in outputDetails)
            {
                var addr = (string)((dynamic)detail).Address;
                var amt = (double)((dynamic)detail).Amount.Ada;
                if (!tempTotals.ContainsKey(addr)) tempTotals[addr] = 0;
                tempTotals[addr] += amt;
            }
            
            // Format the totals
            foreach(var kvp in tempTotals)
            {
                totalReceivedPerAddress[kvp.Key] = $"{kvp.Value:F6} ADA";
            }

            var inputDetails = inputs.Take(20).Select(input => new
            {
                TxHash = Convert.ToHexString(input.TransactionId()).ToLowerInvariant(),
                OutputIndex = input.Index()
            }).ToList();

            var fee = tx.Fee();
            
            return new
            {
                Event = eventType,
                TxHash = txHash,
                Metadata = new
                {
                    MatchReason = matchReason,
                    InputCount = inputs.Count,
                    OutputCount = outputs.Count,
                    OutputsIncluded = outputDetails.Count,
                    TotalOutputAda = Math.Round(totalOutputLovelace / 1_000_000.0, 6),
                    TruncationNote = inputs.Count > 20 || outputs.Count > 20 ? "Truncated to 20 items" : null
                },
                TotalReceived = totalReceivedPerAddress, // Clean dictionary
                Fees = new
                {
                    Lovelace = fee,
                    Ada = Math.Round(fee / 1_000_000.0, 6)
                },
                Inputs = inputDetails,
                Outputs = outputDetails,
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
