using System;
using System.Net.Http;
using System.Text;
using System.Text.Json; // ✅ Needed for deserialization
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Panoptes.Core.Entities;
using Panoptes.Core.Interfaces;
using System.Security.Cryptography;
using System.Collections.Generic;

namespace Panoptes.Infrastructure.Services
{
    public class WebhookDispatcher : IWebhookDispatcher
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<WebhookDispatcher> _logger;

        public WebhookDispatcher(IHttpClientFactory httpClientFactory, ILogger<WebhookDispatcher> logger)
        {
            _httpClientFactory = httpClientFactory;
            _logger = logger;
        }

        public async Task<DeliveryLog> DispatchAsync(WebhookSubscription subscription, object payload)
        {
            var log = new DeliveryLog
            {
                Id = Guid.NewGuid(),
                SubscriptionId = subscription.Id,
                AttemptedAt = DateTime.UtcNow,
                Status = DeliveryStatus.Pending,
                RetryCount = 0
            };

            try
            {
                var jsonPayload = JsonSerializer.Serialize(payload);
                log.PayloadJson = jsonPayload;

                var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(10);

                var request = new HttpRequestMessage(HttpMethod.Post, subscription.TargetUrl);
                request.Content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");

                // Standard Headers
                var signature = ComputeHmacSha256(jsonPayload, subscription.SecretKey);
                request.Headers.Add("X-Panoptes-Signature", signature);
                request.Headers.Add("X-Panoptes-Event", subscription.EventType);
                request.Headers.Add("X-Panoptes-Delivery", log.Id.ToString());
                request.Headers.Add("User-Agent", "Panoptes-Webhook/1.0");

                // Custom Headers Logic
                if (!string.IsNullOrEmpty(subscription.CustomHeaders))
                {
                    try
                    {
                        var customHeaders = JsonSerializer.Deserialize<Dictionary<string, string>>(subscription.CustomHeaders);
                        if (customHeaders != null)
                        {
                            foreach (var header in customHeaders)
                            {
                                request.Headers.TryAddWithoutValidation(header.Key, header.Value);
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning("Failed to apply custom headers for {Id}: {Error}", subscription.Id, ex.Message);
                    }
                }

                // Send
                var stopwatch = System.Diagnostics.Stopwatch.StartNew();
                var response = await client.SendAsync(request);
                stopwatch.Stop();

                log.LatencyMs = (int)stopwatch.ElapsedMilliseconds;
                log.ResponseStatusCode = (int)response.StatusCode;
                
                try {
                    log.ResponseBody = await response.Content.ReadAsStringAsync();
                    if (log.ResponseBody.Length > 2000) log.ResponseBody = log.ResponseBody.Substring(0, 2000) + "...";
                } catch { log.ResponseBody = ""; }

                // Status Logic
                if (response.IsSuccessStatusCode)
                {
                    log.Status = DeliveryStatus.Success;
                    // REMOVED: log.IsSuccess = true; (This was causing the error)
                }
                else if ((int)response.StatusCode == 429)
                {
                    log.Status = DeliveryStatus.Retrying;
                    log.IsRateLimitRetry = true;
                    log.RetryAfterSeconds = response.Headers.RetryAfter?.Delta.HasValue == true 
                        ? (int)response.Headers.RetryAfter.Delta.Value.TotalSeconds 
                        : 60;
                }
                else
                {
                    log.Status = DeliveryStatus.Retrying;
                }
            }
            catch (Exception ex)
            {
                log.Status = DeliveryStatus.Retrying;
                log.ResponseStatusCode = 0; 
                log.ResponseBody = $"Network Error: {ex.Message}";
                _logger.LogError(ex, "Dispatch failed for {Id}", subscription.Id);
            }

            return log;
        }

        private string ComputeHmacSha256(string data, string key)
        {
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(key));
            var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(data));
            return BitConverter.ToString(hash).Replace("-", "").ToLower();
        }
    }
}