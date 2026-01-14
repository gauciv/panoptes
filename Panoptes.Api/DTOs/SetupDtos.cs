namespace Panoptes.Api.DTOs
{
    public class SetupStatus
    {
        public bool IsConfigured { get; set; }
        public string? ActiveNetwork { get; set; }
        public string? ActiveEndpoint { get; set; }
        public List<string> ConfiguredNetworks { get; set; } = new();
    }

    public class DemeterCredentials
    {
        public string GrpcEndpoint { get; set; } = string.Empty;
        public string ApiKey { get; set; } = string.Empty;
        public string? Network { get; set; }
    }

    public class NetworkSwitchRequest
    {
        public string Network { get; set; } = string.Empty;
    }

    public class ValidationResult
    {
        public bool IsValid { get; set; }
        public string Message { get; set; } = string.Empty;
        public ulong? ChainTip { get; set; }
    }
}
