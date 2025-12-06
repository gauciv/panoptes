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

        public PanoptesReducer(IAppDbContext dbContext, IWebhookDispatcher dispatcher, ILogger<PanoptesReducer>? logger = null)
        {
            _dbContext = dbContext;
            _dispatcher = dispatcher;
            _logger = logger;
        }

        public async Task RollForwardAsync(Block block)
        {
            var slot = block.Header().HeaderBody().Slot();
            var blockHash = block.Header().Hash();
            var blockHeight = block.Header().HeaderBody().BlockNumber();

            // Only log every 100 blocks to reduce spam during sync
            if (blockHeight % 100 == 0)
            {
                _logger?.LogInformation("Processing block at slot {Slot}, height {Height}", slot, blockHeight);
            }

            // Fetch all active subscriptions
            var subscriptions = await _dbContext.WebhookSubscriptions
                .Where(s => s.IsActive)
                .AsNoTracking()
                .ToListAsync();

            if (subscriptions.Any())
            {
                var txs = block.TransactionBodies();
                if (txs != null && txs.Any())
                {
                    var txIndex = 0;
                    foreach (var tx in txs)
                    {
                        await ProcessTransaction(tx, txIndex, slot, blockHash, blockHeight, subscriptions);
                        txIndex++;
                    }
                }
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
                    bool shouldDispatch = false;
                    string matchReason = "";

                    switch (sub.EventType?.ToLowerInvariant())
                    {
                        case "transaction":
                            // Match by address if specified, otherwise match all transactions
                            if (string.IsNullOrEmpty(sub.TargetAddress))
                            {
                                shouldDispatch = true;
                                matchReason = "All transactions";
                            }
                            else if (outputAddresses.Contains(sub.TargetAddress))
                            {
                                shouldDispatch = true;
                                matchReason = $"Address match: {sub.TargetAddress}";
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
                        await DispatchWebhook(sub, new
                        {
                            Event = sub.EventType,
                            MatchReason = matchReason,
                            Slot = slot,
                            BlockHash = blockHash,
                            BlockHeight = blockHeight,
                            TxHash = txHash,
                            TxIndex = txIndex,
                            InputCount = inputs.Count,
                            OutputCount = outputs.Count,
                            OutputAddresses = outputAddresses.Take(10).ToList(), // Limit for payload size
                            PolicyIds = policyIds.Take(10).ToList(),
                            Timestamp = DateTime.UtcNow
                        });
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
            try
            {
                var log = await _dispatcher.DispatchAsync(sub, payload);
                
                // Set status based on response
                if (log.IsSuccess)
                {
                    log.Status = DeliveryStatus.Success;
                }
                else
                {
                    // Schedule for retry with exponential backoff
                    log.Status = DeliveryStatus.Retrying;
                    log.NextRetryAt = DateTime.UtcNow.AddSeconds(30); // First retry in 30 seconds
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
    }
}
