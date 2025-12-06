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
            if (subscription.Id == Guid.Empty)
            {
                subscription.Id = Guid.NewGuid();
            }
            
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
            return await _dbContext.WebhookSubscriptions.ToListAsync();
        }

        [HttpGet("/logs")]
        public async Task<ActionResult<System.Collections.Generic.IEnumerable<DeliveryLog>>> GetLogs()
        {
            var logs = await _dbContext.DeliveryLogs
                .OrderByDescending(l => l.AttemptedAt)
                .Take(50)
                .ToListAsync();

            return Ok(logs);
        }

        [HttpPost("test/{id}")]
        public async Task<ActionResult> TestSubscription(Guid id)
        {
            var sub = await _dbContext.WebhookSubscriptions.FindAsync(id);
            if (sub == null)
            {
                return NotFound();
            }

            var fakePayload = new { Message = "This is a test event", Timestamp = DateTime.UtcNow };
            var log = await _dispatcher.DispatchAsync(sub, fakePayload);

            _dbContext.DeliveryLogs.Add(log);
            await _dbContext.SaveChangesAsync();

            return Ok(log);
        }
    }
}
