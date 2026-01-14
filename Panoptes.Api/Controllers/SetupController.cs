using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Grpc.Core;
using Grpc.Net.Client;
using Utxorpc.V1alpha.Sync;
using Panoptes.Core.Entities;
using Panoptes.Core.Interfaces;
using Panoptes.Api.DTOs;

namespace Panoptes.Api.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class SetupController : ControllerBase
    {
        private readonly IAppDbContext _dbContext;
        private readonly IDataProtector _dataProtector;
        private readonly ILogger<SetupController> _logger;

        public SetupController(
            IAppDbContext dbContext,
            IDataProtectionProvider dataProtectionProvider,
            ILogger<SetupController> logger)
        {
            _dbContext = dbContext;
            _dataProtector = dataProtectionProvider.CreateProtector("DemeterCredentials");
            _logger = logger;
        }

        [HttpGet("status")]
        public async Task<ActionResult<SetupStatus>> GetStatus()
        {
            var activeConfig = await _dbContext.DemeterConfigs
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.IsActive);

            var configuredNetworks = await _dbContext.DemeterConfigs
                .AsNoTracking()
                .Select(c => c.Network)
                .ToListAsync();

            return Ok(new SetupStatus
            {
                IsConfigured = activeConfig != null,
                ActiveNetwork = activeConfig?.Network,
                ActiveEndpoint = activeConfig?.GrpcEndpoint,
                ConfiguredNetworks = configuredNetworks
            });
        }

        [HttpPost("validate-demeter")]
        [Authorize]
        public async Task<ActionResult<ValidationResult>> ValidateDemeter([FromBody] DemeterCredentials credentials)
        {
            if (string.IsNullOrWhiteSpace(credentials.GrpcEndpoint) || string.IsNullOrWhiteSpace(credentials.ApiKey))
                return BadRequest(new ValidationResult { IsValid = false, Message = "Endpoint and API Key are required" });

            if (!string.IsNullOrEmpty(credentials.Network))
            {
                var urlLower = credentials.GrpcEndpoint.ToLower();
                var netLower = credentials.Network.ToLower();

                if (urlLower.Contains("mainnet") && netLower != "mainnet")
                    return Ok(new ValidationResult { IsValid = false, Message = "Network mismatch: Mainnet URL with non-Mainnet config" });

                if (urlLower.Contains("preprod") && netLower != "preprod")
                    return Ok(new ValidationResult { IsValid = false, Message = "Network mismatch: Preprod URL with non-Preprod config" });
            }

            try
            {
                var channelOptions = new GrpcChannelOptions
                {
                    HttpHandler = new SocketsHttpHandler { EnableMultipleHttp2Connections = true }
                };

                using var channel = GrpcChannel.ForAddress(credentials.GrpcEndpoint, channelOptions);
                var client = new SyncService.SyncServiceClient(channel);
                var headers = new Metadata { { "dmtr-api-key", credentials.ApiKey } };
                var deadline = DateTime.UtcNow.AddSeconds(5);

                try
                {
                    var request = new FetchBlockRequest
                    {
                        Ref = { new BlockRef { Index = 0, Hash = Google.Protobuf.ByteString.Empty } }
                    };
                    await client.FetchBlockAsync(request, headers, deadline);
                }
                catch (RpcException rpcEx)
                {
                    if (rpcEx.StatusCode == Grpc.Core.StatusCode.Unauthenticated ||
                        rpcEx.StatusCode == Grpc.Core.StatusCode.PermissionDenied)
                    {
                        return Ok(new ValidationResult { IsValid = false, Message = "Authentication failed: API Key rejected" });
                    }

                    if (rpcEx.StatusCode != Grpc.Core.StatusCode.NotFound &&
                        rpcEx.StatusCode != Grpc.Core.StatusCode.InvalidArgument)
                    {
                        throw;
                    }
                }

                return Ok(new ValidationResult { IsValid = true, Message = "Connection verified", ChainTip = 1 });
            }
            catch (Exception ex)
            {
                return Ok(new ValidationResult { IsValid = false, Message = $"Connection failed: {ex.Message}" });
            }
        }

        [HttpPost("save-credentials")]
        [Authorize]
        public async Task<ActionResult> SaveCredentials([FromBody] DemeterCredentials credentials)
        {
            if (string.IsNullOrWhiteSpace(credentials.GrpcEndpoint) || string.IsNullOrWhiteSpace(credentials.ApiKey))
                return BadRequest("GrpcEndpoint and ApiKey are required");

            var network = credentials.Network ?? "Preprod";

            try
            {
                var encryptedApiKey = _dataProtector.Protect(credentials.ApiKey);
                var existingConfig = await _dbContext.DemeterConfigs.FirstOrDefaultAsync(c => c.Network == network);

                if (existingConfig != null)
                {
                    _logger.LogInformation("Updating configuration for {Network}", network);
                    existingConfig.GrpcEndpoint = credentials.GrpcEndpoint;
                    existingConfig.ApiKeyEncrypted = encryptedApiKey;
                    existingConfig.UpdatedAt = DateTime.UtcNow;
                }
                else
                {
                    _logger.LogInformation("Creating configuration for {Network}", network);
                    var isFirstConfig = !await _dbContext.DemeterConfigs.AnyAsync();

                    _dbContext.DemeterConfigs.Add(new DemeterConfig
                    {
                        Network = network,
                        GrpcEndpoint = credentials.GrpcEndpoint,
                        ApiKeyEncrypted = encryptedApiKey,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow,
                        IsActive = isFirstConfig
                    });
                }

                await _dbContext.SaveChangesAsync();
                return Ok(new { Message = $"Credentials for {network} saved" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to save credentials");
                return StatusCode(500, new { Error = "Failed to save credentials" });
            }
        }

        [HttpPost("switch-network")]
        [Authorize]
        public async Task<ActionResult> SwitchNetwork([FromBody] NetworkSwitchRequest request)
        {
            var targetConfig = await _dbContext.DemeterConfigs.FirstOrDefaultAsync(c => c.Network == request.Network);

            if (targetConfig == null)
                return NotFound(new { Error = $"No configuration found for {request.Network}" });

            var activeConfigs = await _dbContext.DemeterConfigs.Where(c => c.IsActive).ToListAsync();
            foreach (var c in activeConfigs)
                c.IsActive = false;

            targetConfig.IsActive = true;
            await _dbContext.SaveChangesAsync();

            _logger.LogInformation("Switched active network to {Network}", request.Network);
            return Ok(new { Message = $"Switched to {request.Network}" });
        }

        [HttpDelete("clear-credentials")]
        [Authorize]
        public async Task<ActionResult> ClearCredentials()
        {
            var configs = await _dbContext.DemeterConfigs.ToListAsync();
            _dbContext.DemeterConfigs.RemoveRange(configs);
            await _dbContext.SaveChangesAsync();
            return Ok(new { Message = "All credentials cleared" });
        }
    }
}
