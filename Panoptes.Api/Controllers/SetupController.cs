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
            var config = await _dbContext.DemeterConfigs
                .Where(c => c.IsActive)
                .FirstOrDefaultAsync();

            var status = new SetupStatus
            {
                IsConfigured = config != null,
                Network = config?.Network,
                GrpcEndpoint = config?.GrpcEndpoint,
                LastUpdated = config?.UpdatedAt
            };

            return Ok(status);
        }

        [HttpPost("validate-demeter")]
        public async Task<ActionResult<ValidationResult>> ValidateDemeter([FromBody] DemeterCredentials credentials)
        {
            if (string.IsNullOrWhiteSpace(credentials.GrpcEndpoint))
            {
                return BadRequest(new ValidationResult
                {
                    IsValid = false,
                    Message = "GrpcEndpoint is required"
                });
            }

            if (string.IsNullOrWhiteSpace(credentials.ApiKey))
            {
                return BadRequest(new ValidationResult
                {
                    IsValid = false,
                    Message = "ApiKey is required"
                });
            }

            try
            {
                // Test connection by getting chain tip
                var headers = new Dictionary<string, string>
                {
                    { "dmtr-api-key", credentials.ApiKey }
                };

                var provider = new PanoptesU5CProvider(credentials.GrpcEndpoint, headers);
                
                // Determine network magic from network name
                ulong networkMagic = credentials.Network switch
                {
                    "Mainnet" => 764824073,
                    "Preprod" => 1,
                    "Preview" => 2,
                    _ => 1
                };

                var tip = await provider.GetTipAsync(networkMagic);

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
            _logger.LogInformation("SaveCredentials called: Network={Network}, Endpoint={Endpoint}, ApiKeyLength={Length}", 
                credentials.Network, credentials.GrpcEndpoint, credentials.ApiKey?.Length ?? 0);

            if (string.IsNullOrWhiteSpace(credentials.GrpcEndpoint) || 
                string.IsNullOrWhiteSpace(credentials.ApiKey))
            {
                _logger.LogWarning("SaveCredentials failed: Missing required fields");
                return BadRequest("GrpcEndpoint and ApiKey are required");
            }

            try
            {
                // Deactivate any existing configs
                var existingConfigs = await _dbContext.DemeterConfigs
                    .Where(c => c.IsActive)
                    .ToListAsync();

                _logger.LogInformation("Found {Count} existing active configs to deactivate", existingConfigs.Count);

                foreach (var config in existingConfigs)
                {
                    config.IsActive = false;
                }

                // Encrypt API key
                var encryptedApiKey = _dataProtector.Protect(credentials.ApiKey);
                _logger.LogInformation("API key encrypted successfully");

                // Create new config
                var newConfig = new DemeterConfig
                {
                    GrpcEndpoint = credentials.GrpcEndpoint,
                    ApiKeyEncrypted = encryptedApiKey,
                    Network = credentials.Network ?? "Preprod",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    IsActive = true
                };

                _dbContext.DemeterConfigs.Add(newConfig);
                await _dbContext.SaveChangesAsync();

                _logger.LogInformation("✅ Credentials saved successfully to database: Network={Network}, Endpoint={Endpoint}", 
                    newConfig.Network, newConfig.GrpcEndpoint);

                return Ok(new { Message = "Credentials saved successfully. Worker will restart automatically." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to save credentials");
                return StatusCode(500, new { Error = "Failed to save credentials", Details = ex.Message });
            }
        }

        [HttpDelete("clear-credentials")]
        public async Task<ActionResult> ClearCredentials()
        {
            var configs = await _dbContext.DemeterConfigs.ToListAsync();
            
            foreach (var config in configs)
            {
                config.IsActive = false;
            }

            await _dbContext.SaveChangesAsync();

            return Ok(new { Message = "Credentials cleared. Worker will stop." });
        }
    }

    public class SetupStatus
    {
        public bool IsConfigured { get; set; }
        public string? Network { get; set; }
        public string? GrpcEndpoint { get; set; }
        public DateTime? LastUpdated { get; set; }
    }

    public class DemeterCredentials
    {
        public string GrpcEndpoint { get; set; } = string.Empty;
        public string ApiKey { get; set; } = string.Empty;
        public string? Network { get; set; } = "Preprod";
    }

    public class ValidationResult
    {
        public bool IsValid { get; set; }
        public string Message { get; set; } = string.Empty;
        public ulong? ChainTip { get; set; }
    }
}
