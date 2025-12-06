using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.DependencyInjection;
using Panoptes.Infrastructure.Configurations;
using Panoptes.Infrastructure.Services;
using Argus.Sync;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Panoptes.Api.Workers
{
    public class ArgusWorker : BackgroundService
    {
        private readonly ILogger<ArgusWorker> _logger;
        private readonly PanoptesConfig _config;
        private readonly IServiceProvider _serviceProvider;

        public ArgusWorker(
            ILogger<ArgusWorker> logger,
            IOptions<PanoptesConfig> config,
            IServiceProvider serviceProvider)
        {
            _logger = logger;
            _config = config.Value;
            _serviceProvider = serviceProvider;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    _logger.LogInformation("Connecting to Demeter Argus at {Url}", _config.DemeterUrl);

                    // Initialize Argus Client
                    // Assuming ArgusClient takes url and apiKey in constructor or options
                    // Adjust based on actual library signature
                    using var client = new ArgusClient(_config.DemeterUrl, _config.DemeterApiKey);

                    using (var scope = _serviceProvider.CreateScope())
                    {
                        var reducer = scope.ServiceProvider.GetRequiredService<PanoptesReducer>();
                        
                        // Start syncing
                        // Assuming StartSyncAsync takes the reducer and token
                        // Also assuming StartSlot is used if provided
                        long? startSlot = _config.StartSlot;
                        
                        _logger.LogInformation("Starting sync from slot {Slot}", startSlot?.ToString() ?? "Tip");

                        await client.StartSyncAsync(reducer, startSlot, stoppingToken);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Argus Worker encountered an error. Retrying in 5 seconds...");
                    await Task.Delay(5000, stoppingToken);
                }
            }
        }
    }
}
