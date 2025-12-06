using System;

namespace Panoptes.Core.Entities
{
    public class DeliveryLog
    {
        public Guid Id { get; set; }
        public Guid SubscriptionId { get; set; }
        public int ResponseStatusCode { get; set; }
        public string PayloadJson { get; set; } = string.Empty;
        public string ResponseBody { get; set; } = string.Empty;
        public double LatencyMs { get; set; }
        public DateTime AttemptedAt { get; set; }
        
        // Retry mechanism fields
        public int RetryCount { get; set; } = 0;
        public int MaxRetries { get; set; } = 3;
        public DateTime? NextRetryAt { get; set; }
        public DeliveryStatus Status { get; set; } = DeliveryStatus.Pending;
        
        // Navigation property for cascade delete
        public WebhookSubscription? Subscription { get; set; }
        
        public bool IsSuccess => ResponseStatusCode >= 200 && ResponseStatusCode < 300;
        public bool CanRetry => !IsSuccess && RetryCount < MaxRetries && Status != DeliveryStatus.Success;
    }
    
    public enum DeliveryStatus
    {
        Pending,
        Success,
        Failed,
        Retrying
    }
}
