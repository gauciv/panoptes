namespace Panoptes.Infrastructure.Services
{
    public class RateLimiter
    {
        private readonly Dictionary<Guid, (Queue<DateTime> minuteWindow, Queue<DateTime> hourWindow)> _tracking = new();
        private readonly HashSet<Guid> _disabledDuringProcessing = new();

        public record RateLimitResult(bool Allowed, string? Window, int? RetryInSeconds);

        public RateLimitResult Check(Guid subscriptionId, int maxPerMinute, int maxPerHour)
        {
            if (maxPerMinute == 0 && maxPerHour == 0)
                return new RateLimitResult(true, null, null);

            var now = DateTime.UtcNow;

            if (!_tracking.ContainsKey(subscriptionId))
                _tracking[subscriptionId] = (new Queue<DateTime>(), new Queue<DateTime>());

            var (minuteWindow, hourWindow) = _tracking[subscriptionId];

            while (minuteWindow.Count > 0 && (now - minuteWindow.Peek()).TotalMinutes > 1)
                minuteWindow.Dequeue();

            while (hourWindow.Count > 0 && (now - hourWindow.Peek()).TotalHours > 1)
                hourWindow.Dequeue();

            if (maxPerMinute > 0 && minuteWindow.Count >= maxPerMinute)
            {
                _disabledDuringProcessing.Add(subscriptionId);
                int retryIn = 60 - (int)(now - (minuteWindow.Count > 0 ? minuteWindow.Peek() : now)).TotalSeconds;
                return new RateLimitResult(false, "minute", Math.Max(retryIn, 1));
            }

            if (maxPerHour > 0 && hourWindow.Count >= maxPerHour)
            {
                _disabledDuringProcessing.Add(subscriptionId);
                int retryIn = 3600 - (int)(now - (hourWindow.Count > 0 ? hourWindow.Peek() : now)).TotalSeconds;
                return new RateLimitResult(false, "hour", Math.Max(retryIn, 60));
            }

            minuteWindow.Enqueue(now);
            hourWindow.Enqueue(now);
            return new RateLimitResult(true, null, null);
        }

        public bool IsDisabled(Guid subscriptionId) => _disabledDuringProcessing.Contains(subscriptionId);

        public void MarkDisabled(Guid subscriptionId) => _disabledDuringProcessing.Add(subscriptionId);

        public void ClearDisabled() => _disabledDuringProcessing.Clear();

        public void CleanupStaleEntries(IEnumerable<Guid> activeIds)
        {
            var activeSet = activeIds.ToHashSet();
            var staleIds = _tracking.Keys.Where(id => !activeSet.Contains(id)).ToList();
            foreach (var id in staleIds)
                _tracking.Remove(id);
        }
    }
}
