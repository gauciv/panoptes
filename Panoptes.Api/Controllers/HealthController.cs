using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Panoptes.Core.Entities;
using Panoptes.Core.Interfaces;
using Panoptes.Infrastructure.Configurations;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace Panoptes.Api.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class HealthController : ControllerBase
    {
        private readonly IAppDbContext _dbContext;
        private readonly PanoptesConfig _config;

        public HealthController(IAppDbContext dbContext, IOptions<PanoptesConfig> config)
        {
            _dbContext = dbContext;
            _config = config.Value;
        }

        [HttpGet]
        public async Task<ActionResult<HealthResponse>> GetHealth()
        {
            var response = new HealthResponse
            {
                Status = "healthy",
                Timestamp = DateTime.UtcNow
            };

            try
            {
                // Check database connectivity
                var canConnect = await _dbContext.WebhookSubscriptions.AnyAsync() || true;
                response.Database = "connected";

                // Get sync status
                var systemState = await _dbContext.SystemStates
                    .FirstOrDefaultAsync(s => s.Key == "LastSyncedSlot");
                
                if (systemState != null && ulong.TryParse(systemState.Value, out var slot))
                {
                    response.LastSyncedSlot = slot;
                }

                var hashState = await _dbContext.SystemStates
                    .FirstOrDefaultAsync(s => s.Key == "LastSyncedHash");
                if (hashState != null)
                {
                    response.LastSyncedHash = hashState.Value;
                }

                // Get subscription stats
                response.ActiveSubscriptions = await _dbContext.WebhookSubscriptions
                    .CountAsync(s => s.IsActive);
                response.TotalSubscriptions = await _dbContext.WebhookSubscriptions.CountAsync();

                // Get delivery stats
                var last24Hours = DateTime.UtcNow.AddHours(-24);
                var recentLogs = await _dbContext.DeliveryLogs
                    .Where(l => l.AttemptedAt >= last24Hours)
                    .ToListAsync();

                response.DeliveriesLast24h = recentLogs.Count;
                response.SuccessfulDeliveries = recentLogs.Count(l => l.Status == DeliveryStatus.Success);
                response.FailedDeliveries = recentLogs.Count(l => l.Status == DeliveryStatus.Failed);
                response.PendingRetries = await _dbContext.DeliveryLogs
                    .CountAsync(l => l.Status == DeliveryStatus.Retrying);
            }
            catch (Exception ex)
            {
                response.Status = "unhealthy";
                response.Database = $"error: {ex.Message}";
            }

            return Ok(response);
        }

        [HttpGet("system-info")]
        public async Task<ActionResult<SystemInfo>> GetSystemInfo()
        {
            // Try to load from database first
            var dbConfig = await _dbContext.DemeterConfigs
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.IsActive);

            if (dbConfig != null)
            {
                // Credentials configured in database
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

            // Fallback to appsettings
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

            // No configuration found
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
        public string ConfiguredVia { get; set; } = "None"; // "Database", "AppSettings", or "None"
    }

    public class HealthResponse
    {
        public string Status { get; set; } = "unknown";
        public DateTime Timestamp { get; set; }
        public string Database { get; set; } = "unknown";
        public ulong? LastSyncedSlot { get; set; }
        public string? LastSyncedHash { get; set; }
        public int ActiveSubscriptions { get; set; }
        public int TotalSubscriptions { get; set; }
        public int DeliveriesLast24h { get; set; }
        public int SuccessfulDeliveries { get; set; }
        public int FailedDeliveries { get; set; }
        public int PendingRetries { get; set; }
    }
}
