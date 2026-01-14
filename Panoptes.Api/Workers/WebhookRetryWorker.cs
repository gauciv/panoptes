using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using Panoptes.Core.Entities;
using Panoptes.Core.Interfaces;

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
            _logger.LogInformation("WebhookRetryWorker starting");

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

                await Task.Delay(10000, stoppingToken);
            }
        }

        private async Task ProcessRetries(CancellationToken stoppingToken)
        {
            using var scope = _serviceProvider.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<IAppDbContext>();
            var dispatcher = scope.ServiceProvider.GetRequiredService<IWebhookDispatcher>();

            var retryLogs = await dbContext.DeliveryLogs
                .Include(l => l.Subscription)
                .Where(l => l.Status == DeliveryStatus.Retrying
                         && l.NextRetryAt <= DateTime.UtcNow
                         && l.RetryCount < l.MaxRetries
                         && l.Subscription != null
                         && l.Subscription.IsActive
                         && !l.Subscription.IsDeleted)
                .OrderBy(l => l.NextRetryAt)
                .Take(50)
                .ToListAsync(stoppingToken);

            if (!retryLogs.Any())
                return;

            _logger.LogInformation("Found {Count} webhooks to retry", retryLogs.Count);

            foreach (var log in retryLogs)
            {
                if (stoppingToken.IsCancellationRequested)
                    break;

                await ProcessSingleRetry(log, dispatcher, dbContext);
            }

            await dbContext.SaveChangesAsync(stoppingToken);
        }

        private async Task ProcessSingleRetry(DeliveryLog log, IWebhookDispatcher dispatcher, IAppDbContext dbContext)
        {
            try
            {
                var sub = log.Subscription;
                if (sub == null)
                {
                    log.Status = DeliveryStatus.Failed;
                    log.ResponseBody = "Subscription not found";
                    return;
                }

                var payloadObj = DeserializePayload(log.PayloadJson);
                var resultLog = await dispatcher.DispatchAsync(sub, payloadObj);

                log.AttemptedAt = DateTime.UtcNow;
                log.ResponseStatusCode = resultLog.ResponseStatusCode;
                log.ResponseBody = resultLog.ResponseBody;
                log.LatencyMs = resultLog.LatencyMs;
                log.RetryCount++;

                if (resultLog.IsSuccess)
                {
                    log.Status = DeliveryStatus.Success;
                    _logger.LogInformation("Retry success for {Id}", log.Id);
                }
                else if (log.RetryCount >= log.MaxRetries)
                {
                    log.Status = DeliveryStatus.Failed;
                    _logger.LogWarning("Retry failed for {Id} - max retries reached", log.Id);
                }
                else
                {
                    log.Status = DeliveryStatus.Retrying;
                    var delaySeconds = 30 * Math.Pow(2, log.RetryCount);

                    if (resultLog.IsRateLimitRetry && resultLog.RetryAfterSeconds.HasValue)
                        delaySeconds = resultLog.RetryAfterSeconds.Value;

                    log.NextRetryAt = DateTime.UtcNow.AddSeconds(delaySeconds);
                    _logger.LogWarning("Retry failed for {Id} - retrying in {Sec}s", log.Id, delaySeconds);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Exception retrying log {Id}", log.Id);
                log.RetryCount++;
                log.NextRetryAt = DateTime.UtcNow.AddMinutes(5);
            }
        }

        private static object DeserializePayload(string? payloadJson)
        {
            if (string.IsNullOrEmpty(payloadJson))
                return new { Error = "Empty Payload" };

            try
            {
                var deserialized = JsonSerializer.Deserialize<object>(payloadJson);
                return deserialized ?? new { Raw = payloadJson };
            }
            catch
            {
                return new { Raw = payloadJson };
            }
        }
    }
}
