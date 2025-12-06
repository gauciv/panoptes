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
    }
}
