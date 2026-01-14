using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using System.Diagnostics;
using Panoptes.Core.Entities;
using Panoptes.Core.Interfaces;
using Panoptes.Infrastructure.Configurations;
using Panoptes.Api.DTOs;

namespace Panoptes.Api.Controllers
{
    [ApiController]
    [Route("[controller]")]
    [Authorize]
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

        private string GetCurrentUserId()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                         ?? User.FindFirst("sub")?.Value;

            if (string.IsNullOrEmpty(userId))
                throw new UnauthorizedAccessException("User ID claim not found in token.");

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

            var checks = new HealthChecks
            {
                Database = await CheckDatabaseHealthAsync(),
                UtxoRpc = await CheckUtxoRpcHealthAsync()
            };

            var userId = GetCurrentUserId();
            var metrics = await GetMetricsAsync(userId);
            var systemInfo = GetSystemInfo();

            response.Checks = checks;
            response.Metrics = metrics;
            response.System = systemInfo;

            if (checks.Database.Status == "Unhealthy" || checks.UtxoRpc.Status == "Unhealthy")
            {
                response.Status = "Unhealthy";
                return StatusCode(503, response);
            }

            if (checks.Database.Status == "Degraded" || checks.UtxoRpc.Status == "Degraded")
            {
                response.Status = "Degraded";
            }

            return Ok(response);
        }

        [HttpGet("system-info")]
        public async Task<ActionResult<SystemInfo>> GetSystemConfiguration()
        {
            var dbConfig = await _dbContext.DemeterConfigs
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.IsActive);

            if (dbConfig != null)
            {
                return Ok(new SystemInfo
                {
                    Network = dbConfig.Network,
                    GrpcEndpoint = dbConfig.GrpcEndpoint,
                    HasApiKey = true,
                    AvailableNetworks = new[] { "Mainnet", "Preprod", "Preview" },
                    ConfiguredVia = "Database"
                });
            }

            if (!string.IsNullOrWhiteSpace(_config.GrpcEndpoint))
            {
                return Ok(new SystemInfo
                {
                    Network = _config.Network,
                    GrpcEndpoint = _config.GrpcEndpoint,
                    HasApiKey = !string.IsNullOrWhiteSpace(_config.ApiKey),
                    AvailableNetworks = new[] { "Mainnet", "Preprod", "Preview" },
                    ConfiguredVia = "AppSettings"
                });
            }

            return Ok(new SystemInfo
            {
                Network = "Not Configured",
                GrpcEndpoint = "Not Configured",
                HasApiKey = false,
                AvailableNetworks = new[] { "Mainnet", "Preprod", "Preview" },
                ConfiguredVia = "None"
            });
        }

        private async Task<DatabaseHealth> CheckDatabaseHealthAsync()
        {
            var stopwatch = Stopwatch.StartNew();
            try
            {
                await _dbContext.WebhookSubscriptions.FirstOrDefaultAsync();
                stopwatch.Stop();

                return new DatabaseHealth
                {
                    Status = "Healthy",
                    ResponseTimeMs = stopwatch.ElapsedMilliseconds,
                    Message = "Database connection successful"
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

                return new ServiceHealth
                {
                    Status = response.IsSuccessStatusCode ? "Healthy" : "Degraded",
                    LatencyMs = stopwatch.ElapsedMilliseconds,
                    Message = response.IsSuccessStatusCode
                        ? "UtxoRPC service reachable"
                        : $"UtxoRPC service returned status: {response.StatusCode}"
                };
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

        private async Task<MetricsInfo> GetMetricsAsync(string userId)
        {
            try
            {
                var activeSubscriptions = await _dbContext.WebhookSubscriptions
                    .CountAsync(s => s.UserId == userId && s.IsActive && !s.IsDeleted);

                var totalSubscriptions = await _dbContext.WebhookSubscriptions
                    .CountAsync(s => s.UserId == userId && !s.IsDeleted);

                var lastSlotState = await _dbContext.SystemStates
                    .FirstOrDefaultAsync(s => s.Key == "LastSyncedSlot");

                ulong? lastBlockHeight = null;
                if (lastSlotState != null && ulong.TryParse(lastSlotState.Value, out var slot))
                    lastBlockHeight = slot;

                var last24Hours = DateTime.UtcNow.AddHours(-24);
                var recentLogs = await _dbContext.DeliveryLogs
                    .Include(l => l.Subscription)
                    .Where(l => l.AttemptedAt >= last24Hours
                                && l.Subscription != null
                                && l.Subscription.UserId == userId
                                && !l.Subscription.IsDeleted)
                    .ToListAsync();

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
                return new MetricsInfo { Error = $"Failed to retrieve metrics: {ex.Message}" };
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
                return new SystemHealthInfo { Error = $"Failed to retrieve system info: {ex.Message}" };
            }
        }
    }
}
