using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Panoptes.Core.Entities;
using Panoptes.Core.Interfaces;
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

        public HealthController(IAppDbContext dbContext)
        {
            _dbContext = dbContext;
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
