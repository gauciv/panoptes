using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Panoptes.Core.Entities;
using Panoptes.Core.Interfaces;
using Panoptes.Api.DTOs;
using Panoptes.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization; // Required for [Authorize]
using System.Security.Claims; // Required for User.FindFirst

namespace Panoptes.Api.Controllers
{
    [ApiController]
    [Route("[controller]")]
    [Authorize] // 🔒 LOCKS THE ENTIRE CONTROLLER
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

        // --- 🔐 SECURITY HELPER ---
        private string GetCurrentUserId()
        {
            // Tries to find the 'sub' claim (standard for Cognito/JWT)
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                         ?? User.FindFirst("sub")?.Value;
                         
            if (string.IsNullOrEmpty(userId))
            {
                throw new UnauthorizedAccessException("User ID claim not found in token.");
            }
            return userId;
        }

        private bool IsValidCardanoAddress(string address)
        {
            if (string.IsNullOrWhiteSpace(address)) return false;
            
            // Bech32
            if (address.StartsWith("addr1", StringComparison.OrdinalIgnoreCase) || 
                address.StartsWith("addr_test1", StringComparison.OrdinalIgnoreCase))
                return address.Length >= 50 && address.Length <= 110;
            
            // Hex
            if (address.All(c => "0123456789abcdefABCDEF".Contains(c)))
                return address.Length >= 56 && address.Length <= 120;
            
            return false;
        }

        [HttpPost("validate-url")]
        public async Task<ActionResult<object>> ValidateWebhookUrl([FromBody] string url)
        {
            // Utility endpoint - no strict user data access, but requires auth due to controller attribute
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
            catch (Exception ex)
            {
                return Ok(new { Valid = false, Message = $"Failed to reach webhook URL: {ex.Message}" });
            }
        }

