using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.DependencyInjection;
using Panoptes.Core.Interfaces;
using Panoptes.Infrastructure.Configurations;
using Panoptes.Infrastructure.Services;
using Panoptes.Infrastructure.Providers;
using Argus.Sync.Data.Models;
using Chrysalis.Cbor.Extensions.Cardano.Core;
using Chrysalis.Cbor.Extensions.Cardano.Core.Header;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using Microsoft.AspNetCore.DataProtection;
using Panoptes.Core.Entities;

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

        /// <summary>
        /// Load Demeter credentials with priority: 1) Database (primary), 2) appsettings (fallback)
        /// </summary>
        private async Task<(string? endpoint, string? apiKey, string? network)?> LoadCredentialsAsync(CancellationToken stoppingToken)
        {
            using var scope = _serviceProvider.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<IAppDbContext>();

            // Try database first
            var dbConfig = await dbContext.DemeterConfigs
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.IsActive, stoppingToken);

            if (dbConfig != null)
            {
                try
                {
                    var protector = _dataProtectionProvider.CreateProtector("DemeterCredentials");
                    var apiKey = protector.Unprotect(dbConfig.ApiKeyEncrypted);
                    _logger.LogInformation("Loaded Demeter credentials from database: Network={Network}, Endpoint={Endpoint}", 
                        dbConfig.Network, dbConfig.GrpcEndpoint);
                    return (dbConfig.GrpcEndpoint, apiKey, dbConfig.Network);
                }
                catch (System.Security.Cryptography.CryptographicException)
                {
                    _logger.LogWarning("Failed to decrypt stored credentials (encryption keys changed). Clearing invalid data...");
                    
                    // Remove invalid encrypted data - user will need to reconfigure via GUI
                    try
                    {
                        dbContext.DemeterConfigs.Remove(dbConfig);
                        await dbContext.SaveChangesAsync(stoppingToken);
                        _logger.LogInformation("Cleared invalid credentials from database. Please configure via Settings page.");
                    }
                    catch (Exception deleteEx)
                    {
                        _logger.LogError(deleteEx, "Failed to clear invalid credentials from database");
                    }
                }
            }

            // No valid credentials found - user must configure via GUI
            _logger.LogWarning("No Demeter credentials configured. Please visit the Settings page to configure your API key.");
            return null;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("ArgusWorker starting. Waiting for Demeter credentials...");

            // Poll for credentials until configured
            while (!stoppingToken.IsCancellationRequested)
            {
                var credentials = await LoadCredentialsAsync(stoppingToken);

                if (credentials == null)
                {
                    _logger.LogWarning(
                        "═══════════════════════════════════════════════════════════════\n" +
                        "⏸️  ARGUS WORKER IDLE - NO CREDENTIALS CONFIGURED\n" +
                        "═══════════════════════════════════════════════════════════════\n" +
                        "Demeter credentials not found in database or appsettings.json\n" +
                        "\n" +
                        "To start syncing:\n" +
                        "  1. Open Panoptes UI in your browser\n" +
                        "  2. Complete the Setup Wizard\n" +
                        "  3. Enter your Demeter API credentials\n" +
                        "  4. ArgusWorker will start automatically\n" +
                        "\n" +
                        "Checking again in 5 seconds...\n" +
                        "═══════════════════════════════════════════════════════════════");
                    await Task.Delay(5000, stoppingToken);
                    continue;
                }

                var (endpoint, apiKey, network) = credentials.Value;

                if (string.IsNullOrWhiteSpace(apiKey))
                {
                    _logger.LogWarning("\n" +
                        "═══════════════════════════════════════════════════════════════\n" +
                        "⚠️  WARNING: API Key is empty or missing\n" +
                        "═══════════════════════════════════════════════════════════════\n" +
                        "Endpoint: {Endpoint}\n" +
                        "Connection will likely fail without authentication.\n" +
                        "Get your API key from: https://demeter.run\n" +
                        "═══════════════════════════════════════════════════════════════\n",
                        endpoint);
                }

                // Now we have valid credentials, start sync loop
                try
                {
                    _logger.LogInformation("Connecting to Demeter Argus via UtxoRPC at {Url}", endpoint);
                    _logger.LogInformation("API Key: {ApiKeyPrefix} - {Length} characters", 
                        apiKey?.Length > 15 ? apiKey.Substring(0, 15) + "..." : "(not set)",
                        apiKey?.Length ?? 0);

                    var headers = new Dictionary<string, string>
                    {
                        { "dmtr-api-key", apiKey ?? string.Empty }
                    };
                    
                    // Use our custom provider that handles UtxoRPC format correctly
                    var provider = new PanoptesU5CProvider(endpoint ?? string.Empty, headers);

                    using (var scope = _serviceProvider.CreateScope())
                    {
                        var reducer = scope.ServiceProvider.GetRequiredService<PanoptesReducer>();
                        var dbContext = scope.ServiceProvider.GetRequiredService<IAppDbContext>();
                        
                        // Determine start point
                        var intersections = new List<Point>();
                        
                        // Check DB for checkpoint
                        var lastSyncedState = await dbContext.SystemStates
                            .AsNoTracking()
                            .FirstOrDefaultAsync(s => s.Key == "LastSyncedSlot", stoppingToken);

                        string? startHash = _config.StartHash;
                        ulong? startSlot = null;

                        if (lastSyncedState != null && ulong.TryParse(lastSyncedState.Value, out var savedSlot))
                        {
                            // Check if we have a saved hash as well
                            var lastSyncedHash = await dbContext.SystemStates
                                .AsNoTracking()
                                .FirstOrDefaultAsync(s => s.Key == "LastSyncedHash", stoppingToken);
                            
                            if (lastSyncedHash != null && !string.IsNullOrEmpty(lastSyncedHash.Value))
                            {
                                startSlot = savedSlot;
                                startHash = lastSyncedHash.Value;
                                _logger.LogInformation("Resuming from checkpoint: Slot {Slot}, Hash {Hash}", startSlot, startHash);
                            }
                            else
                            {
                                _logger.LogWarning("Found checkpoint slot {Slot} but missing hash. Using configured start point.", savedSlot);
                            }
                        }
                        
                        // Fall back to config if no valid checkpoint
                        if (startSlot == null && _config.StartSlot.HasValue && !string.IsNullOrEmpty(_config.StartHash))
                        {
                            startSlot = (ulong)_config.StartSlot.Value;
                            startHash = _config.StartHash;
                            _logger.LogInformation("Using configured start point: Slot {Slot}, Hash {Hash}", startSlot, startHash);
                        }

                        // If still no valid start point, fetch the current chain tip dynamically
                        if (startSlot == null || string.IsNullOrEmpty(startHash))
                        {
                            _logger.LogInformation("No valid start point found. Fetching current chain tip...");
                            try
                            {
                                var tip = await provider.GetTipAsync(0, stoppingToken);
                                startSlot = tip.Slot;
                                startHash = tip.Hash;
                                _logger.LogInformation("Fetched chain tip: Slot {Slot}, Hash {Hash}", startSlot, startHash);
                            }
                            catch (Exception ex)
                            {
                                _logger.LogError(ex, "Failed to fetch chain tip. Retrying in 5 seconds...");
                                await Task.Delay(5000, stoppingToken);
                                continue;
                            }
                        }

                        intersections.Add(new Point(startHash, startSlot.Value));

                        // Network Magic: Mainnet = 764824073, Preprod = 1, Preview = 2
                        ulong networkMagic = network switch
                        {
                            "Mainnet" => 764824073,
                            "Preprod" => 1,
                            "Preview" => 2,
                            _ => 764824073
                        };

                        _logger.LogInformation("Starting chain sync from Slot {Slot}, Hash {Hash} with Network={Network} (Magic={NetworkMagic})", 
                            startSlot, startHash, network, networkMagic);

                        _logger.LogInformation("✓ Connected to Demeter UtxoRPC successfully. Waiting for blocks...");

                        var blockCount = 0;
                        var responseCount = 0;
                        await foreach (var response in provider.StartChainSyncAsync(intersections, networkMagic, stoppingToken))
                        {
                            responseCount++;
                            _logger.LogDebug("Received response #{Count}: {Action}", responseCount, response.Action);
                            
                            if (response.Action == NextResponseAction.RollForward && response.Block != null)
                            {
                                await reducer.RollForwardAsync(response.Block);
                                blockCount++;
                            }
                            else if (response.Action == NextResponseAction.RollBack)
                            {
                                if (response.Block != null)
                                {
                                    await reducer.RollBackwardAsync(response.Block.Header().HeaderBody().Slot());
                                }
                            }
                        }
                        
                        // If we exit the loop without processing any blocks, something is wrong
                        if (blockCount == 0)
                        {
                            _logger.LogWarning("Chain sync ended after {ResponseCount} responses without processing any blocks. Intersection may be invalid. Reconnecting in 5 seconds...", responseCount);
                            await Task.Delay(5000, stoppingToken);
                        }
                        else
                        {
                            _logger.LogInformation("Chain sync connection ended after processing {BlockCount} blocks. Reconnecting...", blockCount);
                        }
                    }
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    _logger.LogInformation("ArgusWorker stopping due to cancellation request");
                    break;
                }
                catch (Grpc.Core.RpcException rpcEx)
                {
                    // Check if this is an authentication error
                    var isAuthError = rpcEx.StatusCode == Grpc.Core.StatusCode.Unauthenticated;
                    
                    // Check if this is a rate limit error (429)
                    var isRateLimited = rpcEx.Status.Detail?.Contains("429") == true || 
                                       rpcEx.Status.Detail?.ToLower().Contains("rate limit") == true ||
                                       rpcEx.Status.Detail?.ToLower().Contains("too many requests") == true;
                    
                    if (isAuthError)
                    {
                        _logger.LogError("\n" +
                            "═══════════════════════════════════════════════════════════════\n" +
                            "🔒 AUTHENTICATION FAILED - INVALID API KEY\n" +
                            "═══════════════════════════════════════════════════════════════\n" +
                            "Demeter rejected your API key!\n" +
                            "\n" +
                            "Current API Key: {ApiKey}\n" +
                            "Endpoint: {Endpoint}\n" +
                            "Error: {Detail}\n" +
                            "\n" +
                            "Common problems:\n" +
                            "  ❌ API key is empty or missing\n" +
                            "  ❌ API key has a typo\n" +
                            "  ❌ API key is expired or revoked\n" +
                            "  ❌ Using wrong key type (need UtxoRPC key, not generic API key)\n" +
                            "  ❌ Still using placeholder value 'YOUR_API_KEY_HERE'\n" +
                            "\n" +
                            "How to fix:\n" +
                            "  1. Go to https://demeter.run\n" +
                            "  2. Log in to your account\n" +
                            "  3. Navigate to 'UtxoRPC' service\n" +
                            "  4. Copy your API key (starts with 'dmtr_utxorpc1...')\n" +
                            "  5. Open Panoptes Settings page in your browser\n" +
                            "  6. Update your API credentials\n" +
                            "  7. Click 'Save & Restart Worker'\n" +
                            "\n" +
                            "Retrying in 10 seconds (will keep failing until key is fixed)...\n" +
                            "═══════════════════════════════════════════════════════════════\n",
                            string.IsNullOrWhiteSpace(apiKey) ? "(EMPTY - NOT SET!)" : 
                                apiKey.Length > 20 ? apiKey.Substring(0, 20) + "..." : apiKey,
                            endpoint,
                            rpcEx.Status.Detail);
                        
                        // Wait longer for auth errors since they won't resolve without manual intervention
                        await Task.Delay(10000, stoppingToken);
                    }
                    else if (isRateLimited)
                    {
                        _logger.LogError("\n" +
                            "═══════════════════════════════════════════════════════════════\n" +
                            "⚠️  RATE LIMIT EXCEEDED (HTTP 429)\n" +
                            "═══════════════════════════════════════════════════════════════\n" +
                            "Your Demeter API key has hit its rate limit!\n" +
                            "\n" +
                            "API Key: {ApiKeyPrefix}...\n" +
                            "Endpoint: {Endpoint}\n" +
                            "Error: {Detail}\n" +
                            "\n" +
                            "This means:\n" +
                            "  • You've made too many requests in the current time window\n" +
                            "  • Demeter is blocking further requests until the window resets\n" +
                            "  • This usually resets every hour\n" +
                            "\n" +
                            "Solutions:\n" +
                            "  1. WAIT: Rate limits typically reset in 1 hour\n" +
                            "  2. UPGRADE: Get a higher tier API key at https://demeter.run\n" +
                            "  3. CHECK: View your usage/limits in Demeter dashboard\n" +
                            "  4. OPTIMIZE: Reduce request frequency if possible\n" +
                            "\n" +
                            "Panoptes will keep retrying. It will auto-resume when the\n" +
                            "rate limit resets. Your checkpoint is saved - no data lost.\n" +
                            "\n" +
                            "Retrying in 60 seconds (longer wait for rate limits)...\n" +
                            "═══════════════════════════════════════════════════════════════\n",
                            apiKey?.Length > 10 ? apiKey.Substring(0, 10) : "(not set)",
                            endpoint,
                            rpcEx.Status.Detail);
                        
                        // Wait longer for rate limits (60 seconds instead of 5)
                        await Task.Delay(60000, stoppingToken);
                    }
                    else
                    {
                        _logger.LogError("\n" +
                            "═══════════════════════════════════════════════════════════════\n" +
                            "❌ DEMETER UtxoRPC CONNECTION FAILED\n" +
                            "═══════════════════════════════════════════════════════════════\n" +
                            "Error: {StatusCode} - {Detail}\n" +
                            "Endpoint: {Endpoint}\n" +
                            "\n" +
                            "Possible causes:\n" +
                            "  1. Demeter UtxoRPC service is down (check https://status.demeter.run)\n" +
                            "  2. Invalid or expired API key (check Settings page to update)\n" +
                            "  3. Network/firewall blocking gRPC traffic to demeter.run\n" +
                            "  4. Rate limit exceeded on your API key\n" +
                            "\n" +
                            "Troubleshooting:\n" +
                            "  • Verify API key: {ApiKeyPrefix}...\n" +
                            "  • Check Demeter status: https://status.demeter.run\n" +
                            "  • Test connectivity: curl -v {Endpoint}\n" +
                            "\n" +
                            "Retrying in 5 seconds...\n" +
                            "═══════════════════════════════════════════════════════════════\n",
                            rpcEx.StatusCode, rpcEx.Status.Detail, endpoint,
                            apiKey?.Length > 10 ? apiKey.Substring(0, 10) : "(not set)",
                            endpoint);
                        await Task.Delay(5000, stoppingToken);
                    }
                }
                catch (HttpRequestException httpEx)
                {
                    _logger.LogError("\n" +
                        "═══════════════════════════════════════════════════════════════\n" +
                        "❌ NETWORK CONNECTION FAILED\n" +
                        "═══════════════════════════════════════════════════════════════\n" +
                        "Error: {Message}\n" +
                        "Endpoint: {Endpoint}\n" +
                        "\n" +
                        "This usually means:\n" +
                        "  1. No internet connection\n" +
                        "  2. DNS resolution failed for {Host}\n" +
                        "  3. Firewall blocking outbound HTTPS (port 443)\n" +
                        "  4. Demeter infrastructure is unreachable\n" +
                        "\n" +
                        "Quick checks:\n" +
                        "  • Test DNS: nslookup {Host}\n" +
                        "  • Test HTTPS: curl -v {Endpoint}\n" +
                        "  • Check internet: ping 8.8.8.8\n" +
                        "\n" +
                        "Retrying in 5 seconds...\n" +
                        "═══════════════════════════════════════════════════════════════\n",
                        httpEx.Message, endpoint, 
                        endpoint != null ? new Uri(endpoint).Host : "unknown",
                        endpoint != null ? new Uri(endpoint).Host : "unknown",
                        endpoint);
                    await Task.Delay(5000, stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "\n" +
                        "═══════════════════════════════════════════════════════════════\n" +
                        "❌ UNEXPECTED ERROR IN ARGUS WORKER\n" +
                        "═══════════════════════════════════════════════════════════════\n" +
                        "Error Type: {ErrorType}\n" +
                        "Message: {Message}\n" +
                        "\n" +
                        "Retrying in 5 seconds...\n" +
                        "═══════════════════════════════════════════════════════════════\n",
                        ex.GetType().Name, ex.Message);
                    await Task.Delay(5000, stoppingToken);
                }
            } // End of while loop - will recheck credentials if sync fails
        }
    }
}
