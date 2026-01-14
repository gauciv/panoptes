using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using System.Text.Json;
using Panoptes.Core.Entities;
using Panoptes.Core.Interfaces;
using Panoptes.Infrastructure.Utilities;
using Argus.Sync.Reducers;
using Argus.Sync.Data.Models;
using Chrysalis.Cbor.Types.Cardano.Core;
using Chrysalis.Cbor.Types.Cardano.Core.Transaction;
using Chrysalis.Cbor.Types.Cardano.Core.Common;
using Chrysalis.Cbor.Extensions.Cardano.Core;
using Chrysalis.Cbor.Extensions.Cardano.Core.Header;
using Chrysalis.Cbor.Extensions.Cardano.Core.Transaction;
using Chrysalis.Cbor.Extensions.Cardano.Core.Common;

namespace Panoptes.Infrastructure.Services
{
    public record PanoptesModel : IReducerModel;

    public class PanoptesReducer : IReducer<PanoptesModel>
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly IWebhookDispatcher _dispatcher;
        private readonly ILogger<PanoptesReducer>? _logger;
        private readonly RateLimiter _rateLimiter = new();

        private DateTime _lastBlockProcessedAt = DateTime.UtcNow;
        private bool _isCatchingUp = false;
        private int _consecutiveFastBlocks = 0;
        private readonly Dictionary<Guid, List<object>> _pendingWebhooks = new();
        private DateTime _lastBatchFlushAt = DateTime.UtcNow;

        private const int BatchSizeDuringCatchup = 10;
        private const int BatchFlushIntervalSeconds = 5;

        public bool IsCatchingUp => _isCatchingUp;

        public PanoptesReducer(
            IServiceScopeFactory scopeFactory,
            IWebhookDispatcher dispatcher,
            ILogger<PanoptesReducer>? logger = null)
        {
            _scopeFactory = scopeFactory;
            _dispatcher = dispatcher;
            _logger = logger;
        }

        public async Task RollForwardAsync(Block block)
        {
            using var scope = _scopeFactory.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<IAppDbContext>();

            var slot = block.Header().HeaderBody().Slot();
            var blockHash = block.Header().Hash();
            var blockHeight = block.Header().HeaderBody().BlockNumber();

            UpdateCatchUpState();
            _rateLimiter.ClearDisabled();

            var allSubscriptions = await dbContext.WebhookSubscriptions
                .AsNoTracking()
                .Where(s => !s.IsDeleted)
                .ToListAsync();

            if (blockHeight % 100 == 0)
            {
                var mode = _isCatchingUp ? "[CATCH-UP]" : "[REAL-TIME]";
                _logger?.LogInformation("{Mode} Block {Slot}, height {Height}", mode, slot, blockHeight);
                _rateLimiter.CleanupStaleEntries(allSubscriptions.Select(s => s.Id));
            }

            if (allSubscriptions.Any())
            {
                var txs = block.TransactionBodies();
                if (txs != null && txs.Any())
                {
                    var txIndex = 0;
                    foreach (var tx in txs)
                    {
                        await ProcessTransaction(dbContext, tx, txIndex, slot, blockHash, blockHeight, allSubscriptions);
                        txIndex++;
                    }
                }
            }

            if (_isCatchingUp && (DateTime.UtcNow - _lastBatchFlushAt).TotalSeconds >= BatchFlushIntervalSeconds)
            {
                await FlushAllBatchesAsync(dbContext);
                _lastBatchFlushAt = DateTime.UtcNow;
            }

            await UpdateCheckpoint(dbContext, slot, blockHash);
        }

        public async Task RollBackwardAsync(ulong slot)
        {
            _logger?.LogWarning("Rolling back to slot {Slot}", slot);
            using var scope = _scopeFactory.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<IAppDbContext>();

            var slotState = await dbContext.SystemStates.FirstOrDefaultAsync(s => s.Key == "LastSyncedSlot");
            if (slotState != null)
                slotState.Value = slot.ToString();

            var hashState = await dbContext.SystemStates.FirstOrDefaultAsync(s => s.Key == "LastSyncedHash");
            if (hashState != null)
                hashState.Value = "";

            await dbContext.SaveChangesAsync();
        }

