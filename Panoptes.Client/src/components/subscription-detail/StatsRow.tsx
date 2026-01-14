import { Server, Check, Clock, Activity } from 'lucide-react';
import { WebhookSubscription } from '../../types';

interface StatsCardProps {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  alertColor?: string;
}

export function StatsCard({ label, value, icon: Icon, alertColor }: StatsCardProps) {
  const baseClasses = 'p-4 rounded-sm border transition-all';
  const colorClasses = alertColor
    ? alertColor
    : 'bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.05)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.05)]';

  return (
    <div className={`${baseClasses} ${colorClasses}`}>
      <div className="flex justify-between items-start mb-2">
        <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          {label}
        </p>
        <Icon className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
      </div>
      <p className={`text-2xl font-mono font-bold ${alertColor && !alertColor.includes('bg-white') ? 'text-red-700 dark:text-red-400' : 'text-zinc-900 dark:text-zinc-100'}`}>
        {value}
      </p>
    </div>
  );
}

interface StatsRowProps {
  totalLogs: number;
  successRate: string;
  avgLatency: string;
  usageLastMinute: number;
  subscription: WebhookSubscription;
}

export function StatsRow({ totalLogs, successRate, avgLatency, usageLastMinute, subscription }: StatsRowProps) {
  const showAlert = totalLogs > 0 && successRate === '0%';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatsCard label="Total Deliveries" value={String(totalLogs)} icon={Server} />
      <StatsCard
        label="Success Rate"
        value={successRate}
        icon={Check}
        alertColor={showAlert ? 'bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-800' : undefined}
      />
      <StatsCard label="Avg Latency" value={avgLatency} icon={Clock} />
      <RateUsageCard
        usageLastMinute={usageLastMinute}
        maxPerMinute={subscription.maxWebhooksPerMinute}
      />
    </div>
  );
}

interface RateUsageCardProps {
  usageLastMinute: number;
  maxPerMinute: number;
}

function RateUsageCard({ usageLastMinute, maxPerMinute }: RateUsageCardProps) {
  const percentage = Math.min(100, (usageLastMinute / maxPerMinute) * 100);
  const isAtLimit = usageLastMinute >= maxPerMinute;

  return (
    <div className="p-4 rounded-sm border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.05)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.05)]">
      <div className="flex justify-between items-start mb-2">
        <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Rate Usage (1m)
        </p>
        <Activity className="w-4 h-4 text-zinc-400" />
      </div>
      <div className="flex items-baseline gap-1 mb-2">
        <span className="text-2xl font-mono font-bold text-zinc-900 dark:text-zinc-100">
          {usageLastMinute}
        </span>
        <span className="text-xs font-mono text-zinc-400">/ {maxPerMinute}</span>
      </div>
      <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-sm overflow-hidden border border-zinc-200 dark:border-zinc-700">
        <div
          className={`h-full ${isAtLimit ? 'bg-amber-500' : 'bg-emerald-500'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
