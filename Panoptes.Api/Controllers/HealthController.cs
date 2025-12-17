using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Panoptes.Core.Entities;
using Panoptes.Core.Interfaces;
using Panoptes.Infrastructure.Configurations;
using System;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization; // Required for [Authorize]
using System.Security.Claims; // Required for User.FindFirst

namespace Panoptes.Api.Controllers
{
    [ApiController]
    [Route("[controller]")]
    [Authorize] // 🔒 Secure the endpoint so we can get the UserId
    public class HealthController : ControllerBase
    {
        private readonly IAppDbContext _dbContext;
        private readonly PanoptesConfig _config;
        private readonly IHttpClientFactory _httpClientFactory;
        private static readonly DateTime _startTime = DateTime.UtcNow;

        public HealthController(
            IAppDbContext dbContext, 
            IOptions<PanoptesConfig> config,
            IHttpClientFactory httpClientFactory)
        {
            _dbContext = dbContext;
            _config = config.Value;
            _httpClientFactory = httpClientFactory;
        }

        // --- 🔐 SECURITY HELPER ---
        private string GetCurrentUserId()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                         ?? User.FindFirst("sub")?.Value;
                         
            if (string.IsNullOrEmpty(userId))
            {
                throw new UnauthorizedAccessException("User ID claim not found in token.");
            }
            return userId;
        }

        [HttpGet]
        public async Task<ActionResult<HealthResponse>> GetHealth()
        {
            var response = new HealthResponse
            {
                Status = "Healthy",
                Timestamp = DateTime.UtcNow,
                Version = "1.0.0",
                Uptime = DateTime.UtcNow - _startTime
            };

            var checks = new HealthChecks();
            
            // Database check (Global connectivity check)
            checks.Database = await CheckDatabaseHealthAsync();
            
            // UtxoRPC service check (Global connectivity check)
            checks.UtxoRpc = await CheckUtxoRpcHealthAsync();
            
            // Get metrics (PERSONALIZED)
            // We pass the User ID to ensure they only see THEIR data
            var userId = GetCurrentUserId();
            var metrics = await GetMetricsAsync(userId);
            
            // Get system info (Global container stats)
            var systemInfo = GetSystemInfo();

            response.Checks = checks;
            response.Metrics = metrics;
            response.System = systemInfo;

            // Determine overall status
            if (checks.Database.Status == "Unhealthy" || checks.UtxoRpc.Status == "Unhealthy")
            {
                response.Status = "Unhealthy";
                return StatusCode(503, response);
            }
            else if (checks.Database.Status == "Degraded" || checks.UtxoRpc.Status == "Degraded")
            {
                response.Status = "Degraded";
                return StatusCode(200, response);
            }

            return Ok(response);
        }

        private async Task<DatabaseHealth> CheckDatabaseHealthAsync()
        {
            var stopwatch = Stopwatch.StartNew();
            try
            {
                // Execute a simple query to test connectivity
                // Using WebhookSubscriptions is fine, we just want to know if DB responds
                await _dbContext.WebhookSubscriptions.FirstOrDefaultAsync();
                stopwatch.Stop();

                var time = stopwatch.ElapsedMilliseconds;

                return new DatabaseHealth
                {
                    Status = "Healthy",
                    ResponseTimeMs = time,
                    Message = time == 0 ? "Database connection successful (<1ms)" : "Database connection successful"
                };
            }
            catch (Exception ex)
            {
                stopwatch.Stop();
                return new DatabaseHealth
                {
                    Status = "Unhealthy",
                    ResponseTimeMs = stopwatch.ElapsedMilliseconds,
                    Message = "Database connection failed",
                    Error = ex.Message
                };
            }
        }

        private async Task<ServiceHealth> CheckUtxoRpcHealthAsync()
        {
            var stopwatch = Stopwatch.StartNew();
            
            var demeterConfig = await _dbContext.DemeterConfigs
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.IsActive);

            var endpoint = demeterConfig?.GrpcEndpoint ?? _config.GrpcEndpoint;

            if (string.IsNullOrWhiteSpace(endpoint))
            {
                stopwatch.Stop();
                return new ServiceHealth
                {
                    Status = "Degraded",
                    LatencyMs = 0,
                    Message = "UtxoRPC service not configured"
                };
            }

