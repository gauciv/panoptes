using Microsoft.EntityFrameworkCore;
using Panoptes.Core.Entities;
using System.Threading;
using System.Threading.Tasks;

namespace Panoptes.Core.Interfaces
{
    public interface IAppDbContext
    {
        DbSet<WebhookSubscription> WebhookSubscriptions { get; }
        DbSet<DeliveryLog> DeliveryLogs { get; }
        DbSet<SystemState> SystemStates { get; }
        DbSet<DemeterConfig> DemeterConfigs { get; }

        Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    }
}
