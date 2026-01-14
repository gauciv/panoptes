import { ChevronLeft, ChevronRight } from 'lucide-react';
import LogViewer from '../LogViewer';
import { DeliveryLog, WebhookSubscription } from '../../types';

interface LiveLogsPanelProps {
  logs: DeliveryLog[];
  subscriptions: WebhookSubscription[];
  currentPage: number;
  totalLogs: number;
  logsPerPage: number;
  onPageChange: (page: number) => void;
}

export function LiveLogsPanel({
  logs,
  subscriptions,
  currentPage,
  totalLogs,
  logsPerPage,
  onPageChange
}: LiveLogsPanelProps) {
  const totalPages = Math.ceil(totalLogs / logsPerPage);

  return (
    <div className="lg:col-span-1" data-tour="recent-logs">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-sm flex flex-col h-full max-h-[700px]">
        <Header />
        <LogsContainer logs={logs} subscriptions={subscriptions} />
        <PaginationFooter
          currentPage={currentPage}
          totalPages={totalPages}
          totalLogs={totalLogs}
          logsPerPage={logsPerPage}
          onPageChange={onPageChange}
        />
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center shrink-0">
      <h2 className="text-sm font-bold font-mono uppercase tracking-widest text-zinc-900 dark:text-zinc-100">
        Live_Logs
      </h2>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
          Realtime
        </span>
      </div>
    </div>
  );
}

function LogsContainer({ logs, subscriptions }: { logs: DeliveryLog[]; subscriptions: WebhookSubscription[] }) {
  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar bg-zinc-50/50 dark:bg-black/20">
      <LogViewer logs={logs || []} subscriptions={subscriptions || []} />
    </div>
  );
}

interface PaginationFooterProps {
  currentPage: number;
  totalPages: number;
  totalLogs: number;
  logsPerPage: number;
  onPageChange: (page: number) => void;
}

function PaginationFooter({ currentPage, totalPages, totalLogs, logsPerPage, onPageChange }: PaginationFooterProps) {
  return (
    <div className="px-4 py-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-white dark:bg-zinc-900 rounded-b-lg">
      <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
        Page {currentPage + 1} / {totalPages || 1}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 0}
          className="p-1 rounded-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={(currentPage + 1) * logsPerPage >= totalLogs}
          className="p-1 rounded-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
        </button>
      </div>
    </div>
  );
}
