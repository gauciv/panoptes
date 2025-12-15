using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection; // Required for ScopeFactory
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
        private readonly IServiceScopeFactory _scopeFactory; // ✅ Changed from IAppDbContext to ScopeFactory
        private readonly IWebhookDispatcher _dispatcher;
        private readonly ILogger<PanoptesReducer>? _logger;
        
        // Memory State (Persists across blocks)
        private readonly Dictionary<Guid, (Queue<DateTime> minuteWindow, Queue<DateTime> hourWindow)> _rateLimitTracking = new();
        private readonly HashSet<Guid> _disabledDuringProcessing = new();
        private DateTime _lastBlockProcessedAt = DateTime.UtcNow;
        private bool _isCatchingUp = false;
        private int _consecutiveFastBlocks = 0;
        private readonly Dictionary<Guid, List<object>> _pendingWebhooks = new();
        private DateTime _lastBatchFlushAt = DateTime.UtcNow;
        private const int BATCH_SIZE_DURING_CATCHUP = 10;
        private const int BATCH_FLUSH_INTERVAL_SECONDS = 5;

        public bool IsCatchingUp => _isCatchingUp;

        // ✅ Constructor updated to accept IServiceScopeFactory
        public PanoptesReducer(IServiceScopeFactory scopeFactory, IWebhookDispatcher dispatcher, ILogger<PanoptesReducer>? logger = null)
        {
            _scopeFactory = scopeFactory;
            _dispatcher = dispatcher;
            _logger = logger;
        }

        private bool IsRelevantForSubscription(WebhookSubscription subscription, HashSet<string> outputAddresses)
        {
            if (subscription.WalletAddresses == null || !subscription.WalletAddresses.Any()) return true;
            
            foreach (var filterAddress in subscription.WalletAddresses)
            {
                var filterLower = filterAddress.ToLowerInvariant();
                if (outputAddresses.Contains(filterLower)) return true;
                if (outputAddresses.Any(addr => addr.Contains(filterLower) || filterLower.Contains(addr))) return true;
            }
            return false;
        }

        public async Task RollForwardAsync(Block block)
        {
            // ✅ Create a FRESH Scope for every block to ensure we see DB updates (Pause/Unpause) immediately
            using var scope = _scopeFactory.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<IAppDbContext>();

            var slot = block.Header().HeaderBody().Slot();
            var blockHash = block.Header().Hash();
            var blockHeight = block.Header().HeaderBody().BlockNumber();
            
            // --- Catch-up Detection ---
            var now = DateTime.UtcNow;
            var timeSinceLastBlock = (now - _lastBlockProcessedAt).TotalSeconds;
            _lastBlockProcessedAt = now;
            
            if (timeSinceLastBlock < 0.5)
            {
                _consecutiveFastBlocks++;
                if (_consecutiveFastBlocks > 10 && !_isCatchingUp)
                {
                    _isCatchingUp = true;
                    _logger?.LogWarning("🚀 CATCH-UP MODE DETECTED - Enabling webhook batching");
                }
            }
            else
            {
                _consecutiveFastBlocks = 0;
                if (_isCatchingUp)
                {
                    _isCatchingUp = false;
                    await FlushAllBatchesAsync(dbContext); // Flush any remaining batched webhooks
                    _logger?.LogInformation("✅ CATCH-UP COMPLETE - Resuming real-time delivery");
                }
            }

            if (blockHeight % 100 == 0)
            {
                var mode = _isCatchingUp ? "[CATCH-UP]" : "[REAL-TIME]";
                _logger?.LogInformation("{Mode} Processing block at slot {Slot}, height {Height}", mode, slot, blockHeight);
            }
            
            _disabledDuringProcessing.Clear();

            // ✅ FETCH FRESH DATA: Get ALL non-deleted subscriptions (Active AND Paused)
            var allSubscriptions = await dbContext.WebhookSubscriptions
                .AsNoTracking() // Read-only for speed, we attach explicitly if we need to update
                .Where(s => !s.IsDeleted) 
                .ToListAsync();
            
            // Log counts periodically
            if (blockHeight % 100 == 0 && allSubscriptions.Any())
            {
                var activeCount = allSubscriptions.Count(s => s.IsActive);
                _logger?.LogInformation("Found {Count} subscriptions ({Active} active, {Paused} paused)", allSubscriptions.Count, activeCount, allSubscriptions.Count - activeCount);
            }

            if (allSubscriptions.Any())
            {
                var txs = block.TransactionBodies();
                if (txs != null && txs.Any())
                {
                    if (blockHeight % 100 == 0) _logger?.LogInformation("Block {Height} has {TxCount} transactions", blockHeight, txs.Count());
                    
                    var txIndex = 0;
                    foreach (var tx in txs)
                    {
                        // Pass the fresh dbContext down
                        await ProcessTransaction(dbContext, tx, txIndex, slot, blockHash, blockHeight, allSubscriptions);
                        txIndex++;
                    }
                }
            }
            
            if (_isCatchingUp && (now - _lastBatchFlushAt).TotalSeconds >= BATCH_FLUSH_INTERVAL_SECONDS)
            {
                await FlushAllBatchesAsync(dbContext);
                _lastBatchFlushAt = now;
            }

            await UpdateCheckpoint(dbContext, slot, blockHash);
        }

        private async Task ProcessTransaction(
            IAppDbContext dbContext, // ✅ Injected
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

                // --- PRE-CALCULATE ---
                ulong totalTxLovelace = 0;
                var addressAmounts = new Dictionary<string, ulong>(); 
                var outputAddresses = new HashSet<string>();
                var policyIds = new HashSet<string>();

                foreach (var output in outputs)
                {
                    var addressBytes = output.Address();
                    if (addressBytes == null || addressBytes.Length == 0) continue;

                    var addressHex = Convert.ToHexString(addressBytes).ToLowerInvariant();
                    var addressBech32 = ConvertToBech32Address(addressHex).ToLowerInvariant();

                    outputAddresses.Add(addressHex);
                    outputAddresses.Add(addressBech32);

                    ulong outputLovelace = 0;
                    var amount = output.Amount();

                    if (amount is LovelaceWithMultiAsset lma)
                    {
                        outputLovelace = lma.Lovelace();
                        var multiAsset = lma.MultiAsset;
                        if (multiAsset?.Value != null)
                        {
                            foreach (var policy in multiAsset.Value.Keys)
                                policyIds.Add(Convert.ToHexString(policy).ToLowerInvariant());
                        }
                    }
                    else if (amount != null)
                    {
                        try { outputLovelace = Convert.ToUInt64(amount); } catch { }
                    }

                    totalTxLovelace += outputLovelace;
                    if (!addressAmounts.ContainsKey(addressHex)) addressAmounts[addressHex] = 0;
                    addressAmounts[addressHex] += outputLovelace;
                    if (!addressAmounts.ContainsKey(addressBech32)) addressAmounts[addressBech32] = 0;
                    addressAmounts[addressBech32] += outputLovelace;
                }

                // --- CHECK SUBSCRIPTIONS ---
                foreach (var sub in subscriptions)
                {
                    // 1. SCOPE CHECK: Does this transaction involve the watched addresses/policies?
                    if (!IsRelevantForSubscription(sub, outputAddresses)) continue;

                    // 2. MIN VALUE CHECK: Does the value meet the threshold?
                    if (sub.MinimumLovelace.HasValue && sub.MinimumLovelace.Value > 0)
                    {
                        ulong valueToCheck = 0;

                        // Case A: User is watching specific wallets -> Check sum received by those wallets
                        if (sub.WalletAddresses != null && sub.WalletAddresses.Any())
                        {
                            foreach (var walletAddr in sub.WalletAddresses)
                            {
                                var walletLower = walletAddr.ToLowerInvariant();
                                
                                // Check Hex Address
                                if (addressAmounts.TryGetValue(walletLower, out var amtHex)) valueToCheck += amtHex;
                                
                                // Check Bech32 Address (if user added Bech32 to filter)
                                // Note: ConvertToBech32Address logic handles normalization
                            }
                        }
                        // Case B: Legacy TargetAddress
                        else if (!string.IsNullOrEmpty(sub.TargetAddress))
                        {
                            var targetLower = sub.TargetAddress.ToLowerInvariant();
                            if (addressAmounts.TryGetValue(targetLower, out var amt)) valueToCheck = amt;
                        }
                        // Case C: Firehose (No filters) -> Check TOTAL transaction volume
                        else 
                        {
                            // Logic: If I want to see "Whale Moves" > 1M ADA, I care about the total volume moved.
                            valueToCheck = totalTxLovelace;
                        }

                        // THE FILTER:
                        if (valueToCheck < sub.MinimumLovelace.Value) continue;
                    }

                    // 3. EVENT TYPE CHECK
                    bool shouldDispatch = false;
                    string matchReason = "";

                    switch (sub.EventType?.ToLowerInvariant())
                    {
                        case "transaction": 
                            shouldDispatch = true; 
                            matchReason = "Transaction match"; 
                            break;
                            
                        case "nft mint":
                        case "mint": 
                            if (tx.Mint() != null && tx.Mint().Any()) 
                            { 
                                shouldDispatch = true; 
                                matchReason = "Mint event"; 
                            } 
                            break;
                            
                        case "asset move":
                        case "assetmove": 
                            // Only trigger if a Policy ID matches (if specified) or ANY policy is present
                            if (policyIds.Any()) 
                            { 
                                shouldDispatch = true; 
                                matchReason = "Asset transfer"; 
                            } 
                            break;
                    }

                    if (shouldDispatch)
                    {
                        string finalEventType = !string.IsNullOrWhiteSpace(sub.EventType) ? sub.EventType : "Transaction";

                        var payload = BuildEnhancedPayload(tx, txIndex, slot, blockHash, blockHeight, 
                            txHash, inputs, outputs, outputAddresses, policyIds, finalEventType, matchReason);
                        
                        // Check Disabled state
                        if (sub.IsRateLimited || _disabledDuringProcessing.Contains(sub.Id)) continue;
                        
                        // ✅ Handle PAUSED State: Record log, but do NOT dispatch
                        if (!sub.IsActive)
                        {
                            await RecordPausedEvent(dbContext, sub, payload);
                            continue;
                        }
                        
                        // Rate Limit & Dispatch
                        var rl = await CheckRateLimitAsync(dbContext, sub); // Pass dbContext
                        if (!rl.Allowed)
                        {
                            await RecordThrottledEvent(dbContext, sub, payload, rl);
                            continue;
                        }

                        if (_isCatchingUp)
                        {
                            if (!_pendingWebhooks.ContainsKey(sub.Id)) _pendingWebhooks[sub.Id] = new List<object>();
                            _pendingWebhooks[sub.Id].Add(payload);
                            
                            if (_pendingWebhooks[sub.Id].Count >= BATCH_SIZE_DURING_CATCHUP)
                            {
                                var mostRecent = _pendingWebhooks[sub.Id].Last();
                                _pendingWebhooks[sub.Id].Clear();
                                // Re-check limit for the batch
                                var rlBatch = await CheckRateLimitAsync(dbContext, sub);
                                if(rlBatch.Allowed) await DispatchWebhook(dbContext, sub, mostRecent);
                            }
                        }
                        else
                        {
                            await DispatchWebhook(dbContext, sub, payload);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error processing transaction at slot {Slot}", slot);
            }
        }

        private async Task DispatchWebhook(IAppDbContext dbContext, WebhookSubscription sub, object payload)
        {
            if (sub.IsRateLimited || !sub.IsActive || _disabledDuringProcessing.Contains(sub.Id)) return;

            try
            {
                var log = await _dispatcher.DispatchAsync(sub, payload);
                
                if (log.IsSuccess)
                {
                    log.Status = DeliveryStatus.Success;
                }
                else if (log.IsRateLimited)
                {
                    log.Status = DeliveryStatus.Retrying;
                    log.NextRetryAt = log.RetryAfterSeconds.HasValue 
                        ? DateTime.UtcNow.AddSeconds(log.RetryAfterSeconds.Value)
                        : DateTime.UtcNow.AddSeconds(30);
                }
                else
                {
                    log.Status = DeliveryStatus.Retrying;
                    log.NextRetryAt = DateTime.UtcNow.AddSeconds(30);
                    
                    if (log.ResponseStatusCode == 0)
                        _logger?.LogWarning("Webhook URL unreachable for {Name}", sub.Name);
                    else
                        _logger?.LogWarning("Webhook failed (status {Status}) for {Name}", log.ResponseStatusCode, sub.Name);
                }
                
                dbContext.DeliveryLogs.Add(log);
                await dbContext.SaveChangesAsync();

                _logger?.LogInformation("Dispatched webhook to {Name} ({Url}) - Status: {StatusCode}", sub.Name, sub.TargetUrl, log.ResponseStatusCode);
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error dispatching webhook to {Name}", sub.Name);
            }
        }

        private async Task RecordPausedEvent(IAppDbContext dbContext, WebhookSubscription sub, object payload)
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
                    ResponseStatusCode = 0, 
                    ResponseBody = "Subscription paused - delivery pending",
                    LatencyMs = 0,
                    Status = DeliveryStatus.Paused,
                    RetryCount = 0
                };
                
                dbContext.DeliveryLogs.Add(log);
                await dbContext.SaveChangesAsync();
                
                _logger?.LogDebug("Recorded paused event for {Name}", sub.Name);
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error recording paused event for {Name}", sub.Name);
            }
        }

        private async Task UpdateCheckpoint(IAppDbContext dbContext, ulong slot, string blockHash)
        {
            var slotState = await dbContext.SystemStates.FirstOrDefaultAsync(s => s.Key == "LastSyncedSlot");
            if (slotState == null)
            {
                slotState = new SystemState { Key = "LastSyncedSlot", Value = slot.ToString() };
                dbContext.SystemStates.Add(slotState);
            }
            else slotState.Value = slot.ToString();

            var hashState = await dbContext.SystemStates.FirstOrDefaultAsync(s => s.Key == "LastSyncedHash");
            if (hashState == null)
            {
                hashState = new SystemState { Key = "LastSyncedHash", Value = blockHash };
                dbContext.SystemStates.Add(hashState);
            }
            else hashState.Value = blockHash;

            await dbContext.SaveChangesAsync();
        }

        // Needs to implement interface, but RollBackward usually doesn't need fresh data logic
        public async Task RollBackwardAsync(ulong slot)
        {
            _logger?.LogWarning("Rolling back to slot {Slot}", slot);
            using var scope = _scopeFactory.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<IAppDbContext>();

            var slotState = await dbContext.SystemStates.FirstOrDefaultAsync(s => s.Key == "LastSyncedSlot");
            if (slotState != null) slotState.Value = slot.ToString();

            var hashState = await dbContext.SystemStates.FirstOrDefaultAsync(s => s.Key == "LastSyncedHash");
            if (hashState != null) hashState.Value = "";

            await dbContext.SaveChangesAsync();
        }

        private async Task FlushAllBatchesAsync(IAppDbContext dbContext)
        {
            if (_pendingWebhooks.Count == 0) return;
            
            foreach (var (subId, payloads) in _pendingWebhooks.ToList())
            {
                if (payloads.Count == 0) continue;
                
                var sub = await dbContext.WebhookSubscriptions.FindAsync(subId);
                if (sub == null || !sub.IsActive) continue;
                
                var mostRecentPayload = payloads.Last();
                
                var rl = await CheckRateLimitAsync(dbContext, sub);
                if (rl.Allowed) await DispatchWebhook(dbContext, sub, mostRecentPayload);
                else await RecordThrottledEvent(dbContext, sub, mostRecentPayload, rl);
            }
            _pendingWebhooks.Clear();
        }
        
        private record RateLimitCheckResult(bool Allowed, string? Window, int? RetryInSeconds);

        private async Task<RateLimitCheckResult> CheckRateLimitAsync(IAppDbContext dbContext, WebhookSubscription sub)
        {
            if (sub.MaxWebhooksPerMinute == 0 && sub.MaxWebhooksPerHour == 0) return new RateLimitCheckResult(true, null, null);

            var now = DateTime.UtcNow;
            if (!_rateLimitTracking.ContainsKey(sub.Id)) _rateLimitTracking[sub.Id] = (new Queue<DateTime>(), new Queue<DateTime>());

            var (minuteWindow, hourWindow) = _rateLimitTracking[sub.Id];

            while (minuteWindow.Count > 0 && (now - minuteWindow.Peek()).TotalMinutes > 1) minuteWindow.Dequeue();
            while (hourWindow.Count > 0 && (now - hourWindow.Peek()).TotalHours > 1) hourWindow.Dequeue();

            if (sub.MaxWebhooksPerMinute > 0 && minuteWindow.Count >= sub.MaxWebhooksPerMinute)
            {
                // We need to update DB that we are rate limited
                // Since 'sub' is NoTracking, we attach it
                dbContext.WebhookSubscriptions.Attach(sub);
                sub.IsRateLimited = true;
                await dbContext.SaveChangesAsync();
                
                _disabledDuringProcessing.Add(sub.Id);
                int retryIn = 60 - (int)(now - (minuteWindow.Count > 0 ? minuteWindow.Peek() : now)).TotalSeconds;
                return new RateLimitCheckResult(false, "minute", Math.Max(retryIn, 1));
            }

            if (sub.MaxWebhooksPerHour > 0 && hourWindow.Count >= sub.MaxWebhooksPerHour)
            {
                dbContext.WebhookSubscriptions.Attach(sub);
                sub.IsRateLimited = true;
                await dbContext.SaveChangesAsync();

                _disabledDuringProcessing.Add(sub.Id);
                int retryIn = 3600 - (int)(now - (hourWindow.Count > 0 ? hourWindow.Peek() : now)).TotalSeconds;
                return new RateLimitCheckResult(false, "hour", Math.Max(retryIn, 60));
            }

            minuteWindow.Enqueue(now);
            hourWindow.Enqueue(now);
            return new RateLimitCheckResult(true, null, null);
        }

        private async Task RecordThrottledEvent(IAppDbContext dbContext, WebhookSubscription sub, object payload, RateLimitCheckResult rl)
        {
            try
            {
                var payloadJson = System.Text.Json.JsonSerializer.Serialize(payload);
                var reason = rl.Window == "hour" ? "THROTTLED: Hourly limit" : "THROTTLED: Minute limit";
                
                var log = new DeliveryLog
                {
                    Id = Guid.NewGuid(),
                    SubscriptionId = sub.Id,
                    PayloadJson = payloadJson,
                    AttemptedAt = DateTime.UtcNow,
                    ResponseStatusCode = 429,
                    ResponseBody = reason,
                    Status = DeliveryStatus.Retrying,
                    NextRetryAt = DateTime.UtcNow.AddSeconds(rl.RetryInSeconds ?? 60)
                };

                dbContext.DeliveryLogs.Add(log);
                await dbContext.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error recording throttled event");
            }
        }

        // --- Helpers ---
        private string ConvertToBech32Address(string hexAddress)
        {
            if (string.IsNullOrEmpty(hexAddress)) return hexAddress;
            try
            {
                var bytes = Convert.FromHexString(hexAddress);
                if (bytes.Length == 0) return hexAddress;
                var networkId = bytes[0] & 0x0F;
                var prefix = (networkId == 1) ? "addr" : "addr_test";
                return Bech32Encode(prefix, bytes);
            }
            catch { return hexAddress; }
        }

        private string Bech32Encode(string hrp, byte[] data)
        {
            const string charset = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
            var converted = ConvertBits(data, 8, 5, true);
            if (converted == null) return string.Empty;
            
            var values = new List<byte>();
            values.AddRange(ExpandHrp(hrp));
            values.AddRange(converted);
            values.AddRange(new byte[] { 0, 0, 0, 0, 0, 0 });
            
            var polymod = Bech32Polymod(values);
            var checksum = new byte[6];
            for (int i = 0; i < 6; i++) checksum[i] = (byte)((polymod >> (5 * (5 - i))) & 31);
            
            var combined = new List<byte>(converted);
            combined.AddRange(checksum);
            var result = hrp + "1";
            foreach (var value in combined) result += charset[value];
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
                while (bits >= toBits) { bits -= toBits; result.Add((byte)((acc >> bits) & maxv)); }
            }
            if (pad && bits > 0) result.Add((byte)((acc << (toBits - bits)) & maxv));
            else if (bits >= fromBits || ((acc << (toBits - bits)) & maxv) != 0) return null;
            return result.ToArray();
        }

        private byte[] ExpandHrp(string hrp)
        {
            var result = new List<byte>();
            foreach (var c in hrp) result.Add((byte)(c >> 5));
            result.Add(0);
            foreach (var c in hrp) result.Add((byte)(c & 31));
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
                for (int i = 0; i < 5; i++) if (((top >> i) & 1) != 0) chk ^= gen[i];
            }
            return chk ^ 1;
        }

        private object BuildEnhancedPayload(TransactionBody tx, int txIndex, ulong slot, string blockHash, ulong blockHeight, 
            string txHash, List<TransactionInput> inputs, List<TransactionOutput> outputs, HashSet<string> outputAddresses, 
            HashSet<string> policyIds, string eventType, string matchReason)
        {
            // (Keeping your exact previous payload logic here)
            ulong totalOutputLovelace = 0;
            var outputDetails = new List<object>();
            
            foreach (var output in outputs.Take(20)) 
            {
                var addressHex = output.Address() != null ? Convert.ToHexString(output.Address()).ToLowerInvariant() : "";
                ulong lovelace = 0;
                var assets = new List<object>();
                var amount = output.Amount();

                if (amount is LovelaceWithMultiAsset lma)
                {
                    lovelace = lma.Lovelace();
                    if (lma.MultiAsset?.Value != null)
                    {
                        foreach (var policy in lma.MultiAsset.Value.Keys)
                        {
                            var policyHex = Convert.ToHexString(policy).ToLowerInvariant();
                            if (lma.MultiAsset.Value.TryGetValue(policy, out var pAssets) && pAssets?.Value != null)
                            {
                                foreach (var an in pAssets.Value.Keys)
                                {
                                    string? nameUtf8 = null;
                                    try { var d = System.Text.Encoding.UTF8.GetString(an); if(d.All(c=>!char.IsControl(c)||char.IsWhiteSpace(c))) nameUtf8=d; } catch{}
                                    if (pAssets.Value.TryGetValue(an, out var qty))
                                        assets.Add(new { PolicyId = policyHex, NameHex = Convert.ToHexString(an).ToLowerInvariant(), NameUTF8 = nameUtf8, Quantity = qty });
                                }
                            }
                        }
                    }
                }
                else if (amount != null)
                {
                    try { dynamic d = amount; try { lovelace = (ulong)d; } catch { try { lovelace = (ulong)d.Value; } catch { 
                        var p = amount.GetType().GetProperty("Coin") ?? amount.GetType().GetProperty("Value");
                        if(p!=null) lovelace = Convert.ToUInt64(p.GetValue(amount)); } } } catch { }
                }

                totalOutputLovelace += lovelace;
                outputDetails.Add(new {
                    Address = ConvertToBech32Address(addressHex),
                    AddressHex = addressHex,
                    Amount = new { Lovelace = lovelace, Ada = Math.Round(lovelace / 1_000_000.0, 6) },
                    Assets = assets,
                    IsChange = (bool?)null
                });
            }

            var totalReceived = new Dictionary<string, string>();
            var temp = new Dictionary<string, double>();
            foreach(dynamic o in outputDetails) { 
                string a = o.Address; double v = o.Amount.Ada;
                if(!temp.ContainsKey(a)) temp[a]=0; temp[a]+=v; 
            }
            foreach(var k in temp) totalReceived[k.Key] = $"{k.Value:F6} ADA";

            return new {
                Event = eventType,
                TxHash = txHash,
                Metadata = new { MatchReason = matchReason, InputCount = inputs.Count, OutputCount = outputs.Count, TotalOutputAda = Math.Round(totalOutputLovelace/1_000_000.0, 6) },
                TotalReceived = totalReceived,
                Fees = new { Lovelace = tx.Fee(), Ada = Math.Round(tx.Fee()/1_000_000.0, 6) },
                Inputs = inputs.Take(20).Select(i => new { TxHash = Convert.ToHexString(i.TransactionId()).ToLowerInvariant(), OutputIndex = i.Index() }),
                Outputs = outputDetails,
                Block = new { Slot = slot, Hash = blockHash, Height = blockHeight },
                Timestamp = DateTime.UtcNow.ToString("o")
            };
        }
    }
}