using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Panoptes.Core.Entities;
using Panoptes.Core.Interfaces;
using Panoptes.Api.DTOs;
using Panoptes.Infrastructure.Services;
using System;
using System.Linq;
using System.Threading.Tasks;
using System.Net.Http;

namespace Panoptes.Api.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class SubscriptionsController : ControllerBase
    {
        private readonly IAppDbContext _dbContext;
        private readonly IWebhookDispatcher _dispatcher;
        private readonly PanoptesReducer _reducer;
        private readonly ILogger<SubscriptionsController> _logger;

        public SubscriptionsController(IAppDbContext dbContext, IWebhookDispatcher dispatcher, PanoptesReducer reducer, ILogger<SubscriptionsController> logger)
        {
            _dbContext = dbContext;
            _dispatcher = dispatcher;
            _reducer = reducer;
            _logger = logger;
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

        [HttpPost("validate-url")]
        public async Task<ActionResult<object>> ValidateWebhookUrl([FromBody] string url)
        {
            if (string.IsNullOrWhiteSpace(url) ||
                !Uri.TryCreate(url, UriKind.Absolute, out var uri) ||
                (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
            {
                return BadRequest(new { Valid = false, Message = "Invalid URL format. Must be HTTP or HTTPS." });
            }

            try
            {
                using var client = new HttpClient();
                client.Timeout = TimeSpan.FromSeconds(5);
                
                var testPayload = new { Event = "validation", Message = "Panoptes webhook URL validation test" };
                var content = new StringContent(
                    System.Text.Json.JsonSerializer.Serialize(testPayload), 
                    System.Text.Encoding.UTF8, 
                    "application/json");
                
                var response = await client.PostAsync(url, content);
                
                return Ok(new 
                { 
                    Valid = true, 
                    StatusCode = (int)response.StatusCode,
                    Message = response.IsSuccessStatusCode 
                        ? "Webhook URL is reachable and accepting requests" 
                        : $"Webhook URL responded with status {response.StatusCode}",
                    Latency = 0
                });
            }
            catch (HttpRequestException ex)
            {
                return Ok(new 
                { 
                    Valid = false, 
                    Message = $"Failed to reach webhook URL: {ex.Message}" 
                });
            }
            catch (TaskCanceledException)
            {
                return Ok(new 
                { 
                    Valid = false, 
                    Message = "Request timed out after 5 seconds. URL may be unreachable." 
                });
            }
        }

        [HttpPost]
        public async Task<ActionResult<WebhookSubscription>> CreateSubscription(WebhookSubscription subscription)
        {
            // Check for duplicate subscription name (Excluding deleted ones)
            if (!string.IsNullOrWhiteSpace(subscription.Name))
            {
                var existingSubscription = await _dbContext.WebhookSubscriptions
                    .FirstOrDefaultAsync(s => s.Name == subscription.Name && !s.IsDeleted);
                
                if (existingSubscription != null)
                {
                    return BadRequest($"A subscription with the name '{subscription.Name}' already exists. Please use a different name.");
                }
            }

            // Check for duplicate EventType and TargetUrl combination (Excluding deleted ones)
            var duplicateEventTypeAndUrl = await _dbContext.WebhookSubscriptions
                .FirstOrDefaultAsync(s => s.EventType == subscription.EventType && s.TargetUrl == subscription.TargetUrl && !s.IsDeleted);
            
            if (duplicateEventTypeAndUrl != null)
            {
                return BadRequest($"A subscription with this event type and target URL already exists. Please use a different event type or target URL.");
            }

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
            
            if (subscription.CreatedAt == default)
            {
                subscription.CreatedAt = DateTime.UtcNow;
            }

            // NEW: Ensure deleted flag is false
            subscription.IsDeleted = false;

            _dbContext.WebhookSubscriptions.Add(subscription);
            await _dbContext.SaveChangesAsync();
            
            _logger.LogInformation("Created subscription: {Name}, IsActive: {IsActive}, EventType: {EventType}", 
                subscription.Name, subscription.IsActive, subscription.EventType);

            return CreatedAtAction(nameof(GetSubscriptions), new { id = subscription.Id }, subscription);
        }

        [HttpGet]
        public async Task<ActionResult<System.Collections.Generic.IEnumerable<WebhookSubscription>>> GetSubscriptions()
        {
            try
            {
                // CHANGED: Filter out deleted subscriptions
                var subscriptions = await _dbContext.WebhookSubscriptions
                    .Where(s => !s.IsDeleted) // <--- SOFT DELETE FILTER
                    .ToListAsync();
                
                // Optimized: Calculate rate limit status with a single grouped query
                var now = DateTime.UtcNow;
                var oneMinuteAgo = now.AddMinutes(-1);
                var oneHourAgo = now.AddHours(-1);
                
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
                
                var isCatchingUp = _reducer.IsCatchingUp;
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
                        sub.WebhooksInLastMinute = 0;
                        sub.WebhooksInLastHour = 0;
                        sub.LastWebhookAt = null;
                        sub.IsRateLimited = false;
                    }
                    
                    sub.IsSyncing = isCatchingUp && sub.LastWebhookAt == null;
                }
                
                return subscriptions;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting subscriptions");
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
                    .Take(Math.Min(take ?? 50, 100))
                    .ToListAsync();

                return Ok(new LogsResponse { Logs = logs, TotalCount = totalCount });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting logs");
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
                var subscription = await _dbContext.WebhookSubscriptions.FindAsync(id);
                // We allow viewing logs for deleted subscriptions if accessed directly via ID
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
                    .Take(Math.Min(take ?? 50, 100))
                    .ToListAsync();

                var result = new LogsResponse { Logs = logs, TotalCount = totalCount };
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting subscription logs");
                return StatusCode(500, ex.Message);
            }
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<WebhookSubscription>> GetSubscription(Guid id)
        {
            try
            {
                var subscription = await _dbContext.WebhookSubscriptions.FindAsync(id);
                // CHANGED: Respect soft delete
                if (subscription == null || subscription.IsDeleted)
                {
                    return NotFound($"Subscription with ID {id} not found.");
                }

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
                
                subscription.IsSyncing = _reducer.IsCatchingUp && subscription.LastWebhookAt == null;

                return Ok(subscription);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting subscription");
                return StatusCode(500, ex.Message);
            }
        }

        [HttpPost("test/{id}")]
        public async Task<ActionResult<DeliveryLog>> TestSubscription(Guid id)
        {
            var sub = await _dbContext.WebhookSubscriptions.FindAsync(id);
            // CHANGED: Prevent testing deleted subs
            if (sub == null || sub.IsDeleted)
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

        [HttpPost("{id}/test")]
        public async Task<IActionResult> TestWebhookDirect(Guid id, [FromBody] object payload)
        {
            var subscription = await _dbContext.WebhookSubscriptions.FindAsync(id);
            // CHANGED: Prevent testing deleted subs
            if (subscription == null || subscription.IsDeleted) 
                return NotFound($"Subscription with ID {id} not found.");

            if (!Uri.TryCreate(subscription.TargetUrl, UriKind.Absolute, out var uri))
            {
                return BadRequest("Subscription has an invalid Target URL.");
            }

            try 
            {
                using var client = new HttpClient();
                client.Timeout = TimeSpan.FromSeconds(10);

                var json = System.Text.Json.JsonSerializer.Serialize(payload);
                var content = new StringContent(json, System.Text.Encoding.UTF8, "application/json");

                var response = await client.PostAsync(subscription.TargetUrl, content);
                
                var responseBody = await response.Content.ReadAsStringAsync();
                
                object? parsedBody;
                try { parsedBody = System.Text.Json.JsonSerializer.Deserialize<object>(responseBody); } 
                catch { parsedBody = responseBody; }

                return StatusCode((int)response.StatusCode, parsedBody);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Failed to connect to target URL", details = ex.Message });
            }
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<WebhookSubscription>> UpdateSubscription(Guid id, WebhookSubscription subscription)
        {
            var existingSub = await _dbContext.WebhookSubscriptions.FindAsync(id);
            // CHANGED: Check deleted flag
            if (existingSub == null || existingSub.IsDeleted)
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

            // Update allowed fields
            if (!string.IsNullOrWhiteSpace(subscription.Name))
            {
                // Check if name conflicts (excluding self and deleted)
                var duplicateSubscription = await _dbContext.WebhookSubscriptions
                    .FirstOrDefaultAsync(s => s.Name == subscription.Name && s.Id != id && !s.IsDeleted);
                
                if (duplicateSubscription != null)
                {
                    return BadRequest($"A subscription with the name '{subscription.Name}' already exists.");
                }
                
                existingSub.Name = subscription.Name;
            }
            
            if (!string.IsNullOrWhiteSpace(subscription.EventType))
            {
                existingSub.EventType = subscription.EventType;
            }

            var newEventType = !string.IsNullOrWhiteSpace(subscription.EventType) ? subscription.EventType : existingSub.EventType;
            var newTargetUrl = !string.IsNullOrWhiteSpace(subscription.TargetUrl) ? subscription.TargetUrl : existingSub.TargetUrl;
            
            var duplicateEventTypeAndUrl = await _dbContext.WebhookSubscriptions
                .FirstOrDefaultAsync(s => s.EventType == newEventType && s.TargetUrl == newTargetUrl && s.Id != id && !s.IsDeleted);
            
            if (duplicateEventTypeAndUrl != null)
            {
                return BadRequest($"A subscription with event type '{newEventType}' and target URL '{newTargetUrl}' already exists.");
            }

            existingSub.IsActive = subscription.IsActive;
            existingSub.TargetAddress = subscription.TargetAddress;
            existingSub.PolicyId = subscription.PolicyId;
            
            // NEW: Add MinimumLovelace update support
            existingSub.MinimumLovelace = subscription.MinimumLovelace;

            if (subscription.WalletAddresses != null)
            {
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

        [HttpPost("{id}/reset")]
        public async Task<ActionResult<WebhookSubscription>> ResetSubscription(Guid id)
        {
            var sub = await _dbContext.WebhookSubscriptions.FindAsync(id);
            if (sub == null || sub.IsDeleted)
            {
                return NotFound($"Subscription with ID {id} not found.");
            }

            sub.IsActive = true;
            sub.IsPaused = false;
            sub.PausedAt = null;
            sub.IsCircuitBroken = false;
            sub.CircuitBrokenReason = null;
            sub.ConsecutiveFailures = 0;
            sub.FirstFailureInWindowAt = null;
            sub.LastFailureAt = null;
            sub.IsRateLimited = false;

            _logger.LogInformation("🔄 Subscription {Name} (ID: {Id}) reset", sub.Name, sub.Id);

            await _dbContext.SaveChangesAsync();

            return Ok(sub);
        }

        [HttpPost("{id}/toggle")]
        public async Task<ActionResult<WebhookSubscription>> ToggleSubscription(Guid id, [FromQuery] bool deliverLatestOnly = false)
        {
            var sub = await _dbContext.WebhookSubscriptions.FindAsync(id);
            if (sub == null || sub.IsDeleted)
            {
                return NotFound($"Subscription with ID {id} not found.");
            }

            sub.IsActive = !sub.IsActive;
            sub.IsPaused = !sub.IsActive;
            
            if (sub.IsActive)
            {
                sub.PausedAt = null;
                var pausedEvents = await _dbContext.DeliveryLogs
                    .Where(l => l.SubscriptionId == id && l.Status == DeliveryStatus.Paused)
                    .OrderByDescending(l => l.AttemptedAt)
                    .ToListAsync();
                
                if (deliverLatestOnly && pausedEvents.Count > 0)
                {
                    var latestEvent = pausedEvents.First();
                    latestEvent.Status = DeliveryStatus.Retrying;
                    latestEvent.NextRetryAt = DateTime.UtcNow;
                    latestEvent.ResponseBody = "Subscription activated - queued for delivery (latest only)";
                    
                    foreach (var log in pausedEvents.Skip(1))
                    {
                        log.Status = DeliveryStatus.Failed;
                        log.ResponseBody = "Discarded - subscription resumed with 'deliver latest only' option";
                    }
                }
                else
                {
                    foreach (var log in pausedEvents)
                    {
                        log.Status = DeliveryStatus.Retrying;
                        log.NextRetryAt = DateTime.UtcNow;
                        log.ResponseBody = "Subscription activated - queued for delivery";
                    }
                }
            }
            else
            {
                sub.PausedAt = DateTime.UtcNow;
                _logger.LogInformation("⏸️ Subscription {Name} (ID: {Id}) paused", sub.Name, sub.Id);
            }

            await _dbContext.SaveChangesAsync();

            return Ok(sub);
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> DeleteSubscription(Guid id)
        {
            var sub = await _dbContext.WebhookSubscriptions.FindAsync(id);
            if (sub == null || sub.IsDeleted)
            {
                return NotFound($"Subscription with ID {id} not found.");
            }

            // CHANGED: Soft Delete Implementation
            // Instead of Remove(sub), we set IsDeleted = true
            sub.IsDeleted = true;
            
            // Also deactivate it so it doesn't process new events
            sub.IsActive = false;
            
            // Logs remain in DB for analytics history
            
            await _dbContext.SaveChangesAsync();

            return NoContent();
        }
    }
}