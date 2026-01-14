using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.DataProtection;
using Panoptes.Core.Entities;
using Panoptes.Core.Interfaces;
using Panoptes.Infrastructure.Configurations;
using Panoptes.Infrastructure.Services;
using Panoptes.Infrastructure.Providers;
using Argus.Sync.Data.Models;
using Chrysalis.Cbor.Extensions.Cardano.Core;
using Chrysalis.Cbor.Extensions.Cardano.Core.Header;

namespace Panoptes.Api.Workers
{
    public class ArgusWorker : BackgroundService
    {
        private readonly ILogger<ArgusWorker> _logger;
        private readonly PanoptesConfig _config;
        private readonly IServiceProvider _serviceProvider;
        private readonly IDataProtectionProvider _dataProtectionProvider;

        public ArgusWorker(
            ILogger<ArgusWorker> logger,
            IOptions<PanoptesConfig> config,
            IServiceProvider serviceProvider,
            IDataProtectionProvider dataProtectionProvider)
        {
            _logger = logger;
            _config = config.Value;
            _serviceProvider = serviceProvider;
            _dataProtectionProvider = dataProtectionProvider;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("ArgusWorker starting");

            while (!stoppingToken.IsCancellationRequested)
            {
                var credentials = await LoadCredentialsAsync(stoppingToken);

                if (credentials == null)
                {
                    await Task.Delay(5000, stoppingToken);
                    continue;
                }

                var (endpoint, apiKey, network) = credentials.Value;

                if (string.IsNullOrWhiteSpace(apiKey))
                {
                    _logger.LogWarning("API Key is empty, connection will likely fail");
                }

                try
                {
                    await RunSyncLoop(endpoint, apiKey, network, stoppingToken);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    _logger.LogInformation("ArgusWorker stopping");
                    break;
                }
                catch (Grpc.Core.RpcException rpcEx)
                {
                    await HandleRpcException(rpcEx, endpoint, apiKey, stoppingToken);
                }
                catch (HttpRequestException httpEx)
                {
                    _logger.LogError("Network connection failed: {Message}", httpEx.Message);
                    await Task.Delay(5000, stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Unexpected error in ArgusWorker");
                    await Task.Delay(5000, stoppingToken);
                }
            }
        }

        private async Task<(string? endpoint, string? apiKey, string? network)?> LoadCredentialsAsync(CancellationToken stoppingToken)
        {
            using var scope = _serviceProvider.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<IAppDbContext>();

            var dbConfig = await dbContext.DemeterConfigs
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.IsActive, stoppingToken);

            if (dbConfig != null)
            {
                try
                {
                    var protector = _dataProtectionProvider.CreateProtector("DemeterCredentials");
                    var apiKey = protector.Unprotect(dbConfig.ApiKeyEncrypted);
                    _logger.LogInformation("Loaded credentials: Network={Network}", dbConfig.Network);
                    return (dbConfig.GrpcEndpoint, apiKey, dbConfig.Network);
                }
                catch (System.Security.Cryptography.CryptographicException)
                {
                    _logger.LogWarning("Failed to decrypt credentials, clearing invalid data");
                    try
                    {
                        dbContext.DemeterConfigs.Remove(dbConfig);
                        await dbContext.SaveChangesAsync(stoppingToken);
                    }
                    catch (Exception deleteEx)
                    {
                        _logger.LogError(deleteEx, "Failed to clear invalid credentials");
                    }
                }
            }

            _logger.LogWarning("No credentials configured");
            return null;
        }

