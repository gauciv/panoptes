using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Panoptes.Core.Entities;
using Panoptes.Core.Interfaces;
using Panoptes.Infrastructure.Providers;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Panoptes.Api.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class SetupController : ControllerBase
    {
        private readonly IAppDbContext _dbContext;
        private readonly IDataProtector _dataProtector;
        private readonly ILogger<SetupController> _logger;

        public SetupController(IAppDbContext dbContext, IDataProtectionProvider dataProtectionProvider, ILogger<SetupController> logger)
        {
            _dbContext = dbContext;
            _dataProtector = dataProtectionProvider.CreateProtector("DemeterCredentials");
            _logger = logger;
        }

        [HttpGet("status")]
        public async Task<ActionResult<SetupStatus>> GetStatus()
        {
            // Get the currently active config
            var activeConfig = await _dbContext.DemeterConfigs
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.IsActive);

            // Get list of all configured networks (where we have keys stored)
            var configuredNetworks = await _dbContext.DemeterConfigs
                .AsNoTracking()
                .Select(c => c.Network)
                .ToListAsync();

            var status = new SetupStatus
            {
                IsConfigured = activeConfig != null,
                ActiveNetwork = activeConfig?.Network,
                ActiveEndpoint = activeConfig?.GrpcEndpoint,
                ConfiguredNetworks = configuredNetworks
            };

            return Ok(status);
        }

        [HttpPost("validate-demeter")]
        public async Task<ActionResult<ValidationResult>> ValidateDemeter([FromBody] DemeterCredentials credentials)
        {
            if (string.IsNullOrWhiteSpace(credentials.GrpcEndpoint) || string.IsNullOrWhiteSpace(credentials.ApiKey))
            {
                return BadRequest(new ValidationResult { IsValid = false, Message = "Endpoint and API Key are required" });
            }

            // SAFETY CHECK: Prevent mixing up networks
            // Demeter endpoints usually contain the network name (e.g., 'cardano-mainnet' or 'cardano-preprod')
            if (!string.IsNullOrEmpty(credentials.Network))
            {
                var urlLower = credentials.GrpcEndpoint.ToLower();
                var netLower = credentials.Network.ToLower();
                
                if (urlLower.Contains("mainnet") && netLower != "mainnet")
                    return Ok(new ValidationResult { IsValid = false, Message = "MISMATCH: You are using a Mainnet URL for a non-Mainnet configuration." });
                
                if (urlLower.Contains("preprod") && netLower != "preprod")
                    return Ok(new ValidationResult { IsValid = false, Message = "MISMATCH: You are using a Preprod URL for a non-Preprod configuration." });
            }

            try
            {
                var headers = new Dictionary<string, string> { { "dmtr-api-key", credentials.ApiKey } };
                var provider = new PanoptesU5CProvider(credentials.GrpcEndpoint, headers);
                
                // Use a default timeout for validation so we don't hang
                using var cts = new System.Threading.CancellationTokenSource(TimeSpan.FromSeconds(10));
                
                // We just ask for the tip. If the key is invalid, Demeter throws RpcException(Unauthenticated).
                // If the key is for the wrong network, the Slot/Hash might look weird, but usually connection succeeds.
                var tip = await provider.GetTipAsync(0, cts.Token);

                return Ok(new ValidationResult
                {
                    IsValid = true,
                    Message = $"Connection successful! Chain tip at slot {tip.Slot}",
                    ChainTip = tip.Slot
                });
            }
            catch (Exception ex)
            {
                return Ok(new ValidationResult
                {
                    IsValid = false,
                    Message = $"Connection failed: {ex.Message}"
                });
            }
        }

        [HttpPost("save-credentials")]
        public async Task<ActionResult> SaveCredentials([FromBody] DemeterCredentials credentials)
        {
            if (string.IsNullOrWhiteSpace(credentials.GrpcEndpoint) || string.IsNullOrWhiteSpace(credentials.ApiKey))
                return BadRequest("GrpcEndpoint and ApiKey are required");

            var network = credentials.Network ?? "Preprod";

            try
            {
                var encryptedApiKey = _dataProtector.Protect(credentials.ApiKey);

                // UPSERT LOGIC: Check if we already have a profile for this network
                var existingConfig = await _dbContext.DemeterConfigs
                    .FirstOrDefaultAsync(c => c.Network == network);

                if (existingConfig != null)
                {
                    _logger.LogInformation("Updating existing configuration for {Network}", network);
                    existingConfig.GrpcEndpoint = credentials.GrpcEndpoint;
                    existingConfig.ApiKeyEncrypted = encryptedApiKey;
                    existingConfig.UpdatedAt = DateTime.UtcNow;
                    // Note: We do NOT automatically set IsActive=true here unless you want to force switch on save.
                    // For now, let's keep the user on their current network unless they explicitly switch.
                }
                else
                {
                    _logger.LogInformation("Creating new configuration profile for {Network}", network);
                    
                    // If this is the FIRST config ever, make it active automatically
                    var isFirstConfig = !await _dbContext.DemeterConfigs.AnyAsync();
                    
                    var newConfig = new DemeterConfig
                    {
                        Network = network,
                        GrpcEndpoint = credentials.GrpcEndpoint,
                        ApiKeyEncrypted = encryptedApiKey,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow,
                        IsActive = isFirstConfig 
                    };
                    _dbContext.DemeterConfigs.Add(newConfig);
                }

                await _dbContext.SaveChangesAsync();
                return Ok(new { Message = $"Credentials for {network} saved." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to save credentials");
                return StatusCode(500, new { Error = "Failed to save credentials" });
            }
        }

        [HttpPost("switch-network")]
        public async Task<ActionResult> SwitchNetwork([FromBody] NetworkSwitchRequest request)
        {
            var targetNetwork = request.Network;
            
            // 1. Find the target config
            var targetConfig = await _dbContext.DemeterConfigs
                .FirstOrDefaultAsync(c => c.Network == targetNetwork);

            if (targetConfig == null)
            {
                return NotFound(new { Error = $"No configuration found for {targetNetwork}. Please configure it first." });
            }

            // 2. Deactivate currently active config
            var activeConfigs = await _dbContext.DemeterConfigs
                .Where(c => c.IsActive)
                .ToListAsync();

            foreach (var c in activeConfigs) c.IsActive = false;

            // 3. Activate target
            targetConfig.IsActive = true;
            await _dbContext.SaveChangesAsync();

            _logger.LogInformation("Switched active network to {Network}", targetNetwork);

            return Ok(new { Message = $"Switched to {targetNetwork}. Worker restarting..." });
        }
        
        [HttpDelete("clear-credentials")]
        public async Task<ActionResult> ClearCredentials()
        {
            var configs = await _dbContext.DemeterConfigs.ToListAsync();
            _dbContext.DemeterConfigs.RemoveRange(configs); // Actually delete them to wipe slate clean
            await _dbContext.SaveChangesAsync();
            return Ok(new { Message = "All credentials wiped." });
        }
    }

    public class SetupStatus
    {
        public bool IsConfigured { get; set; }
        public string? ActiveNetwork { get; set; }
        public string? ActiveEndpoint { get; set; }
        public List<string> ConfiguredNetworks { get; set; } = new();
    }

    public class DemeterCredentials
    {
        public string GrpcEndpoint { get; set; } = string.Empty;
        public string ApiKey { get; set; } = string.Empty;
        public string? Network { get; set; }
    }

    public class NetworkSwitchRequest
    {
        public string Network { get; set; } = string.Empty;
    }

    public class ValidationResult
    {
        public bool IsValid { get; set; }
        public string Message { get; set; } = string.Empty;
        public ulong? ChainTip { get; set; }
    }
}