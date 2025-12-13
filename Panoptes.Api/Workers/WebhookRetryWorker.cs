using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using Panoptes.Core.Entities;
using Panoptes.Core.Interfaces;
using Panoptes.Infrastructure.Services;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace Panoptes.Api.Workers
{
    public class WebhookRetryWorker : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<WebhookRetryWorker> _logger;

        public WebhookRetryWorker(IServiceProvider serviceProvider, ILogger<WebhookRetryWorker> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("WebhookRetryWorker starting...");

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

                await Task.Delay(10000, stoppingToken); // Check every 10 seconds
            }
        }

        private async Task ProcessRetries(CancellationToken stoppingToken)
        {
            using var scope = _serviceProvider.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<IAppDbContext>();
            var dispatcher = scope.ServiceProvider.GetRequiredService<IWebhookDispatcher>();

            // Find logs that need retrying
            var retryLogs = await dbContext.DeliveryLogs
                .Include(l => l.Subscription)
                .Where(l => l.Status == DeliveryStatus.Retrying 
                         && l.NextRetryAt <= DateTime.UtcNow 
                         && l.RetryCount < l.MaxRetries
                         // ✅ FIX: Check for null subscription before accessing properties
                         && l.Subscription != null 
                         && l.Subscription.IsActive
                         && !l.Subscription.IsDeleted)
                .OrderBy(l => l.NextRetryAt)
                .Take(50)
                .ToListAsync(stoppingToken);

            if (retryLogs.Any())
            {
                _logger.LogInformation("Found {Count} webhooks to retry", retryLogs.Count);

                foreach (var log in retryLogs)
                {
                    if (stoppingToken.IsCancellationRequested) break;

                    try
                    {
                        var sub = log.Subscription;
                        if (sub == null)
                        {
                            log.Status = DeliveryStatus.Failed;
                            log.ResponseBody = "Subscription deleted or not found";
                            continue;
                        }

                        // Deserialize payload safely
                        object payloadObj;
                        try 
                        {
                            if (string.IsNullOrEmpty(log.PayloadJson))
                            {
                                payloadObj = new { Error = "Empty Payload" };
                            }
                            else
                            {
                                var deserialized = System.Text.Json.JsonSerializer.Deserialize<object>(log.PayloadJson);
                                payloadObj = deserialized ?? new { Raw = log.PayloadJson };
                            }
                        }
                        catch
                        {
                            payloadObj = new { Raw = log.PayloadJson };
                        }

                        // Dispatch again
                        var resultLog = await dispatcher.DispatchAsync(sub, payloadObj);

                        log.AttemptedAt = DateTime.UtcNow;
                        log.ResponseStatusCode = resultLog.ResponseStatusCode;
                        log.ResponseBody = resultLog.ResponseBody;
                        log.LatencyMs = resultLog.LatencyMs;
                        log.RetryCount++;

                        if (resultLog.IsSuccess)
                        {
                            log.Status = DeliveryStatus.Success;
                            _logger.LogInformation("Retry SUCCESS for {Id} (Sub: {SubName})", log.Id, sub.Name);
                        }
                        else
                        {
                            // Still failed
                            if (log.RetryCount >= log.MaxRetries)
                            {
                                log.Status = DeliveryStatus.Failed;
                                _logger.LogWarning("Retry FAILED for {Id} (Sub: {SubName}) - Max retries reached", log.Id, sub.Name);
                            }
                            else
                            {
                                log.Status = DeliveryStatus.Retrying;
                                var delaySeconds = 30 * Math.Pow(2, log.RetryCount);
                                
                                if (resultLog.IsRateLimitRetry && resultLog.RetryAfterSeconds.HasValue)
                                {
                                    delaySeconds = resultLog.RetryAfterSeconds.Value;
                                }

                                log.NextRetryAt = DateTime.UtcNow.AddSeconds(delaySeconds);
                                _logger.LogWarning("Retry FAILED for {Id} (Sub: {SubName}) - Retrying in {Sec}s", log.Id, sub.Name, delaySeconds);
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Exception retrying log {Id}", log.Id);
                        log.RetryCount++;
                        log.NextRetryAt = DateTime.UtcNow.AddMinutes(5);
                    }
                }

                await dbContext.SaveChangesAsync(stoppingToken);
            }
        }
    }
}