        private async Task RunSyncLoop(string? endpoint, string? apiKey, string? network, CancellationToken stoppingToken)
        {
            _logger.LogInformation("Connecting to UtxoRPC at {Url}", endpoint);

            var headers = new Dictionary<string, string> { { "dmtr-api-key", apiKey ?? string.Empty } };
            var provider = new PanoptesU5CProvider(endpoint ?? string.Empty, headers);

            using var scope = _serviceProvider.CreateScope();
            var reducer = scope.ServiceProvider.GetRequiredService<PanoptesReducer>();
            var dbContext = scope.ServiceProvider.GetRequiredService<IAppDbContext>();

            var (startSlot, startHash) = await DetermineStartPoint(dbContext, provider, stoppingToken);

            var intersections = new List<Point> { new Point(startHash, startSlot) };

            ulong networkMagic = network switch
            {
                "Mainnet" => 764824073,
                "Preprod" => 1,
                "Preview" => 2,
                _ => 764824073
            };

            _logger.LogInformation("Starting sync from Slot {Slot}, Network={Network}", startSlot, network);

            var blockCount = 0;
            await foreach (var response in provider.StartChainSyncAsync(intersections, networkMagic, stoppingToken))
            {
                if (response.Action == NextResponseAction.RollForward && response.Block != null)
                {
                    await reducer.RollForwardAsync(response.Block);
                    blockCount++;
                }
                else if (response.Action == NextResponseAction.RollBack && response.Block != null)
                {
                    await reducer.RollBackwardAsync(response.Block.Header().HeaderBody().Slot());
                }
            }

            if (blockCount == 0)
            {
                _logger.LogWarning("Sync ended without processing blocks, reconnecting");
                await Task.Delay(5000, stoppingToken);
            }
        }

        private async Task<(ulong slot, string hash)> DetermineStartPoint(
            IAppDbContext dbContext,
            PanoptesU5CProvider provider,
            CancellationToken stoppingToken)
        {
            var lastSyncedState = await dbContext.SystemStates
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Key == "LastSyncedSlot", stoppingToken);

            if (lastSyncedState != null && ulong.TryParse(lastSyncedState.Value, out var savedSlot))
            {
                var lastSyncedHash = await dbContext.SystemStates
                    .AsNoTracking()
                    .FirstOrDefaultAsync(s => s.Key == "LastSyncedHash", stoppingToken);

                if (lastSyncedHash != null && !string.IsNullOrEmpty(lastSyncedHash.Value))
                {
                    _logger.LogInformation("Resuming from checkpoint: Slot {Slot}", savedSlot);
                    return (savedSlot, lastSyncedHash.Value);
                }
            }

            _logger.LogInformation("Fresh start, fetching chain tip");
            var tip = await provider.GetTipAsync(0, stoppingToken);

            dbContext.SystemStates.Add(new SystemState { Key = "LastSyncedSlot", Value = tip.Slot.ToString() });
            dbContext.SystemStates.Add(new SystemState { Key = "LastSyncedHash", Value = tip.Hash });
            await dbContext.SaveChangesAsync(stoppingToken);

            _logger.LogInformation("Starting from tip: Slot {Slot}", tip.Slot);
            return (tip.Slot, tip.Hash);
        }

        private async Task HandleRpcException(Grpc.Core.RpcException rpcEx, string? endpoint, string? apiKey, CancellationToken stoppingToken)
        {
            var isAuthError = rpcEx.StatusCode == Grpc.Core.StatusCode.Unauthenticated;
            var isRateLimited = rpcEx.Status.Detail?.Contains("429") == true ||
                               rpcEx.Status.Detail?.ToLower().Contains("rate limit") == true;

            if (isAuthError)
            {
                _logger.LogError("Authentication failed - invalid API key. Endpoint: {Endpoint}", endpoint);
                await Task.Delay(10000, stoppingToken);
            }
            else if (isRateLimited)
            {
                _logger.LogError("Rate limit exceeded, waiting 60 seconds");
                await Task.Delay(60000, stoppingToken);
            }
            else
            {
                _logger.LogError("RPC error: {StatusCode} - {Detail}", rpcEx.StatusCode, rpcEx.Status.Detail);
                await Task.Delay(5000, stoppingToken);
            }
        }
    }
}
