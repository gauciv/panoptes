using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using System;
using System.Threading.Tasks;

namespace Panoptes.Api.Auth
{
    /// <summary>
    /// Attribute to require API key authentication on controllers or actions
    /// </summary>
    [AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
    public class ApiKeyAuthAttribute : Attribute, IAsyncActionFilter
    {
        private const string ApiKeyHeaderName = "X-Api-Key";

        public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
        {
            // Check for API key in header
            if (!context.HttpContext.Request.Headers.TryGetValue(ApiKeyHeaderName, out var providedApiKey))
            {
                context.Result = new UnauthorizedObjectResult(new { error = "API key is required. Include 'X-Api-Key' header." });
                return;
            }

            var configuration = context.HttpContext.RequestServices.GetRequiredService<IConfiguration>();
            var configuredApiKey = configuration["ApiKey"];

            // If no API key is configured, allow all requests (development mode)
            if (string.IsNullOrEmpty(configuredApiKey))
            {
                await next();
                return;
            }

            // Validate API key
            if (!string.Equals(configuredApiKey, providedApiKey, StringComparison.Ordinal))
            {
                context.Result = new UnauthorizedObjectResult(new { error = "Invalid API key" });
                return;
            }

            await next();
        }
    }
}
