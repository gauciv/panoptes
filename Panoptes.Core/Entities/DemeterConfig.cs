using System;

namespace Panoptes.Core.Entities
{
    /// <summary>
    /// Stores Demeter/UtxoRPC connection credentials in database.
    /// Allows runtime configuration without editing appsettings files.
    /// </summary>
    public class DemeterConfig
    {
        public int Id { get; set; }
        
        /// <summary>
        /// gRPC endpoint URL (e.g., https://cardano-preprod.utxorpc-m1.demeter.run)
        /// </summary>
        public string GrpcEndpoint { get; set; } = string.Empty;
        
        /// <summary>
        /// Encrypted API key using Data Protection API
        /// </summary>
        public string ApiKeyEncrypted { get; set; } = string.Empty;
        
        /// <summary>
        /// Cardano network: Mainnet, Preprod, or Preview
        /// </summary>
        public string Network { get; set; } = "Preprod";
        
        /// <summary>
        /// When this configuration was first created
        /// </summary>
        public DateTime CreatedAt { get; set; }
        
        /// <summary>
        /// When this configuration was last updated
        /// </summary>
        public DateTime UpdatedAt { get; set; }
        
        /// <summary>
        /// Whether this configuration is currently active
        /// </summary>
        public bool IsActive { get; set; } = true;
    }
}
