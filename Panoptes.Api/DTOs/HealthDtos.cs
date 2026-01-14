namespace Panoptes.Api.DTOs
{
    public class HealthResponse
    {
        public string Status { get; set; } = "unknown";
        public DateTime Timestamp { get; set; }
        public string Version { get; set; } = "1.0.0";
        public TimeSpan Uptime { get; set; }
        public HealthChecks Checks { get; set; } = new();
        public MetricsInfo Metrics { get; set; } = new();
        public SystemHealthInfo System { get; set; } = new();
    }

    public class HealthChecks
    {
        public DatabaseHealth Database { get; set; } = new();
        public ServiceHealth UtxoRpc { get; set; } = new();
    }

    public class DatabaseHealth
    {
        public string Status { get; set; } = "Unknown";
        public long ResponseTimeMs { get; set; }
        public string Message { get; set; } = string.Empty;
        public string? Error { get; set; }
    }

    public class ServiceHealth
    {
        public string Status { get; set; } = "Unknown";
        public long LatencyMs { get; set; }
        public string Message { get; set; } = string.Empty;
        public string? Error { get; set; }
    }

    public class MetricsInfo
    {
        public int ActiveSubscriptions { get; set; }
        public int TotalSubscriptions { get; set; }
        public ulong? LastBlockSynced { get; set; }
        public int DeliveriesLast24h { get; set; }
        public int SuccessfulDeliveries { get; set; }
        public int FailedDeliveries { get; set; }
        public string? Error { get; set; }
    }

    public class SystemHealthInfo
    {
        public double MemoryUsageMb { get; set; }
        public double GcMemoryMb { get; set; }
        public double CpuUsagePercent { get; set; }
        public int ThreadCount { get; set; }
        public DateTime ProcessStartTime { get; set; }
        public string? Error { get; set; }
    }

    public class SystemInfo
    {
        public string Network { get; set; } = "Preprod";
        public string GrpcEndpoint { get; set; } = string.Empty;
        public bool HasApiKey { get; set; }
        public string[] AvailableNetworks { get; set; } = Array.Empty<string>();
        public string ConfiguredVia { get; set; } = "None";
    }
}
