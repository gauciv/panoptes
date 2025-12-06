using Microsoft.EntityFrameworkCore;
using Panoptes.Core.Entities;
using Panoptes.Core.Interfaces;
using Argus.Sync;
using System.Linq;
using System.Threading.Tasks;

namespace Panoptes.Infrastructure.Services
{
    public class PanoptesReducer : IReducer<Block>
    {
        private readonly IAppDbContext _dbContext;
        private readonly IWebhookDispatcher _dispatcher;

        public PanoptesReducer(IAppDbContext dbContext, IWebhookDispatcher dispatcher)
        {
            _dbContext = dbContext;
            _dispatcher = dispatcher;
        }

        public async Task ProcessBlockAsync(Block block)
        {
            // Fetch all active subscriptions
            var subscriptions = await _dbContext.WebhookSubscriptions
                .Where(s => s.IsActive)
                .AsNoTracking()
                .ToListAsync();

            if (!subscriptions.Any())
            {
                return;
            }

            if (block.Transactions == null)
            {
                return;
            }

            foreach (var transaction in block.Transactions)
            {
                foreach (var sub in subscriptions)
                {
                    if (sub.Matches(transaction.Address, transaction.PolicyId))
                    {
                        // Dispatch the webhook
                        var log = await _dispatcher.DispatchAsync(sub, transaction);

                        // Add the log to the database
                        _dbContext.DeliveryLogs.Add(log);
                    }
                }
            }

            // Update Checkpoint
            var state = await _dbContext.SystemStates.FirstOrDefaultAsync(s => s.Key == "LastSyncedSlot");
            if (state == null)
            {
                state = new SystemState { Key = "LastSyncedSlot", Value = block.Slot.ToString() };
                _dbContext.SystemStates.Add(state);
            }
            else
            {
                state.Value = block.Slot.ToString();
            }

            await _dbContext.SaveChangesAsync();
        }
    }
}
                }
            }

            // Save all delivery logs
            await _dbContext.SaveChangesAsync();
        }
    }
}
