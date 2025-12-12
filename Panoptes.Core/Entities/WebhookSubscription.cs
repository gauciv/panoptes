using System;

namespace Panoptes.Core.Entities
{
    public class WebhookSubscription
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string TargetUrl { get; set; } = string.Empty;
        public string EventType { get; set; } = string.Empty;
        public string? TargetAddress { get; set; }
        public string? PolicyId { get; set; }
        public string SecretKey { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public bool IsPaused { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? PausedAt { get; set; }
        public ulong? MinimumLovelace { get; set; }

        public bool IsDeleted { get; set; } = false;
        
        // Address filtering: null = listen to all, empty = none, populated = filter by these addresses
        public List<string>? WalletAddresses { get; set; }
        
        // Rate Limiting
        public int MaxWebhooksPerMinute { get; set; } = 60;
        public int MaxWebhooksPerHour { get; set; } = 1000;
        public bool EnableBatching { get; set; } = false;
        public int BatchWindowSeconds { get; set; } = 10;
        
        // Rate Limit Status (not persisted, calculated at runtime)
        public int WebhooksInLastMinute { get; set; } = 0;
        public int WebhooksInLastHour { get; set; } = 0;
        public DateTime? LastWebhookAt { get; set; }
        public bool IsRateLimited { get; set; } = false;
        
        // Sync Status (not persisted, calculated at runtime)
        public bool IsSyncing { get; set; } = false;
        
        // Circuit Breaker (persisted)
        public int ConsecutiveFailures { get; set; } = 0;
        public DateTime? LastFailureAt { get; set; }
        public DateTime? FirstFailureInWindowAt { get; set; }
        public bool IsCircuitBroken { get; set; } = false;
        public string? CircuitBrokenReason { get; set; }

        public bool Matches(string? address, string? policyId)
        {
            // If filters are null, they match everything (or rather, aren't restrictive).
            // However, usually in these systems:
            // If the subscription has a filter (e.g. TargetAddress is set), the input must match it.
            // If the subscription has no filter (null), it matches any input.
            
            if (!string.IsNullOrEmpty(TargetAddress) && !string.Equals(TargetAddress, address, StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            if (!string.IsNullOrEmpty(PolicyId) && !string.Equals(PolicyId, policyId, StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            return true;
        }
    }
}