        private void UpdateCatchUpState()
        {
            var now = DateTime.UtcNow;
            var timeSinceLastBlock = (now - _lastBlockProcessedAt).TotalSeconds;
            _lastBlockProcessedAt = now;

            if (timeSinceLastBlock < 0.5)
            {
                _consecutiveFastBlocks++;
                if (_consecutiveFastBlocks > 10 && !_isCatchingUp)
                {
                    _isCatchingUp = true;
                    _logger?.LogWarning("Catch-up mode enabled");
                }
            }
            else
            {
                _consecutiveFastBlocks = 0;
                if (_isCatchingUp)
                {
                    _isCatchingUp = false;
                    _logger?.LogInformation("Catch-up complete, resuming real-time delivery");
                }
            }
        }

        private async Task ProcessTransaction(
            IAppDbContext dbContext,
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

                var (outputAddresses, policyIds, addressAmounts, totalTxLovelace) = ParseOutputs(outputs);

                foreach (var sub in subscriptions)
                {
                    if (!IsRelevantForSubscription(sub, outputAddresses))
                        continue;

                    if (!MeetsMinimumValue(sub, addressAmounts, totalTxLovelace))
                        continue;

                    var (shouldDispatch, matchReason) = CheckEventType(sub, tx, policyIds);
                    if (!shouldDispatch)
                        continue;

                    if (sub.IsRateLimited || _rateLimiter.IsDisabled(sub.Id))
                        continue;

                    if (!sub.IsActive)
                    {
                        await RecordPausedEvent(dbContext, sub, txHash);
                        continue;
                    }

                    var rl = _rateLimiter.Check(sub.Id, sub.MaxWebhooksPerMinute, sub.MaxWebhooksPerHour);
                    if (!rl.Allowed)
                    {
                        sub.IsRateLimited = true;
                        await RecordThrottledEvent(dbContext, sub, txHash, rl);
                        continue;
                    }

                    var payload = BuildPayload(tx, txIndex, slot, blockHash, blockHeight, txHash,
                        inputs, outputs, sub.EventType ?? "Transaction", matchReason);

                    if (_isCatchingUp)
                        await HandleCatchUpDispatch(dbContext, sub, payload);
                    else
                        await DispatchWebhook(dbContext, sub, payload);
                }
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error processing transaction at slot {Slot}", slot);
            }
        }

        private (HashSet<string> addresses, HashSet<string> policies, Dictionary<string, ulong> amounts, ulong total) ParseOutputs(List<TransactionOutput> outputs)
        {
            var outputAddresses = new HashSet<string>();
            var policyIds = new HashSet<string>();
            var addressAmounts = new Dictionary<string, ulong>();
            ulong totalLovelace = 0;

            foreach (var output in outputs)
            {
                var addressBytes = output.Address();
                if (addressBytes == null || addressBytes.Length == 0)
                    continue;

                var addressHex = Convert.ToHexString(addressBytes).ToLowerInvariant();
                var addressBech32 = Bech32Encoder.ConvertToBech32Address(addressHex).ToLowerInvariant();

                outputAddresses.Add(addressHex);
                outputAddresses.Add(addressBech32);

                ulong outputLovelace = 0;
                var amount = output.Amount();

                if (amount is LovelaceWithMultiAsset lma)
                {
                    outputLovelace = lma.Lovelace();
                    if (lma.MultiAsset?.Value != null)
                    {
                        foreach (var policy in lma.MultiAsset.Value.Keys)
                            policyIds.Add(Convert.ToHexString(policy).ToLowerInvariant());
                    }
                }
                else if (amount != null)
                {
                    try { outputLovelace = Convert.ToUInt64(amount); } catch { }
                }

                totalLovelace += outputLovelace;

                if (!addressAmounts.ContainsKey(addressHex))
                    addressAmounts[addressHex] = 0;
                addressAmounts[addressHex] += outputLovelace;

                if (!addressAmounts.ContainsKey(addressBech32))
                    addressAmounts[addressBech32] = 0;
                addressAmounts[addressBech32] += outputLovelace;
            }

            return (outputAddresses, policyIds, addressAmounts, totalLovelace);
        }

        private bool IsRelevantForSubscription(WebhookSubscription sub, HashSet<string> outputAddresses)
        {
            if (sub.WalletAddresses == null || !sub.WalletAddresses.Any())
                return true;

            foreach (var filterAddress in sub.WalletAddresses)
            {
                var filterLower = filterAddress.ToLowerInvariant();
                if (outputAddresses.Contains(filterLower))
                    return true;
                if (outputAddresses.Any(addr => addr.Contains(filterLower) || filterLower.Contains(addr)))
                    return true;
            }

            return false;
        }

        private bool MeetsMinimumValue(WebhookSubscription sub, Dictionary<string, ulong> addressAmounts, ulong totalTxLovelace)
        {
            if (!sub.MinimumLovelace.HasValue || sub.MinimumLovelace.Value == 0)
                return true;

            ulong valueToCheck = 0;

            if (sub.WalletAddresses != null && sub.WalletAddresses.Any())
            {
                foreach (var walletAddr in sub.WalletAddresses)
                {
                    var walletLower = walletAddr.ToLowerInvariant();
                    if (addressAmounts.TryGetValue(walletLower, out var amt))
                        valueToCheck += amt;
                }
            }
            else if (!string.IsNullOrEmpty(sub.TargetAddress))
            {
                var targetLower = sub.TargetAddress.ToLowerInvariant();
                if (addressAmounts.TryGetValue(targetLower, out var amt))
                    valueToCheck = amt;
            }
            else
            {
                valueToCheck = totalTxLovelace;
            }

            return valueToCheck >= sub.MinimumLovelace.Value;
        }

        private (bool shouldDispatch, string matchReason) CheckEventType(WebhookSubscription sub, TransactionBody tx, HashSet<string> policyIds)
        {
            switch (sub.EventType?.ToLowerInvariant())
            {
                case "transaction":
                    return (true, "Transaction match");

                case "nft mint":
                case "mint":
                    var mint = tx.Mint();
                    if (mint != null && mint.Any())
                        return (true, "Mint event");
                    break;

                case "asset move":
                case "assetmove":
                    if (policyIds.Any())
                        return (true, "Asset transfer");
                    break;
            }

            return (false, "");
        }

        private async Task HandleCatchUpDispatch(IAppDbContext dbContext, WebhookSubscription sub, object payload)
        {
            if (!_pendingWebhooks.ContainsKey(sub.Id))
                _pendingWebhooks[sub.Id] = new List<object>();

            _pendingWebhooks[sub.Id].Add(payload);

            if (_pendingWebhooks[sub.Id].Count >= BatchSizeDuringCatchup)
            {
                var mostRecent = _pendingWebhooks[sub.Id].Last();
                _pendingWebhooks[sub.Id].Clear();

                var rl = _rateLimiter.Check(sub.Id, sub.MaxWebhooksPerMinute, sub.MaxWebhooksPerHour);
                if (rl.Allowed)
                    await DispatchWebhook(dbContext, sub, mostRecent);
            }
        }

        private async Task FlushAllBatchesAsync(IAppDbContext dbContext)
        {
            if (_pendingWebhooks.Count == 0)
                return;

            foreach (var (subId, payloads) in _pendingWebhooks.ToList())
            {
                if (payloads.Count == 0)
                    continue;

                var sub = await dbContext.WebhookSubscriptions.FindAsync(subId);
                if (sub == null || !sub.IsActive)
                    continue;

                var mostRecentPayload = payloads.Last();
                var rl = _rateLimiter.Check(sub.Id, sub.MaxWebhooksPerMinute, sub.MaxWebhooksPerHour);

                if (rl.Allowed)
                    await DispatchWebhook(dbContext, sub, mostRecentPayload);
                else
                    await RecordThrottledEvent(dbContext, sub, "batch", rl);
            }

            _pendingWebhooks.Clear();
        }

        private async Task DispatchWebhook(IAppDbContext dbContext, WebhookSubscription sub, object payload)
        {
            if (sub.IsRateLimited || !sub.IsActive || _rateLimiter.IsDisabled(sub.Id))
                return;

            try
            {
                var log = await _dispatcher.DispatchAsync(sub, payload);

                if (log.IsSuccess)
                    log.Status = DeliveryStatus.Success;
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
                }

                dbContext.DeliveryLogs.Add(log);
                await dbContext.SaveChangesAsync();

                _logger?.LogInformation("Dispatched webhook to {Name} - Status: {StatusCode}", sub.Name, log.ResponseStatusCode);
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error dispatching webhook to {Name}", sub.Name);
            }
        }

        private async Task RecordPausedEvent(IAppDbContext dbContext, WebhookSubscription sub, string txHash)
        {
            try
            {
                var log = new DeliveryLog
                {
                    Id = Guid.NewGuid(),
                    SubscriptionId = sub.Id,
                    PayloadJson = JsonSerializer.Serialize(new { TxHash = txHash }),
                    AttemptedAt = DateTime.UtcNow,
                    ResponseStatusCode = 0,
                    ResponseBody = "Subscription paused",
                    LatencyMs = 0,
                    Status = DeliveryStatus.Paused,
                    RetryCount = 0
                };

                dbContext.DeliveryLogs.Add(log);
                await dbContext.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error recording paused event for {Name}", sub.Name);
            }
        }

        private async Task RecordThrottledEvent(IAppDbContext dbContext, WebhookSubscription sub, string txHash, RateLimiter.RateLimitResult rl)
        {
            try
            {
                var reason = rl.Window == "hour" ? "Throttled: Hourly limit" : "Throttled: Minute limit";

                var log = new DeliveryLog
                {
                    Id = Guid.NewGuid(),
                    SubscriptionId = sub.Id,
                    PayloadJson = JsonSerializer.Serialize(new { TxHash = txHash }),
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

        private async Task UpdateCheckpoint(IAppDbContext dbContext, ulong slot, string blockHash)
        {
            var slotState = await dbContext.SystemStates.FirstOrDefaultAsync(s => s.Key == "LastSyncedSlot");
            if (slotState == null)
            {
                slotState = new SystemState { Key = "LastSyncedSlot", Value = slot.ToString() };
                dbContext.SystemStates.Add(slotState);
            }
            else
            {
                slotState.Value = slot.ToString();
            }

            var hashState = await dbContext.SystemStates.FirstOrDefaultAsync(s => s.Key == "LastSyncedHash");
            if (hashState == null)
            {
                hashState = new SystemState { Key = "LastSyncedHash", Value = blockHash };
                dbContext.SystemStates.Add(hashState);
            }
            else
            {
                hashState.Value = blockHash;
            }

            await dbContext.SaveChangesAsync();
        }

        private object BuildPayload(
            TransactionBody tx,
            int txIndex,
            ulong slot,
            string blockHash,
            ulong blockHeight,
            string txHash,
            List<TransactionInput> inputs,
            List<TransactionOutput> outputs,
            string eventType,
            string matchReason)
        {
            ulong totalOutputLovelace = 0;
            var outputDetails = new List<object>();

            foreach (var output in outputs.Take(20))
            {
                var addressHex = output.Address() != null
                    ? Convert.ToHexString(output.Address()).ToLowerInvariant()
                    : "";

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
                                    try
                                    {
                                        var decoded = System.Text.Encoding.UTF8.GetString(an);
                                        if (decoded.All(c => !char.IsControl(c) || char.IsWhiteSpace(c)))
                                            nameUtf8 = decoded;
                                    }
                                    catch { }

                                    if (pAssets.Value.TryGetValue(an, out var qty))
                                    {
                                        assets.Add(new
                                        {
                                            PolicyId = policyHex,
                                            NameHex = Convert.ToHexString(an).ToLowerInvariant(),
                                            NameUTF8 = nameUtf8,
                                            Quantity = qty
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
                else if (amount != null)
                {
                    try { lovelace = Convert.ToUInt64(amount); } catch { }
                }

                totalOutputLovelace += lovelace;
                outputDetails.Add(new
                {
                    Address = Bech32Encoder.ConvertToBech32Address(addressHex),
                    AddressHex = addressHex,
                    Amount = new { Lovelace = lovelace, Ada = Math.Round(lovelace / 1_000_000.0, 6) },
                    Assets = assets,
                    IsChange = (bool?)null
                });
            }

            var totalReceived = new Dictionary<string, string>();
            var temp = new Dictionary<string, double>();

            foreach (dynamic o in outputDetails)
            {
                string a = o.Address;
                double v = o.Amount.Ada;
                if (!temp.ContainsKey(a))
                    temp[a] = 0;
                temp[a] += v;
            }

            foreach (var k in temp)
                totalReceived[k.Key] = $"{k.Value:F6} ADA";

            return new
            {
                Event = eventType,
                TxHash = txHash,
                Metadata = new
                {
                    MatchReason = matchReason,
                    InputCount = inputs.Count,
                    OutputCount = outputs.Count,
                    TotalOutputAda = Math.Round(totalOutputLovelace / 1_000_000.0, 6)
                },
                TotalReceived = totalReceived,
                Fees = new { Lovelace = tx.Fee(), Ada = Math.Round(tx.Fee() / 1_000_000.0, 6) },
                Inputs = inputs.Take(20).Select(i => new
                {
                    TxHash = Convert.ToHexString(i.TransactionId()).ToLowerInvariant(),
                    OutputIndex = i.Index()
                }),
                Outputs = outputDetails,
                Block = new { Slot = slot, Hash = blockHash, Height = blockHeight },
                Timestamp = DateTime.UtcNow.ToString("o")
            };
        }
    }
}
