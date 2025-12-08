using System.Net.Http;
using Panoptes.Core.Entities;
using Panoptes.Core.Interfaces;
using System;
using System.Diagnostics;
using System.Linq;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace Panoptes.Infrastructure.Services
{
    public class WebhookDispatcher : IWebhookDispatcher
    {
        private readonly IHttpClientFactory _httpClientFactory;

        public WebhookDispatcher(IHttpClientFactory httpClientFactory)
        {
            _httpClientFactory = httpClientFactory;
        }

        public async Task<DeliveryLog> DispatchAsync(WebhookSubscription sub, object payload)
        {
            var log = new DeliveryLog
            {
                Id = Guid.NewGuid(),
                SubscriptionId = sub.Id,
                AttemptedAt = DateTime.UtcNow
            };

            var stopwatch = Stopwatch.StartNew();

            try
            {
                var payloadJson = JsonSerializer.Serialize(payload);
                log.PayloadJson = payloadJson;

                using var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(30); // 30 second timeout for webhook delivery
                using var request = new HttpRequestMessage(HttpMethod.Post, sub.TargetUrl);
                
                request.Content = new StringContent(payloadJson, Encoding.UTF8, "application/json");

                // Calculate Signature
                var signature = ComputeSignature(sub.SecretKey, payloadJson);
                request.Headers.Add("X-Panoptes-Signature", signature);

                using var response = await client.SendAsync(request);
                
                stopwatch.Stop();
                log.LatencyMs = stopwatch.Elapsed.TotalMilliseconds;
                log.ResponseStatusCode = (int)response.StatusCode;
                
                // Read response body (truncate if necessary in a real app, but keeping it simple here)
                log.ResponseBody = await response.Content.ReadAsStringAsync();
                
                // Handle 429 Rate Limit with Retry-After header
                if (response.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
                {
                    log.IsRateLimitRetry = true;
                    
                    // Check for Retry-After header (can be in seconds or HTTP-date format)
                    if (response.Headers.TryGetValues("Retry-After", out var retryAfterValues))
                    {
                        var retryAfterValue = retryAfterValues.FirstOrDefault();
                        
                        // Try to parse as seconds (most common)
                        if (int.TryParse(retryAfterValue, out var retryAfterSeconds))
                        {
                            log.RetryAfterSeconds = retryAfterSeconds;
                        }
                        // Try to parse as HTTP-date format
                        else if (DateTime.TryParse(retryAfterValue, out var retryAfterDate))
                        {
                            var secondsUntil = (int)(retryAfterDate - DateTime.UtcNow).TotalSeconds;
                            log.RetryAfterSeconds = Math.Max(secondsUntil, 1); // At least 1 second
                        }
                    }
                    
                    // If no Retry-After header, use conservative default
                    log.RetryAfterSeconds ??= 60; // Default to 60 seconds
                }
            }
            catch (Exception ex)
            {
                stopwatch.Stop();
                log.LatencyMs = stopwatch.Elapsed.TotalMilliseconds;
                log.ResponseStatusCode = 0; // Indicates failure/exception
                log.ResponseBody = $"Exception: {ex.Message}";
            }

            return log;
        }

        private string ComputeSignature(string secret, string payload)
        {
            var keyBytes = Encoding.UTF8.GetBytes(secret);
            var payloadBytes = Encoding.UTF8.GetBytes(payload);

            using var hmac = new HMACSHA256(keyBytes);
            var hashBytes = hmac.ComputeHash(payloadBytes);
            
            return BitConverter.ToString(hashBytes).Replace("-", "").ToLowerInvariant();
        }
    }
}