            try
            {
                var httpUrl = endpoint.Replace("grpc://", "http://").Replace("grpcs://", "https://");
                
                var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(5);
                
                var response = await client.GetAsync($"{httpUrl}/health");
                stopwatch.Stop();

                if (response.IsSuccessStatusCode)
                {
                    return new ServiceHealth
                    {
                        Status = "Healthy",
                        LatencyMs = stopwatch.ElapsedMilliseconds,
                        Message = "UtxoRPC service reachable"
                    };
                }
                else
                {
                    return new ServiceHealth
                    {
                        Status = "Degraded",
                        LatencyMs = stopwatch.ElapsedMilliseconds,
                        Message = $"UtxoRPC service returned status: {response.StatusCode}"
                    };
                }
            }
            catch (Exception ex)
            {
                stopwatch.Stop();
                return new ServiceHealth
                {
                    Status = "Degraded",
                    LatencyMs = stopwatch.ElapsedMilliseconds,
                    Message = "UtxoRPC service health check unavailable",
                    Error = ex.Message
                };
            }
        }

        // 🔒 UPDATED: Accepts UserId to filter data
        private async Task<MetricsInfo> GetMetricsAsync(string userId)
        {
            try
            {
                // 1. Active: Filter by User + Active + NotDeleted
                var activeSubscriptions = await _dbContext.WebhookSubscriptions
                    .CountAsync(s => s.UserId == userId && s.IsActive && !s.IsDeleted);

                // 2. Total: Filter by User + NotDeleted
                var totalSubscriptions = await _dbContext.WebhookSubscriptions
                    .CountAsync(s => s.UserId == userId && !s.IsDeleted);

                // 3. Last Synced Block (System Global State - this remains global)
                var lastSlotState = await _dbContext.SystemStates
                    .FirstOrDefaultAsync(s => s.Key == "LastSyncedSlot");
                
                ulong? lastBlockHeight = null;
                if (lastSlotState != null && ulong.TryParse(lastSlotState.Value, out var slot))
                {
                    lastBlockHeight = slot;
                }

                // 4. Logs: Filter by User via Join/Include
                var last24Hours = DateTime.UtcNow.AddHours(-24);
                
                var recentLogsQuery = _dbContext.DeliveryLogs
                    .Include(l => l.Subscription)
                    .Where(l => l.AttemptedAt >= last24Hours 
                                && l.Subscription != null 
                                && l.Subscription.UserId == userId 
                                && !l.Subscription.IsDeleted);

                var recentLogs = await recentLogsQuery.ToListAsync();

                return new MetricsInfo
                {
                    ActiveSubscriptions = activeSubscriptions,
                    TotalSubscriptions = totalSubscriptions,
                    LastBlockSynced = lastBlockHeight,
                    DeliveriesLast24h = recentLogs.Count,
                    SuccessfulDeliveries = recentLogs.Count(l => l.Status == DeliveryStatus.Success),
                    FailedDeliveries = recentLogs.Count(l => l.Status == DeliveryStatus.Failed)
                };
            }
            catch (Exception ex)
            {
                return new MetricsInfo
                {
                    Error = $"Failed to retrieve metrics: {ex.Message}"
                };
            }
        }

        private SystemHealthInfo GetSystemInfo()
        {
            try
            {
                var process = Process.GetCurrentProcess();
                var gcMemoryMb = GC.GetTotalMemory(false) / 1024.0 / 1024.0;
                var workingSetMb = process.WorkingSet64 / 1024.0 / 1024.0;

                var totalCpuTime = process.TotalProcessorTime.TotalMilliseconds;
                var totalRunTime = (DateTime.UtcNow - _startTime).TotalMilliseconds;
                var cpuUsage = totalRunTime > 0 
                    ? (totalCpuTime / (totalRunTime * Environment.ProcessorCount)) * 100 
                    : 0;

                return new SystemHealthInfo
                {
                    MemoryUsageMb = Math.Round(workingSetMb, 2),
                    GcMemoryMb = Math.Round(gcMemoryMb, 2),
                    ThreadCount = process.Threads.Count,
                    CpuUsagePercent = Math.Round(cpuUsage, 2),
                    ProcessStartTime = _startTime
                };
            }
            catch (Exception ex)
            {
                return new SystemHealthInfo
                {
                    Error = $"Failed to retrieve system info: {ex.Message}"
                };
            }
        }

        [HttpGet("system-info")]
        public async Task<ActionResult<SystemInfo>> GetSystemConfiguration()
        {
            // Try to load from database first
            var dbConfig = await _dbContext.DemeterConfigs
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.IsActive);

            if (dbConfig != null)
            {
                var info = new SystemInfo
                {
                    Network = dbConfig.Network,
                    GrpcEndpoint = dbConfig.GrpcEndpoint,
                    HasApiKey = true,
                    AvailableNetworks = new[] { "Mainnet", "Preprod", "Preview" },
                    ConfiguredVia = "Database"
                };
                return Ok(info);
            }

            if (!string.IsNullOrWhiteSpace(_config.GrpcEndpoint))
            {
                var info = new SystemInfo
                {
                    Network = _config.Network,
                    GrpcEndpoint = _config.GrpcEndpoint,
                    HasApiKey = !string.IsNullOrWhiteSpace(_config.ApiKey),
                    AvailableNetworks = new[] { "Mainnet", "Preprod", "Preview" },
                    ConfiguredVia = "AppSettings"
                };
                return Ok(info);
            }

            var defaultInfo = new SystemInfo
            {
                Network = "Not Configured",
                GrpcEndpoint = "Not Configured",
                HasApiKey = false,
                AvailableNetworks = new[] { "Mainnet", "Preprod", "Preview" },
                ConfiguredVia = "None"
            };
            return Ok(defaultInfo);
        }
    }

    public class SystemInfo
    {
        public string Network { get; set; } = "Preprod";
        public string GrpcEndpoint { get; set; } = string.Empty;
        public bool HasApiKey { get; set; }
        public string[] AvailableNetworks { get; set; } = Array.Empty<string>();
        public string ConfiguredVia { get; set; } = "None"; 
    }

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
}