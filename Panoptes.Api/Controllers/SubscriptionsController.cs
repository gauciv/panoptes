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
            
            if (subscription.CreatedAt == default)
            {
                subscription.CreatedAt = DateTime.UtcNow;
            }

            _dbContext.WebhookSubscriptions.Add(subscription);
            await _dbContext.SaveChangesAsync();

            return CreatedAtAction(nameof(GetSubscriptions), new { id = subscription.Id }, subscription);
        }

        [HttpGet]
        public async Task<ActionResult<System.Collections.Generic.IEnumerable<WebhookSubscription>>> GetSubscriptions()
        {
            try
            {
                return await _dbContext.WebhookSubscriptions.ToListAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting subscriptions: {ex}");
                return StatusCode(500, ex.Message);
            }
        }

        [HttpGet("/logs")]
        public async Task<ActionResult<System.Collections.Generic.IEnumerable<DeliveryLog>>> GetLogs()
        {
            try
            {
                var logs = await _dbContext.DeliveryLogs
                    .OrderByDescending(l => l.AttemptedAt)
                    .Take(50)
                    .ToListAsync();

                return Ok(logs);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting logs: {ex}");
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

            _dbContext.DeliveryLogs.Add(log);
            await _dbContext.SaveChangesAsync();

            return Ok(log);
        }
    }
}
