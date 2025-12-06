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

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<WebhookSubscription>(entity =>
            {
                entity.Property(e => e.SecretKey)
                    .IsRequired();

                entity.Property(e => e.TargetUrl)
                    .IsRequired();
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
            });
        }
    }
}
