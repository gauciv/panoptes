using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Panoptes.Core.Entities;
using Panoptes.Core.Interfaces;
using Panoptes.Api.DTOs;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace Panoptes.Api.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class SubscriptionsController : ControllerBase
    {
        private readonly IAppDbContext _dbContext;
        private readonly IWebhookDispatcher _dispatcher;

        public SubscriptionsController(IAppDbContext dbContext, IWebhookDispatcher dispatcher)
        {
            _dbContext = dbContext;
            _dispatcher = dispatcher;
        }

        /// <summary>
        /// Validates Cardano addresses (bech32 format starting with addr1, or hex format).
        /// Basic validation - checks format but doesn't verify checksum.
        /// </summary>
        private bool IsValidCardanoAddress(string address)
        {
            if (string.IsNullOrWhiteSpace(address))
                return false;
            
            // Bech32 mainnet address
            if (address.StartsWith("addr1", StringComparison.OrdinalIgnoreCase))
                return address.Length >= 50 && address.Length <= 110;
            
            // Bech32 testnet address
            if (address.StartsWith("addr_test1", StringComparison.OrdinalIgnoreCase))
                return address.Length >= 50 && address.Length <= 110;
            
            // Hex format (56 bytes = 112 hex chars for payment address)
            if (address.All(c => "0123456789abcdefABCDEF".Contains(c)))
                return address.Length >= 56 && address.Length <= 120;
            
            return false;
        }

        [HttpPost]
        public async Task<ActionResult<WebhookSubscription>> CreateSubscription(WebhookSubscription subscription)
        {
            // Validate TargetUrl
            if (string.IsNullOrWhiteSpace(subscription.TargetUrl) ||
                !Uri.TryCreate(subscription.TargetUrl, UriKind.Absolute, out var uri) ||
                (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
            {
                return BadRequest("Invalid TargetUrl. Must be a valid HTTP or HTTPS URL.");
            }

            // Validate wallet addresses if provided
            if (subscription.WalletAddresses != null && subscription.WalletAddresses.Any())
            {
                var invalidAddresses = subscription.WalletAddresses
                    .Where(addr => !IsValidCardanoAddress(addr))
                    .ToList();
                
                if (invalidAddresses.Any())
                {
                    return BadRequest($"Invalid Cardano address(es): {string.Join(", ", invalidAddresses)}");
                }
            }

            // Auto-generate ID if not provided
            if (subscription.Id == Guid.Empty)
            {
                subscription.Id = Guid.NewGuid();
            }
            
            // Auto-generate SecretKey (ignore any client-provided value)
            subscription.SecretKey = Guid.NewGuid().ToString("N");
            
            // Default to active if not specified
            // Note: bool defaults to false, but frontend sends true explicitly
            // This is kept for clarity
            
            if (subscription.CreatedAt == default)
            {
                subscription.CreatedAt = DateTime.UtcNow;
            }

            _dbContext.WebhookSubscriptions.Add(subscription);
            await _dbContext.SaveChangesAsync();
            
            Console.WriteLine($"Created subscription: {subscription.Name}, IsActive: {subscription.IsActive}, EventType: {subscription.EventType}");

            return CreatedAtAction(nameof(GetSubscriptions), new { id = subscription.Id }, subscription);
        }

        [HttpGet]
        public async Task<ActionResult<System.Collections.Generic.IEnumerable<WebhookSubscription>>> GetSubscriptions()
        {
            try
            {
                var subscriptions = await _dbContext.WebhookSubscriptions.ToListAsync();
                
                // Optimized: Calculate rate limit status with a single grouped query
                var now = DateTime.UtcNow;
                var oneMinuteAgo = now.AddMinutes(-1);
                var oneHourAgo = now.AddHours(-1);
                
                // Get all rate limit stats in one query
                var rateLimitStats = await _dbContext.DeliveryLogs
                    .Where(l => l.AttemptedAt >= oneHourAgo)
                    .GroupBy(l => l.SubscriptionId)
                    .Select(g => new
                    {
                        SubscriptionId = g.Key,
                        InLastMinute = g.Count(l => l.AttemptedAt >= oneMinuteAgo),
                        InLastHour = g.Count(),
                        LastAttempt = g.Max(l => l.AttemptedAt)
                    })
                    .ToDictionaryAsync(x => x.SubscriptionId);
                
                // Apply stats to subscriptions
                foreach (var sub in subscriptions)
                {
                    if (rateLimitStats.TryGetValue(sub.Id, out var stats))
                    {
                        sub.WebhooksInLastMinute = stats.InLastMinute;
                        sub.WebhooksInLastHour = stats.InLastHour;
                        sub.LastWebhookAt = stats.LastAttempt;
                        sub.IsRateLimited = (sub.MaxWebhooksPerMinute > 0 && stats.InLastMinute >= sub.MaxWebhooksPerMinute) ||
                                           (sub.MaxWebhooksPerHour > 0 && stats.InLastHour >= sub.MaxWebhooksPerHour);
                    }
                    else
                    {
                        // No logs in the time window
                        sub.WebhooksInLastMinute = 0;
                        sub.WebhooksInLastHour = 0;
                        sub.LastWebhookAt = null;
                        sub.IsRateLimited = false;
                    }
                }
                
                return subscriptions;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting subscriptions: {ex}");
                return StatusCode(500, ex.Message);
            }
        }

        [HttpGet("/logs")]
        public async Task<ActionResult<LogsResponse>> GetLogs(
            [FromQuery] int? skip = 0,
            [FromQuery] int? take = 50)
        {
            try
            {
                var totalCount = await _dbContext.DeliveryLogs.CountAsync();
                var logs = await _dbContext.DeliveryLogs
                    .OrderByDescending(l => l.AttemptedAt)
                    .Skip(skip ?? 0)
                    .Take(Math.Min(take ?? 50, 100)) // Max 100 per request
                    .ToListAsync();

                return Ok(new LogsResponse { Logs = logs, TotalCount = totalCount });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting logs: {ex}");
                return StatusCode(500, ex.Message);
            }
        }

        [HttpGet("{id}/logs")]
        public async Task<ActionResult<LogsResponse>> GetSubscriptionLogs(
            Guid id,
            [FromQuery] int? skip = 0,
            [FromQuery] int? take = 50)
        {
            try
            {
                // Verify subscription exists
                var subscription = await _dbContext.WebhookSubscriptions.FindAsync(id);
                if (subscription == null)
                {
                    return NotFound($"Subscription with ID {id} not found.");
                }

                var totalCount = await _dbContext.DeliveryLogs
                    .Where(l => l.SubscriptionId == id)
                    .CountAsync();

                var logs = await _dbContext.DeliveryLogs
                    .Where(l => l.SubscriptionId == id)
                    .OrderByDescending(l => l.AttemptedAt)
                    .Skip(skip ?? 0)
                    .Take(Math.Min(take ?? 50, 100)) // Max 100 per request
                    .ToListAsync();

                var result = new LogsResponse { Logs = logs, TotalCount = totalCount };
                Console.WriteLine($"[GetSubscriptionLogs] Returning {logs.Count} logs out of {totalCount} total");
                return Ok(result);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting subscription logs: {ex}");
                return StatusCode(500, ex.Message);
            }
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<WebhookSubscription>> GetSubscription(Guid id)
        {
            try
            {
                var subscription = await _dbContext.WebhookSubscriptions.FindAsync(id);
                if (subscription == null)
                {
                    return NotFound($"Subscription with ID {id} not found.");
                }

                // Calculate rate limit status (optimized with single query)
                var now = DateTime.UtcNow;
                var oneMinuteAgo = now.AddMinutes(-1);
                var oneHourAgo = now.AddHours(-1);
                
                var stats = await _dbContext.DeliveryLogs
                    .Where(l => l.SubscriptionId == subscription.Id && l.AttemptedAt >= oneHourAgo)
                    .GroupBy(l => l.SubscriptionId)
                    .Select(g => new
                    {
                        InLastMinute = g.Count(l => l.AttemptedAt >= oneMinuteAgo),
                        InLastHour = g.Count(),
                        LastAttempt = g.Max(l => l.AttemptedAt)
                    })
                    .FirstOrDefaultAsync();
                
                if (stats != null)
                {
                    subscription.WebhooksInLastMinute = stats.InLastMinute;
                    subscription.WebhooksInLastHour = stats.InLastHour;
                    subscription.LastWebhookAt = stats.LastAttempt;
                    subscription.IsRateLimited = (subscription.MaxWebhooksPerMinute > 0 && stats.InLastMinute >= subscription.MaxWebhooksPerMinute) ||
                                               (subscription.MaxWebhooksPerHour > 0 && stats.InLastHour >= subscription.MaxWebhooksPerHour);
                }
                else
                {
                    subscription.WebhooksInLastMinute = 0;
                    subscription.WebhooksInLastHour = 0;
                    subscription.LastWebhookAt = null;
                    subscription.IsRateLimited = false;
                }

                return Ok(subscription);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting subscription: {ex}");
                return StatusCode(500, ex.Message);
            }
        }

        [HttpPost("test/{id}")]
        public async Task<ActionResult<DeliveryLog>> TestSubscription(Guid id)
        {
            var sub = await _dbContext.WebhookSubscriptions.FindAsync(id);
            if (sub == null)
            {
                return NotFound($"Subscription with ID {id} not found.");
            }

            var testPayload = new 
            { 
                Event = "test",
                Message = "This is a test event from Panoptes", 
                SubscriptionId = sub.Id,
                SubscriptionName = sub.Name,
                Timestamp = DateTime.UtcNow 
            };
            
            var log = await _dispatcher.DispatchAsync(sub, testPayload);
            
            // Set delivery status based on response
            if (log.ResponseStatusCode >= 200 && log.ResponseStatusCode < 300)
            {
                log.Status = DeliveryStatus.Success;
            }
            else
            {
                log.Status = DeliveryStatus.Retrying;
                log.NextRetryAt = DateTime.UtcNow.AddSeconds(30);
            }

            _dbContext.DeliveryLogs.Add(log);
            await _dbContext.SaveChangesAsync();

            return Ok(log);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<WebhookSubscription>> UpdateSubscription(Guid id, WebhookSubscription subscription)
        {
            var existingSub = await _dbContext.WebhookSubscriptions.FindAsync(id);
            if (existingSub == null)
            {
                return NotFound($"Subscription with ID {id} not found.");
            }

            // Validate TargetUrl if provided
            if (!string.IsNullOrWhiteSpace(subscription.TargetUrl))
            {
                if (!Uri.TryCreate(subscription.TargetUrl, UriKind.Absolute, out var uri) ||
                    (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
                {
                    return BadRequest("Invalid TargetUrl. Must be a valid HTTP or HTTPS URL.");
                }
                existingSub.TargetUrl = subscription.TargetUrl;
            }

            // Update allowed fields (SecretKey is NOT updatable by client)
            if (!string.IsNullOrWhiteSpace(subscription.Name))
            {
                existingSub.Name = subscription.Name;
            }
            
            if (!string.IsNullOrWhiteSpace(subscription.EventType))
            {
                existingSub.EventType = subscription.EventType;
            }

            existingSub.IsActive = subscription.IsActive;
            existingSub.TargetAddress = subscription.TargetAddress;
            existingSub.PolicyId = subscription.PolicyId;

            // Update wallet address filter if provided
            if (subscription.WalletAddresses != null)
            {
                // Validate addresses
                var invalidAddresses = subscription.WalletAddresses
                    .Where(addr => !string.IsNullOrWhiteSpace(addr) && !IsValidCardanoAddress(addr))
                    .ToList();
                
                if (invalidAddresses.Any())
                {
                    return BadRequest($"Invalid Cardano address(es): {string.Join(", ", invalidAddresses)}");
                }
                
                existingSub.WalletAddresses = subscription.WalletAddresses;
            }

            await _dbContext.SaveChangesAsync();

            return Ok(existingSub);
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> DeleteSubscription(Guid id)
        {
            var sub = await _dbContext.WebhookSubscriptions.FindAsync(id);
            if (sub == null)
            {
                return NotFound($"Subscription with ID {id} not found.");
            }

            _dbContext.WebhookSubscriptions.Remove(sub);
            await _dbContext.SaveChangesAsync();

            return NoContent();
        }
    }
}
