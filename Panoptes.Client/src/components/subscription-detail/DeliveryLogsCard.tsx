import { useState } from 'react';
import { Download, ChevronDown, ChevronUp } from 'lucide-react';
import { DeliveryLog } from '../../types';
import Pagination from '../Pagination';

interface DeliveryLogsCardProps {
  logs: DeliveryLog[];
  totalLogs: number;
  currentPage: number;
  itemsPerPage: number;
  loading: boolean;
  onPageChange: (page: number) => void;
  onExport: (format: 'csv' | 'json') => void;
}

export function DeliveryLogsCard({
  logs,
  totalLogs,
  currentPage,
  itemsPerPage,
  loading,
  onPageChange,
  onExport
}: DeliveryLogsCardProps) {
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const toggleRow = (id: string) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-sm border border-zinc-300 dark:border-zinc-700 overflow-hidden mb-10 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.05)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.05)]">
      <Header onExport={onExport} />

      {loading ? (
        <LoadingState />
      ) : totalLogs === 0 ? (
        <EmptyState />
      ) : (
        <LogsTable logs={logs} expandedLogId={expandedLogId} onToggleRow={toggleRow} />
      )}

      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
        <Pagination
          currentPage={currentPage}
          totalItems={totalLogs}
          itemsPerPage={itemsPerPage}
          onPageChange={onPageChange}
        />
      </div>
    </div>
  );
}

function Header({ onExport }: { onExport: (format: 'csv' | 'json') => void }) {
  return (
    <div className="px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
      <h3 className="text-xs font-mono font-bold text-zinc-500 uppercase tracking-widest">
        Delivery Logs
      </h3>

      <div className="flex gap-2 self-start sm:self-auto">
        <ExportButton format="json" onClick={() => onExport('json')} />
        <ExportButton format="csv" onClick={() => onExport('csv')} />
      </div>
    </div>
  );
}

function ExportButton({ format, onClick }: { format: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider border border-zinc-300 dark:border-zinc-600 rounded-sm bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center gap-1.5 transition-colors"
    >
      <Download className="w-3 h-3" />
      {format.toUpperCase()}
    </button>
  );
}

function LoadingState() {
  return (
    <div className="p-12 text-center font-mono text-xs text-zinc-500">
      INITIALIZING_LOG_STREAM...
    </div>
  );
}

function EmptyState() {
  return (
    <div className="p-12 text-center text-zinc-500 dark:text-zinc-400 font-mono text-xs">
      NO_DATA_AVAILABLE
    </div>
  );
}

interface LogsTableProps {
  logs: DeliveryLog[];
  expandedLogId: string | null;
  onToggleRow: (id: string) => void;
}

function LogsTable({ logs, expandedLogId, onToggleRow }: LogsTableProps) {
  return (
    <div>
      <TableHeader />
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {logs.map((log) => (
          <LogRow
            key={log.id}
            log={log}
            isExpanded={expandedLogId === log.id}
            onToggle={() => onToggleRow(log.id)}
          />
        ))}
      </div>
    </div>
  );
}

function TableHeader() {
  return (
    <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-2 text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800">
      <div className="col-span-3">Timestamp</div>
      <div className="col-span-2">Status</div>
      <div className="col-span-2">Duration</div>
      <div className="col-span-5">Result</div>
    </div>
  );
}

interface LogRowProps {
  log: DeliveryLog;
  isExpanded: boolean;
  onToggle: () => void;
}

function LogRow({ log, isExpanded, onToggle }: LogRowProps) {
  const timeValue = (log as any).attemptedAt || (log as any).createdAt || (log as any).timestamp;
  const isThrottled = log.responseStatusCode === 429;

  return (
    <div className={`group transition-colors ${isExpanded ? 'bg-zinc-50 dark:bg-zinc-900/50' : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/30'}`}>
      <div
        onClick={onToggle}
        className="px-6 py-3 cursor-pointer flex flex-col md:grid md:grid-cols-12 gap-2 md:gap-4 items-start md:items-center"
      >
        <MobileHeader statusCode={log.responseStatusCode} timeValue={timeValue} />
        <DesktopTimestamp timeValue={timeValue} />
        <DesktopStatus statusCode={log.responseStatusCode} />
        <Latency latencyMs={log.latencyMs} />
        <Result log={log} isThrottled={isThrottled} isExpanded={isExpanded} />
      </div>

      {isExpanded && <ExpandedContent log={log} />}
    </div>
  );
}