        [HttpPost]
        public async Task<ActionResult<WebhookSubscription>> CreateSubscription(WebhookSubscription subscription)
        {
            var userId = GetCurrentUserId(); // Get User

            // Validate duplicate name FOR THIS USER ONLY
            if (!string.IsNullOrWhiteSpace(subscription.Name))
            {
                var existingSubscription = await _dbContext.WebhookSubscriptions
                    .FirstOrDefaultAsync(s => s.Name == subscription.Name && !s.IsDeleted && s.UserId == userId);
                
                if (existingSubscription != null)
                {
                    return BadRequest($"You already have a subscription named '{subscription.Name}'.");
                }
            }

            // Validate duplicate Event/URL FOR THIS USER ONLY
            var duplicateEventTypeAndUrl = await _dbContext.WebhookSubscriptions
                .FirstOrDefaultAsync(s => s.EventType == subscription.EventType 
                                       && s.TargetUrl == subscription.TargetUrl 
                                       && !s.IsDeleted 
                                       && s.UserId == userId);
            
            if (duplicateEventTypeAndUrl != null)
            {
                return BadRequest($"You already have a subscription for this event type and URL.");
            }

            if (string.IsNullOrWhiteSpace(subscription.TargetUrl) ||
                !Uri.TryCreate(subscription.TargetUrl, UriKind.Absolute, out var uri) ||
                (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
            {
                return BadRequest("Invalid TargetUrl.");
            }

            if (subscription.WalletAddresses != null && subscription.WalletAddresses.Any())
            {
                var invalidAddresses = subscription.WalletAddresses
                    .Where(addr => !IsValidCardanoAddress(addr))
                    .ToList();
                
                if (invalidAddresses.Any()) return BadRequest($"Invalid addresses: {string.Join(", ", invalidAddresses)}");
            }

            subscription.Id = Guid.NewGuid();
            subscription.SecretKey = Guid.NewGuid().ToString("N");
            subscription.CreatedAt = DateTime.UtcNow;
            subscription.IsDeleted = false;
            subscription.UserId = userId; // 🔒 ASSIGN OWNERSHIP

            _dbContext.WebhookSubscriptions.Add(subscription);
            await _dbContext.SaveChangesAsync();
            
            return CreatedAtAction(nameof(GetSubscriptions), new { id = subscription.Id }, subscription);
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<WebhookSubscription>>> GetSubscriptions()
        {
            try
            {
                var userId = GetCurrentUserId(); // Get User

                // 🔒 FILTER BY USER ID
                var subscriptions = await _dbContext.WebhookSubscriptions
                    .Where(s => !s.IsDeleted && s.UserId == userId)
                    .ToListAsync();
                
                var now = DateTime.UtcNow;
                var oneHourAgo = now.AddHours(-1);
                
                // Get logs only for user's subscriptions
                var userSubIds = subscriptions.Select(s => s.Id).ToList();

                var rateLimitStats = await _dbContext.DeliveryLogs
                    .Where(l => userSubIds.Contains(l.SubscriptionId) && l.AttemptedAt >= oneHourAgo)
                    .GroupBy(l => l.SubscriptionId)
                    .Select(g => new
                    {
                        SubscriptionId = g.Key,
                        InLastMinute = g.Count(l => l.AttemptedAt >= now.AddMinutes(-1)),
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
                var userId = GetCurrentUserId(); // Get User

                // 🔒 FILTER LOGS BY USER OWNERSHIP via Navigation Property or Join
                // Assuming Navigation Property 'Subscription' exists on DeliveryLog. 
                // If not, we query based on matching Subscription IDs.
                
                var query = _dbContext.DeliveryLogs
                    .Include(l => l.Subscription)
                    .Where(l => l.Subscription != null && 
                                l.Subscription.UserId == userId && 
                                !l.Subscription.IsDeleted);

                var totalCount = await query.CountAsync();
                
                var logs = await query
                    .OrderByDescending(l => l.AttemptedAt)
                    .Skip(skip ?? 0)
                    .Take(Math.Min(take ?? 50, 100))
                    .ToListAsync();

                // Sanitize circular reference for JSON if necessary (depends on JSON settings)
                foreach(var log in logs) { log.Subscription = null; } 

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
                var userId = GetCurrentUserId();

                // 🔒 VERIFY OWNERSHIP
                var subscription = await _dbContext.WebhookSubscriptions
                    .FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId);

                if (subscription == null)
                {
                    return NotFound($"Subscription not found.");
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

                return Ok(new LogsResponse { Logs = logs, TotalCount = totalCount });
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
                var userId = GetCurrentUserId();

                // 🔒 VERIFY OWNERSHIP
                var subscription = await _dbContext.WebhookSubscriptions
                    .FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId);

                if (subscription == null || subscription.IsDeleted)
                {
                    return NotFound($"Subscription not found.");
                }

                // Stats calculation (same as before)
                var now = DateTime.UtcNow;
                var oneHourAgo = now.AddHours(-1);
                
                var stats = await _dbContext.DeliveryLogs
                    .Where(l => l.SubscriptionId == subscription.Id && l.AttemptedAt >= oneHourAgo)
                    .GroupBy(l => l.SubscriptionId)
                    .Select(g => new
                    {
                        InLastMinute = g.Count(l => l.AttemptedAt >= now.AddMinutes(-1)),
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
            var userId = GetCurrentUserId();

            // 🔒 VERIFY OWNERSHIP
            var sub = await _dbContext.WebhookSubscriptions
                .FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId);

            if (sub == null || sub.IsDeleted) return NotFound($"Subscription not found.");

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
                log.Status = DeliveryStatus.Success;
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
            var userId = GetCurrentUserId();

            // 🔒 VERIFY OWNERSHIP
            var subscription = await _dbContext.WebhookSubscriptions
                .FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId);

            if (subscription == null || subscription.IsDeleted) return NotFound($"Subscription not found.");

            // Direct HTTP test logic
            if (!Uri.TryCreate(subscription.TargetUrl, UriKind.Absolute, out var uri))
                return BadRequest("Invalid Target URL.");

            try 
            {
                using var client = new HttpClient();
                client.Timeout = TimeSpan.FromSeconds(10);
                var content = new StringContent(
                    System.Text.Json.JsonSerializer.Serialize(payload), 
                    System.Text.Encoding.UTF8, "application/json");

                var response = await client.PostAsync(subscription.TargetUrl, content);
                var responseBody = await response.Content.ReadAsStringAsync();
                
                object? parsedBody;
                try { parsedBody = System.Text.Json.JsonSerializer.Deserialize<object>(responseBody); } 
                catch { parsedBody = responseBody; }

                return StatusCode((int)response.StatusCode, parsedBody);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Failed to connect", details = ex.Message });
            }
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<WebhookSubscription>> UpdateSubscription(Guid id, WebhookSubscription subscription)
        {
            var userId = GetCurrentUserId();

            // 🔒 VERIFY OWNERSHIP
            var existingSub = await _dbContext.WebhookSubscriptions
                .FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId);

            if (existingSub == null || existingSub.IsDeleted) return NotFound($"Subscription not found.");

            if (!string.IsNullOrWhiteSpace(subscription.TargetUrl))
            {
                if (!Uri.TryCreate(subscription.TargetUrl, UriKind.Absolute, out var uri) ||
                    (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
                {
                    return BadRequest("Invalid TargetUrl.");
                }
                existingSub.TargetUrl = subscription.TargetUrl;
            }

            if (!string.IsNullOrWhiteSpace(subscription.Name))
            {
                // Check name conflict FOR THIS USER
                var duplicate = await _dbContext.WebhookSubscriptions
                    .FirstOrDefaultAsync(s => s.Name == subscription.Name && s.Id != id && !s.IsDeleted && s.UserId == userId);
                
                if (duplicate != null) return BadRequest($"Subscription name '{subscription.Name}' already exists.");
                
                existingSub.Name = subscription.Name;
            }
            
            if (!string.IsNullOrWhiteSpace(subscription.EventType))
                existingSub.EventType = subscription.EventType;

            // Update other fields
            existingSub.IsActive = subscription.IsActive;
            existingSub.TargetAddress = subscription.TargetAddress;
            existingSub.PolicyId = subscription.PolicyId;
            existingSub.MinimumLovelace = subscription.MinimumLovelace;
            existingSub.CustomHeaders = subscription.CustomHeaders;
            existingSub.WalletAddresses = subscription.WalletAddresses; // Validation logic assumed handled or added here if needed

            await _dbContext.SaveChangesAsync();

            return Ok(existingSub);
        }

        [HttpPost("{id}/reset")]
        public async Task<ActionResult<WebhookSubscription>> ResetSubscription(Guid id)
        {
            var userId = GetCurrentUserId();
            var sub = await _dbContext.WebhookSubscriptions
                .FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId);

            if (sub == null || sub.IsDeleted) return NotFound($"Subscription not found.");

            sub.IsActive = true;
            sub.IsPaused = false;
            sub.IsRateLimited = false;
            
            await _dbContext.SaveChangesAsync();
            return Ok(sub);
        }

        [HttpPost("{id}/toggle")]
        public async Task<ActionResult<WebhookSubscription>> ToggleSubscription(Guid id, [FromQuery] bool deliverLatestOnly = false)
        {
            var userId = GetCurrentUserId();
            var sub = await _dbContext.WebhookSubscriptions
                .FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId);

            if (sub == null || sub.IsDeleted) return NotFound($"Subscription not found.");

            sub.IsActive = !sub.IsActive;
            sub.IsPaused = !sub.IsActive;
            
            if (sub.IsActive)
            {
                // Resume logic (queueing paused events)
                sub.PausedAt = null;
                var pausedEvents = await _dbContext.DeliveryLogs
                    .Where(l => l.SubscriptionId == id && l.Status == DeliveryStatus.Paused)
                    .OrderByDescending(l => l.AttemptedAt)
                    .ToListAsync();
                
                if (deliverLatestOnly && pausedEvents.Count > 0)
                {
                    var latest = pausedEvents.First();
                    latest.Status = DeliveryStatus.Retrying;
                    latest.NextRetryAt = DateTime.UtcNow;
                    
                    foreach (var log in pausedEvents.Skip(1)) { log.Status = DeliveryStatus.Failed; }
                }
                else
                {
                    foreach (var log in pausedEvents) 
                    { 
                        log.Status = DeliveryStatus.Retrying; 
                        log.NextRetryAt = DateTime.UtcNow; 
                    }
                }
            }
            else
            {
                sub.PausedAt = DateTime.UtcNow;
            }

            await _dbContext.SaveChangesAsync();
            return Ok(sub);
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> DeleteSubscription(Guid id)
        {
            var userId = GetCurrentUserId();

            // 🔒 VERIFY OWNERSHIP
            var sub = await _dbContext.WebhookSubscriptions
                .FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId);

            if (sub == null || sub.IsDeleted) return NotFound($"Subscription not found.");

            sub.IsDeleted = true;
            sub.IsActive = false;
            
            await _dbContext.SaveChangesAsync();

            return NoContent();
        }
    }
}