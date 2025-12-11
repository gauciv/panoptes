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
                    await CheckRateLimitRecovery(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error processing webhook retries");
                }

                await Task.Delay(_checkInterval, stoppingToken);
            }
        }
        
        /// <summary>
        /// Check rate-limited subscriptions and auto-recover them when usage drops below threshold
        /// </summary>
        private async Task CheckRateLimitRecovery(CancellationToken stoppingToken)
        {
            using var scope = _serviceProvider.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<IAppDbContext>();
            
            // Find rate-limited subscriptions
            var rateLimitedSubs = await dbContext.WebhookSubscriptions
                .Where(s => s.IsRateLimited)
                .ToListAsync(stoppingToken);
            
            if (!rateLimitedSubs.Any()) return;
            
            var now = DateTime.UtcNow;
            var oneMinuteAgo = now.AddMinutes(-1);
            var oneHourAgo = now.AddHours(-1);
            
            foreach (var sub in rateLimitedSubs)
            {
                if (stoppingToken.IsCancellationRequested) break;
                
                // Calculate current usage from delivery logs
                var recentLogs = await dbContext.DeliveryLogs
                    .Where(l => l.SubscriptionId == sub.Id && l.AttemptedAt >= oneHourAgo)
                    .ToListAsync(stoppingToken);
                
                var webhooksInLastMinute = recentLogs.Count(l => l.AttemptedAt >= oneMinuteAgo);
                var webhooksInLastHour = recentLogs.Count;
                
                // Check if usage has dropped below 80% of limits (with some buffer)
                var minuteThreshold = sub.MaxWebhooksPerMinute > 0 ? sub.MaxWebhooksPerMinute * 0.8 : int.MaxValue;
                var hourThreshold = sub.MaxWebhooksPerHour > 0 ? sub.MaxWebhooksPerHour * 0.8 : int.MaxValue;
                
                var isUnderMinuteLimit = webhooksInLastMinute < minuteThreshold;
                var isUnderHourLimit = webhooksInLastHour < hourThreshold;
                
                if (isUnderMinuteLimit && isUnderHourLimit)
                {
                    // Auto-recover: clear rate limit flag
                    sub.IsRateLimited = false;
                    await dbContext.SaveChangesAsync(stoppingToken);
                    
                    _logger.LogInformation(
                        "✅ Auto-recovered subscription {Name} (ID: {Id}) - Rate usage now at {MinPct}% per min, {HourPct}% per hour",
                        sub.Name, sub.Id,
                        sub.MaxWebhooksPerMinute > 0 ? (webhooksInLastMinute * 100 / sub.MaxWebhooksPerMinute) : 0,
                        sub.MaxWebhooksPerHour > 0 ? (webhooksInLastHour * 100 / sub.MaxWebhooksPerHour) : 0);
                }
            }
        }

        private async Task ProcessRetries(CancellationToken stoppingToken)
        {
            using var scope = _serviceProvider.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<IAppDbContext>();
            var dispatcher = scope.ServiceProvider.GetRequiredService<IWebhookDispatcher>();

            // Find logs that need retry, joining with subscriptions to filter properly
            // IMPORTANT: Only process logs for active, non-disabled subscriptions
            var logsToRetry = await dbContext.DeliveryLogs
                .Include(l => l.Subscription)
                .Where(l => l.Status == DeliveryStatus.Retrying 
                         && l.NextRetryAt != null 
                         && l.NextRetryAt <= DateTime.UtcNow
                         && l.RetryCount < l.MaxRetries
                         && l.Subscription != null
                         && l.Subscription.IsActive
                         && !l.Subscription.IsRateLimited
                         && !l.Subscription.IsCircuitBroken)
                .OrderBy(l => l.NextRetryAt)
                .Take(10)
                .ToListAsync(stoppingToken);

            if (!logsToRetry.Any())
            {
                return; // Don't log if nothing to do
            }

            _logger.LogInformation("Processing {Count} webhook retries", logsToRetry.Count);

            foreach (var log in logsToRetry)
            {
                if (stoppingToken.IsCancellationRequested) break;
                
                if (log.Subscription == null)
                {
                    log.Status = DeliveryStatus.Failed;
                    log.ResponseBody = "Subscription not found";
                    continue;
                }
                
                // Skip paused (inactive) subscriptions - their logs will be processed when activated
                if (!log.Subscription.IsActive)
                {
                    _logger.LogDebug("Skipping retry for paused subscription {SubId}", log.SubscriptionId);
                    continue;
                }
                
                // Skip disabled subscriptions (rate limited or circuit broken)
                if (log.Subscription.IsRateLimited || log.Subscription.IsCircuitBroken)
                {
                    _logger.LogDebug("Skipping retry for disabled subscription {SubId} (RateLimited={RL}, CircuitBroken={CB})", 
                        log.SubscriptionId, log.Subscription.IsRateLimited, log.Subscription.IsCircuitBroken);
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
                        
                        // Reset circuit breaker on success
                        log.Subscription.ConsecutiveFailures = 0;
                        log.Subscription.FirstFailureInWindowAt = null;
                        log.Subscription.LastFailureAt = null;
                        
                        _logger.LogInformation("Webhook retry succeeded for log {LogId}", log.Id);
                    }
                    else if (log.RetryCount >= log.MaxRetries)
                    {
                        log.Status = DeliveryStatus.Failed;
                        log.NextRetryAt = null;
                        
                        // Track failure for circuit breaker
                        TrackFailure(log.Subscription, result.ResponseStatusCode, dbContext);
                        
                        _logger.LogWarning("Webhook retry exhausted for log {LogId} after {RetryCount} attempts", 
                            log.Id, log.RetryCount);
                    }
                    else
                    {
                        // Calculate backoff based on response type
                        int backoffSeconds;
                        
                        if (result.IsRateLimited)
                        {
                            // Use Retry-After header if available, otherwise exponential backoff
                            if (result.RetryAfterSeconds.HasValue)
                            {
                                backoffSeconds = result.RetryAfterSeconds.Value;
                                _logger.LogInformation("Using Retry-After header: {Seconds}s for log {LogId}", 
                                    backoffSeconds, log.Id);
                            }
                            else
                            {
                                // Exponential backoff for 429: 30s, 2min, 10min, 1hr
                                backoffSeconds = log.RetryCount switch
                                {
                                    0 => 30,        // First retry: 30 seconds
                                    1 => 120,       // Second retry: 2 minutes
                                    2 => 600,       // Third retry: 10 minutes
                                    _ => 3600       // Fourth+ retry: 1 hour
                                };
                            }
                            
                            log.IsRateLimitRetry = true;
                        }
                        else
                        {
                            // Standard exponential backoff for other errors: 30s, 60s, 120s
                            backoffSeconds = (int)(Math.Pow(2, log.RetryCount) * 30);
                        }
                        
                        log.NextRetryAt = DateTime.UtcNow.AddSeconds(backoffSeconds);
                        _logger.LogInformation("Webhook retry {RetryCount} failed (status {Status}) for log {LogId}, next retry in {Seconds}s at {NextRetry}", 
                            log.RetryCount, result.ResponseStatusCode, log.Id, backoffSeconds, log.NextRetryAt);
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

        /// <summary>
        /// Track consecutive failures and implement circuit breaker logic
        /// </summary>
        private void TrackFailure(WebhookSubscription subscription, int statusCode, IAppDbContext dbContext)
        {
            subscription.ConsecutiveFailures++;
            subscription.LastFailureAt = DateTime.UtcNow;
            
            // Start tracking failure window on first failure
            if (subscription.FirstFailureInWindowAt == null)
            {
                subscription.FirstFailureInWindowAt = DateTime.UtcNow;
            }

            // Circuit Breaker Rule 1: Quick trigger for unreachable URLs (status 0 = network/timeout errors)
            if (statusCode == 0 && subscription.ConsecutiveFailures >= 5)
            {
                subscription.IsActive = false;
                subscription.IsCircuitBroken = true;
                subscription.CircuitBrokenReason = $"Webhook URL is unreachable - failed {subscription.ConsecutiveFailures} consecutive times with network/timeout errors";
                
                _logger.LogWarning(
                    "⚠️ CIRCUIT BREAKER: Subscription {SubId} ({Name}) auto-paused - URL unreachable after {Failures} attempts",
                    subscription.Id, subscription.Name, subscription.ConsecutiveFailures);
                
                return;
            }

            // Circuit Breaker Rule 2: 15 consecutive failures for HTTP errors
            if (subscription.ConsecutiveFailures >= 15)
            {
                subscription.IsActive = false;
                subscription.IsCircuitBroken = true;
                subscription.CircuitBrokenReason = $"Circuit breaker triggered: {subscription.ConsecutiveFailures} consecutive failures (last status: {statusCode})";
                
                _logger.LogWarning(
                    "⚠️ CIRCUIT BREAKER: Subscription {SubId} ({Name}) auto-paused after {Failures} consecutive failures",
                    subscription.Id, subscription.Name, subscription.ConsecutiveFailures);
                
                return;
            }

            // Circuit Breaker Rule 3: Failures for 12 hours straight
            if (subscription.FirstFailureInWindowAt.HasValue)
            {
                var failureDuration = DateTime.UtcNow - subscription.FirstFailureInWindowAt.Value;
                
                if (failureDuration.TotalHours >= 12)
                {
                    subscription.IsActive = false;
                    subscription.IsCircuitBroken = true;
                    subscription.CircuitBrokenReason = $"Circuit breaker triggered: Continuous failures for {failureDuration.TotalHours:F1}+ hours ({subscription.ConsecutiveFailures} failures)";
                    
                    _logger.LogWarning(
                        "⚠️ CIRCUIT BREAKER: Subscription {SubId} ({Name}) auto-paused after {Hours:F1} hours of continuous failures",
                        subscription.Id, subscription.Name, failureDuration.TotalHours);
                }
            }
        }
    }
}
