using Microsoft.EntityFrameworkCore;
using Panoptes.Core.Entities;
using Panoptes.Core.Interfaces;

namespace Panoptes.Infrastructure.Persistence
{
    public class AppDbContext : DbContext, IAppDbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<WebhookSubscription> WebhookSubscriptions { get; set; }
        public DbSet<DeliveryLog> DeliveryLogs { get; set; }
        public DbSet<SystemState> SystemStates { get; set; }
        public DbSet<DemeterConfig> DemeterConfigs { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<WebhookSubscription>(entity =>
            {
                entity.Property(e => e.SecretKey)
                    .IsRequired();

                entity.Property(e => e.TargetUrl)
                    .IsRequired();
                
                // Store wallet addresses as JSON array
                entity.Property(e => e.WalletAddresses)
                    .HasConversion(
                        v => v == null ? null : System.Text.Json.JsonSerializer.Serialize(v, (System.Text.Json.JsonSerializerOptions?)null),
                        v => v == null ? null : System.Text.Json.JsonSerializer.Deserialize<List<string>>(v, (System.Text.Json.JsonSerializerOptions?)null)
                    );
            });
            
            // Configure cascade delete: when a subscription is deleted, delete all its logs
            modelBuilder.Entity<DeliveryLog>(entity =>
            {
                entity.HasOne(d => d.Subscription)
                    .WithMany()
                    .HasForeignKey(d => d.SubscriptionId)
                    .OnDelete(DeleteBehavior.Cascade);
                    
                entity.Property(e => e.Status)
                    .HasConversion<string>();
                
                // Performance indexes for rate limit queries
                entity.HasIndex(e => e.SubscriptionId)
                    .HasDatabaseName("IX_DeliveryLogs_SubscriptionId");
                
                entity.HasIndex(e => e.AttemptedAt)
                    .HasDatabaseName("IX_DeliveryLogs_AttemptedAt");
                
                // Composite index for optimized rate limit calculations
                entity.HasIndex(e => new { e.SubscriptionId, e.AttemptedAt })
                    .HasDatabaseName("IX_DeliveryLogs_SubscriptionId_AttemptedAt");
            });
            
            // Configure DemeterConfig - only one active config allowed
            modelBuilder.Entity<DemeterConfig>(entity =>
            {
                entity.Property(e => e.GrpcEndpoint)
                    .IsRequired();
                
                entity.Property(e => e.ApiKeyEncrypted)
                    .IsRequired();
                
                entity.Property(e => e.Network)
                    .IsRequired()
                    .HasDefaultValue("Preprod");
                
                // Index to quickly find active config
                entity.HasIndex(e => e.IsActive)
                    .HasDatabaseName("IX_DemeterConfigs_IsActive");
            });
        }
    }
}
