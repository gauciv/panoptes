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
    public class SubscriptionsController : ControllerBase
    {
        private readonly IAppDbContext _dbContext;
        private readonly IWebhookDispatcher _dispatcher;

        public SubscriptionsController(IAppDbContext dbContext, IWebhookDispatcher dispatcher)
        {
            _dbContext = dbContext;
            _dispatcher = dispatcher;
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
                
                // Calculate rate limit status for each subscription
                var now = DateTime.UtcNow;
                foreach (var sub in subscriptions)
                {
                    var logsInLastMinute = await _dbContext.DeliveryLogs
                        .Where(l => l.SubscriptionId == sub.Id && l.AttemptedAt >= now.AddMinutes(-1))
                        .CountAsync();
                    
                    var logsInLastHour = await _dbContext.DeliveryLogs
                        .Where(l => l.SubscriptionId == sub.Id && l.AttemptedAt >= now.AddHours(-1))
                        .CountAsync();
                    
                    var lastLog = await _dbContext.DeliveryLogs
                        .Where(l => l.SubscriptionId == sub.Id)
                        .OrderByDescending(l => l.AttemptedAt)
                        .FirstOrDefaultAsync();
                    
                    sub.WebhooksInLastMinute = logsInLastMinute;
                    sub.WebhooksInLastHour = logsInLastHour;
                    sub.LastWebhookAt = lastLog?.AttemptedAt;
                    sub.IsRateLimited = (sub.MaxWebhooksPerMinute > 0 && logsInLastMinute >= sub.MaxWebhooksPerMinute) ||
                                       (sub.MaxWebhooksPerHour > 0 && logsInLastHour >= sub.MaxWebhooksPerHour);
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
        public async Task<ActionResult> GetLogs(
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

                return Ok(new { logs, totalCount });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting logs: {ex}");
                return StatusCode(500, ex.Message);
            }
        }

        [HttpGet("{id}/logs")]
        public async Task<ActionResult> GetSubscriptionLogs(
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

                return Ok(new { logs, totalCount });
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

                // Calculate rate limit status
                var now = DateTime.UtcNow;
                var logsInLastMinute = await _dbContext.DeliveryLogs
                    .Where(l => l.SubscriptionId == subscription.Id && l.AttemptedAt >= now.AddMinutes(-1))
                    .CountAsync();
                
                var logsInLastHour = await _dbContext.DeliveryLogs
                    .Where(l => l.SubscriptionId == subscription.Id && l.AttemptedAt >= now.AddHours(-1))
                    .CountAsync();
                
                var lastLog = await _dbContext.DeliveryLogs
                    .Where(l => l.SubscriptionId == subscription.Id)
                    .OrderByDescending(l => l.AttemptedAt)
                    .FirstOrDefaultAsync();
                
                subscription.WebhooksInLastMinute = logsInLastMinute;
                subscription.WebhooksInLastHour = logsInLastHour;
                subscription.LastWebhookAt = lastLog?.AttemptedAt;
                subscription.IsRateLimited = (subscription.MaxWebhooksPerMinute > 0 && logsInLastMinute >= subscription.MaxWebhooksPerMinute) ||
                                           (subscription.MaxWebhooksPerHour > 0 && logsInLastHour >= subscription.MaxWebhooksPerHour);

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
