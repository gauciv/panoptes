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
                entity.Property(e => e.SecretKey).IsRequired();
                entity.Property(e => e.TargetUrl).IsRequired();
                
                // FIX: Explicitly handle List<string> <-> JSONB conversion with Null Safety
                entity.Property(e => e.WalletAddresses)
                    .HasColumnType("jsonb")
                    .HasConversion(
                        // 1. Serialize: List<string>? -> string
                        v => System.Text.Json.JsonSerializer.Serialize(v ?? new List<string>(), (System.Text.Json.JsonSerializerOptions?)null),
                        
                        // 2. Deserialize: string -> List<string>
                        // We use '!' to assert that our coalesce ?? will ensure a non-null result
                        v => System.Text.Json.JsonSerializer.Deserialize<List<string>>(v, (System.Text.Json.JsonSerializerOptions?)null) ?? new List<string>()
                    )
                    .Metadata.SetValueComparer(new Microsoft.EntityFrameworkCore.ChangeTracking.ValueComparer<List<string>>(
                        // Compare: Safe serialization comparison
                        (c1, c2) => System.Text.Json.JsonSerializer.Serialize(c1 ?? new List<string>(), (System.Text.Json.JsonSerializerOptions?)null) == 
                                    System.Text.Json.JsonSerializer.Serialize(c2 ?? new List<string>(), (System.Text.Json.JsonSerializerOptions?)null),
                        
                        // HashCode: Aggregate hash
                        c => c == null ? 0 : c.Aggregate(0, (a, v) => HashCode.Combine(a, v.GetHashCode())),
                        
                        // Snapshot: Deep copy via serialization
                        c => System.Text.Json.JsonSerializer.Deserialize<List<string>>(
                            System.Text.Json.JsonSerializer.Serialize(c ?? new List<string>(), (System.Text.Json.JsonSerializerOptions?)null), 
                            (System.Text.Json.JsonSerializerOptions?)null) ?? new List<string>()
                    ));
            });
            
            // ... Rest of your configuration remains the same ...
            modelBuilder.Entity<DeliveryLog>(entity =>
            {
                entity.HasOne(d => d.Subscription)
                    .WithMany()
                    .HasForeignKey(d => d.SubscriptionId)
                    .OnDelete(DeleteBehavior.Cascade);
                    
                entity.Property(e => e.Status)
                    .HasConversion<string>();
                
                entity.HasIndex(e => e.SubscriptionId).HasDatabaseName("IX_DeliveryLogs_SubscriptionId");
                entity.HasIndex(e => e.AttemptedAt).HasDatabaseName("IX_DeliveryLogs_AttemptedAt");
                entity.HasIndex(e => new { e.SubscriptionId, e.AttemptedAt })
                    .HasDatabaseName("IX_DeliveryLogs_SubscriptionId_AttemptedAt");
            });
            
            modelBuilder.Entity<DemeterConfig>(entity =>
            {
                entity.Property(e => e.GrpcEndpoint).IsRequired();
                entity.Property(e => e.ApiKeyEncrypted).IsRequired();
                entity.Property(e => e.Network).IsRequired().HasDefaultValue("Preprod");
                
                entity.HasIndex(e => e.IsActive).HasDatabaseName("IX_DemeterConfigs_IsActive");
            });
        }
    }
}