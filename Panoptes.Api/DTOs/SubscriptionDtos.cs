using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using Panoptes.Core.Entities;

namespace Panoptes.Api.DTOs
{
    public class CreateSubscriptionRequest
    {
        [Required] public string Name { get; set; } = string.Empty;
        [Required] [Url] public string TargetUrl { get; set; } = string.Empty;
        [Required] public string EventType { get; set; } = "Transaction";
        
        public List<string>? WalletAddresses { get; set; }
        public ulong? MinimumLovelace { get; set; }

        // ✅ NEW FIELDS
        public string? CustomPayloadTemplate { get; set; }
        public Dictionary<string, string>? CustomHeaders { get; set; }
    }

    public class UpdateSubscriptionRequest
    {
        public string? Name { get; set; }
        public string? TargetUrl { get; set; }
        public string? EventType { get; set; }
        public bool? IsActive { get; set; }
        
        public List<string>? WalletAddresses { get; set; }
        public ulong? MinimumLovelace { get; set; }
        
        // ✅ NEW FIELDS
        public string? CustomPayloadTemplate { get; set; }
        public Dictionary<string, string>? CustomHeaders { get; set; }
    }
}