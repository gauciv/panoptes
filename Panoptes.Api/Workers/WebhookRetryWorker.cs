using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Panoptes.Core.Entities;
using Panoptes.Core.Interfaces;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace Panoptes.Api.Workers
{
    /// <summary>
    /// Background service that retries failed webhook deliveries with exponential backoff
    /// </summary>
    public class WebhookRetryWorker : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<WebhookRetryWorker> _logger;
        private readonly TimeSpan _checkInterval = TimeSpan.FromMinutes(1); // Check every minute instead of 30s

        public WebhookRetryWorker(IServiceProvider serviceProvider, ILogger<WebhookRetryWorker> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Webhook Retry Worker started");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await ProcessRetries(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error processing webhook retries");
                }

                await Task.Delay(_checkInterval, stoppingToken);
            }
        }

        private async Task ProcessRetries(CancellationToken stoppingToken)
        {
            using var scope = _serviceProvider.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<IAppDbContext>();
            var dispatcher = scope.ServiceProvider.GetRequiredService<IWebhookDispatcher>();

            // Find logs that need retry
            var logsToRetry = await dbContext.DeliveryLogs
                .Where(l => l.Status == DeliveryStatus.Retrying 
                         && l.NextRetryAt != null 
                         && l.NextRetryAt <= DateTime.UtcNow
                         && l.RetryCount < l.MaxRetries)
                .Include(l => l.Subscription)
                .Take(10) // Process in batches
                .ToListAsync(stoppingToken);

            if (!logsToRetry.Any())
            {
                return; // Don't log if nothing to do
            }

            _logger.LogInformation("Processing {Count} webhook retries", logsToRetry.Count);

            foreach (var log in logsToRetry)
            {
                if (stoppingToken.IsCancellationRequested) break;
                
                if (log.Subscription == null || !log.Subscription.IsActive)
                {
                    log.Status = DeliveryStatus.Failed;
                    log.ResponseBody = "Subscription no longer active";
                    continue;
                }

                try
                {
                    // Deserialize the original payload
                    var payload = System.Text.Json.JsonSerializer.Deserialize<object>(log.PayloadJson);
                    
                    // Attempt retry
                    var result = await dispatcher.DispatchAsync(log.Subscription, payload!);
                    
                    // Update the original log
                    log.RetryCount++;
                    log.AttemptedAt = DateTime.UtcNow;
                    log.ResponseStatusCode = result.ResponseStatusCode;
                    log.ResponseBody = result.ResponseBody;
                    log.LatencyMs = result.LatencyMs;

                    if (result.ResponseStatusCode >= 200 && result.ResponseStatusCode < 300)
                    {
                        log.Status = DeliveryStatus.Success;
                        log.NextRetryAt = null;
                        _logger.LogInformation("Webhook retry succeeded for log {LogId}", log.Id);
                    }
                    else if (log.RetryCount >= log.MaxRetries)
                    {
                        log.Status = DeliveryStatus.Failed;
                        log.NextRetryAt = null;
                        _logger.LogWarning("Webhook retry exhausted for log {LogId} after {RetryCount} attempts", 
                            log.Id, log.RetryCount);
                    }
                    else
                    {
                        // Schedule next retry with exponential backoff
                        var backoffSeconds = Math.Pow(2, log.RetryCount) * 30; // 30s, 60s, 120s, etc.
                        log.NextRetryAt = DateTime.UtcNow.AddSeconds(backoffSeconds);
                        _logger.LogInformation("Webhook retry {RetryCount} failed for log {LogId}, next retry at {NextRetry}", 
                            log.RetryCount, log.Id, log.NextRetryAt);
                    }
                }
                catch (Exception ex)
                {
                    log.RetryCount++;
                    log.ResponseBody = $"Retry exception: {ex.Message}";
                    
                    if (log.RetryCount >= log.MaxRetries)
                    {
                        log.Status = DeliveryStatus.Failed;
                        log.NextRetryAt = null;
                    }
                    else
                    {
                        var backoffSeconds = Math.Pow(2, log.RetryCount) * 30;
                        log.NextRetryAt = DateTime.UtcNow.AddSeconds(backoffSeconds);
                    }
                    
                    _logger.LogError(ex, "Exception during webhook retry for log {LogId}", log.Id);
                }
            }

            await dbContext.SaveChangesAsync(stoppingToken);
        }
    }
}
