using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;

namespace Panoptes.Core.Entities
{
    public class WebhookSubscription
    {
        [Key]
        public Guid Id { get; set; }

        public string Name { get; set; } = string.Empty;
        public string TargetUrl { get; set; } = string.Empty;
        public string EventType { get; set; } = string.Empty;

        // Legacy single-value filters (kept for backward compatibility)
        public string? TargetAddress { get; set; }
        public string? PolicyId { get; set; }

        public string SecretKey { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public bool IsPaused { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? PausedAt { get; set; }
        public ulong? MinimumLovelace { get; set; }

        public bool IsDeleted { get; set; } = false;

        // --- NEW FEATURES ---
        // Stores headers as a serialized JSON string: {"Authorization":"Bearer ..."}
        public string? CustomHeaders { get; set; }
        
        // Stores the custom payload template string
        public string? CustomPayloadTemplate { get; set; }
        // --------------------

        // Address filtering: null = listen to all, populated = filter by these addresses
        public List<string>? WalletAddresses { get; set; }

        // Rate Limiting
        public int MaxWebhooksPerMinute { get; set; } = 60;
        public int MaxWebhooksPerHour { get; set; } = 1000;
        public bool EnableBatching { get; set; } = false;
        public int BatchWindowSeconds { get; set; } = 10;

        // --- Runtime Status (Not persisted in DB) ---
        [NotMapped]
        public int WebhooksInLastMinute { get; set; } = 0;
        [NotMapped]
        public int WebhooksInLastHour { get; set; } = 0;
        [NotMapped]
        public DateTime? LastWebhookAt { get; set; }
        [NotMapped]
        public bool IsRateLimited { get; set; } = false;
        [NotMapped]
        public bool IsSyncing { get; set; } = false;

        // --- LOGIC ---

        /// <summary>
        /// Checks if this subscription matches the given transaction outputs/policies.
        /// Supports checking against a set of addresses (Hex & Bech32) and Policy IDs.
        /// </summary>
        public bool Matches(HashSet<string> addresses, HashSet<string> policies)
        {
            // 1. If no filters are set, it's a "Firehose" (matches everything)
            bool hasWalletFilters = WalletAddresses != null && WalletAddresses.Count > 0;
            bool hasTargetAddress = !string.IsNullOrEmpty(TargetAddress);
            bool hasPolicyFilter = !string.IsNullOrEmpty(PolicyId);

            if (!hasWalletFilters && !hasTargetAddress && !hasPolicyFilter)
            {
                return true;
            }

            // 2. Check WalletAddresses List (Checks if ANY of the subscription's addresses are in the tx)
            if (hasWalletFilters)
            {
                foreach (var filter in WalletAddresses!)
                {
                    var f = filter.ToLowerInvariant();
                    // Match against Addresses
                    if (addresses != null && (addresses.Contains(f) || addresses.Any(a => a.Contains(f)))) 
                        return true;
                    // Match against Policy IDs (if user put a Policy ID in the address list)
                    if (policies != null && policies.Contains(f)) 
                        return true;
                }
            }

            // 3. Check Legacy TargetAddress
            if (hasTargetAddress && addresses != null)
            {
                if (addresses.Contains(TargetAddress!.ToLowerInvariant())) return true;
            }

            // 4. Check Legacy PolicyId
            if (hasPolicyFilter && policies != null)
            {
                if (policies.Contains(PolicyId!.ToLowerInvariant())) return true;
            }

            return false;
        }
    }
}