function MobileHeader({ statusCode, timeValue }: { statusCode: number; timeValue: string }) {
  return (
    <div className="flex md:hidden w-full justify-between items-center mb-1">
      <StatusBadge statusCode={statusCode} />
      <div className="text-xs text-zinc-500 font-mono">
        {timeValue ? new Date(timeValue).toLocaleTimeString() : 'N/A'}
      </div>
    </div>
  );
}

function DesktopTimestamp({ timeValue }: { timeValue: string }) {
  return (
    <div className="hidden md:block col-span-3 text-zinc-600 dark:text-zinc-300 font-mono text-xs">
      {timeValue ? (
        <>
          {new Date(timeValue).toLocaleTimeString()}{' '}
          <span className="text-zinc-400 text-[10px]">
            {new Date(timeValue).toLocaleDateString()}
          </span>
        </>
      ) : (
        <span className="text-zinc-400">N/A</span>
      )}
    </div>
  );
}

function DesktopStatus({ statusCode }: { statusCode: number }) {
  return (
    <div className="hidden md:block col-span-2 font-mono">
      <StatusBadge statusCode={statusCode} />
    </div>
  );
}

function Latency({ latencyMs }: { latencyMs: number }) {
  return (
    <div className="col-span-2 font-mono text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
      <span className="md:hidden font-bold">Latency:</span> {latencyMs}ms
    </div>
  );
}

function Result({ log, isThrottled, isExpanded }: { log: DeliveryLog; isThrottled: boolean; isExpanded: boolean }) {
  const response = getResponse(log);

  return (
    <div className="col-span-5 w-full font-mono text-xs text-zinc-500 dark:text-zinc-400 truncate flex items-center gap-2">
      <div className="md:hidden mr-1">
        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </div>
      {isThrottled && (
        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-tight whitespace-nowrap">
          [Rate Limit]
        </span>
      )}
      <span className={`truncate ${isThrottled ? 'opacity-75' : ''}`}>{response}</span>
    </div>
  );
}

function StatusBadge({ statusCode }: { statusCode: number }) {
  if (statusCode >= 200 && statusCode < 300) {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
        200 OK
      </span>
    );
  }
  if (statusCode === 429) {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] font-mono font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
        429 LIMIT
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] font-mono font-bold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800">
      {statusCode} ERR
    </span>
  );
}

function ExpandedContent({ log }: { log: DeliveryLog }) {
  const payload = getPayload(log);
  const response = getResponse(log);

  return (
    <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 animate-in slide-in-from-top-1">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <JsonSection title="Payload" content={payload} />
        <JsonSection title="Server Response" content={response} showCopy={false} />
      </div>
    </div>
  );
}

function JsonSection({ title, content, showCopy = true }: { title: string; content: string; showCopy?: boolean }) {
  const formatted = formatJson(content);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">{title}</h4>
        {showCopy && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(formatted);
            }}
            className="text-[10px] font-mono font-bold text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 uppercase tracking-wider"
          >
            Copy
          </button>
        )}
      </div>
      <div className="bg-zinc-50 dark:bg-zinc-900 rounded-sm border border-zinc-200 dark:border-zinc-800 p-3 overflow-x-auto max-h-60 custom-scrollbar max-w-[calc(100vw-4rem)]">
        <pre className="text-xs font-mono text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap break-all">
          {formatted}
        </pre>
      </div>
    </div>
  );
}

function getPayload(log: any): string {
  return log.payloadJson || log.PayloadJson || log.requestPayload || log.RequestPayload || '{}';
}

function getResponse(log: any): string {
  const body = log.responseBody || log.ResponseBody;
  if (body === '') return '(Empty Response)';
  return body || '(No content)';
}

function formatJson(data: string | object): string {
  try {
    if (typeof data === 'string') {
      if (data.trim().startsWith('{') || data.trim().startsWith('[')) {
        return JSON.stringify(JSON.parse(data), null, 2);
      }
      return data;
    }
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}
