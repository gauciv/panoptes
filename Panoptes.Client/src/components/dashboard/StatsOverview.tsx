import { useState } from 'react';
import { Activity, Inbox, RefreshCw, ChevronUp, ChevronDown } from 'lucide-react';
import StatCard from '../StatCard';
import { DeliveryLog } from '../../types';

interface StatsOverviewProps {
  activeCount: number;
  totalLogs: number;
  logs: DeliveryLog[];
}

export function StatsOverview({ activeCount, totalLogs, logs }: StatsOverviewProps) {
  const [isOpen, setIsOpen] = useState(true);

  const successRate = logs.length > 0
    ? Math.round((logs.filter(l => l.responseStatusCode >= 200 && l.responseStatusCode < 300).length / logs.length) * 100)
    : 0;

  return (
    <div className="space-y-4" data-tour="stats-overview">
      <MobileToggle isOpen={isOpen} onToggle={() => setIsOpen(!isOpen)} />

      <div className={`
        ${isOpen ? 'flex' : 'hidden'}
        flex-col gap-4
        sm:grid sm:grid-cols-3
        transition-all duration-300 ease-in-out
      `}>
        <StatCard
          title="Active Hooks"
          value={activeCount.toString()}
          icon={<Activity className="w-5 h-5" />}
        />
        <StatCard
          title="Total Events"
          value={totalLogs.toString()}
          icon={<Inbox className="w-5 h-5" />}
        />
        <StatCard
          title="Success Rate"
          value={`${successRate}%`}
          icon={<RefreshCw className="w-5 h-5" />}
        />
      </div>
    </div>
  );
}

function MobileToggle({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="flex md:hidden items-center justify-between">
      <div className="flex items-center gap-2">
        <Activity className="w-4 h-4 text-zinc-500" />
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-500">
          System Telemetry
        </h3>
      </div>
      <button
        onClick={onToggle}
        className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-sm text-xs font-mono font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider shadow-sm active:translate-y-px transition-all"
      >
        {isOpen ? 'Hide' : 'Show'}
        {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}
