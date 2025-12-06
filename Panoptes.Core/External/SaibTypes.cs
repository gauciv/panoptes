using System.Collections.Generic;
using System.Threading.Tasks;

namespace Panoptes.Core.External
{
    // Simulating the external Saib library types
    public class Transaction
    {
        public string? Address { get; set; }
        public string? PolicyId { get; set; }
        // Other properties...
    }

    public class Block
    {
        public IEnumerable<Transaction> Transactions { get; set; } = new List<Transaction>();
        // Other properties...
    }

    public interface IReducer
    {
        Task ProcessBlockAsync(Block block);
    }
}
