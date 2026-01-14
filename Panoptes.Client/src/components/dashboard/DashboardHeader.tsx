import { Terminal, AlertCircle } from 'lucide-react';

interface SystemInfo {
  network: string;
  hasApiKey: boolean;
}

interface DashboardHeaderProps {
  systemInfo: SystemInfo | null;
}

export function DashboardHeader({ systemInfo }: DashboardHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
      <div>
        <h1 className="text-xl font-bold font-mono uppercase tracking-tight flex items-center gap-3">
          <Terminal className="w-6 h-6 text-zinc-500" />
          Mission_Control
        </h1>
        <p className="text-xs font-mono text-zinc-500 mt-1">SYSTEM_VERSION: v1.2.0 | BUILD_8821</p>
      </div>

      {systemInfo && (
        <div className="flex items-center gap-3">
          <NetworkBadge network={systemInfo.network} />
          {!systemInfo.hasApiKey && <NoApiKeyBadge />}
        </div>
      )}
    </div>
  );
}

function NetworkBadge({ network }: { network: string }) {
  const isMainnet = network === 'Mainnet';
  const colorClasses = isMainnet
    ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400'
    : 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/20 dark:border-indigo-800 dark:text-indigo-400';
  const dotColor = isMainnet ? 'bg-emerald-500' : 'bg-indigo-500';

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-sm border ${colorClasses}`}>
      <div className={`w-2 h-2 rounded-full ${dotColor} animate-pulse`} />
      <span className="text-xs font-mono font-bold uppercase tracking-wider">{network}</span>
    </div>
  );
}

function NoApiKeyBadge() {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-sm border bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
      <AlertCircle className="w-3 h-3" />
      <span className="text-xs font-mono font-bold uppercase tracking-wider">NO_API_KEY</span>
    </div>
  );
}
