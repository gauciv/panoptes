import React, { useState } from 'react';
import { DeliveryLog, WebhookSubscription } from '../types';
import DeliveryLogsTableSkeleton from './DeliveryLogsTableSkeleton';

interface DeliveryLogsTableProps {
  logs: DeliveryLog[];
  showSubscriptionId?: boolean;
  subscriptions?: WebhookSubscription[]; // Reserved for future subscription name display
  totalCount?: number;
  currentPage?: number;
  pageSize?: number;
  isLoading?: boolean;
}

const DeliveryLogsTable: React.FC<DeliveryLogsTableProps> = ({ 
  logs, 
  showSubscriptionId = false, 
  totalCount,
  currentPage = 1,
  pageSize = 100,
  isLoading = false,
}) => {
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  // Defensive check for undefined logs
  const safeLogs = logs || [];

  if (isLoading) {
    return <DeliveryLogsTableSkeleton showSubscriptionId={showSubscriptionId} />;
  }
  const getStatusBadge = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300) {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">{statusCode}</span>;
    } else if (statusCode >= 400 && statusCode < 500) {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">{statusCode}</span>;
    } else {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">{statusCode}</span>;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const truncateId = (id: string) => {
    return `${id.substring(0, 8)}...`;
  };

  return (
    <div>
      {totalCount !== undefined && totalCount > 0 && (
        <div className="mb-3 px-4 py-2 bg-gray-50 dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-700">
          <span className="text-sm text-gray-600 dark:text-gray-300">
            Showing entries <span className="font-semibold">{((currentPage - 1) * pageSize) + 1}</span> to{' '}
            <span className="font-semibold">{Math.min(currentPage * pageSize, totalCount)}</span> of{' '}
            <span className="font-semibold">{totalCount}</span> total
          </span>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50 dark:bg-gray-900">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Time
            </th>
            {showSubscriptionId && (
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Subscription
              </th>
            )}
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Latency
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Response
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200">
          {safeLogs.length === 0 ? (
            <tr>
              <td colSpan={showSubscriptionId ? 5 : 4} className="px-4 py-8 text-center text-sm text-gray-500">
                No delivery logs found
              </td>
            </tr>
          ) : (
            safeLogs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              return (
                <React.Fragment key={log.id}>
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer" onClick={() => toggleExpand(log.id)}>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <svg className={`w-4 h-4 text-gray-400 dark:text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        {formatTimestamp(log.attemptedAt)}
                      </div>
                    </td>
                    {showSubscriptionId && (
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300">
                        <div className="font-mono text-xs text-gray-400 dark:text-gray-300">{truncateId(log.subscriptionId)}</div>
                      </td>
                    )}
                    <td className="px-4 py-3 text-sm">
                      {getStatusBadge(log.responseStatusCode)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                      {log.latencyMs.toFixed(0)}ms
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300 max-w-xs truncate">
                      {log.responseBody || '—'}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={showSubscriptionId ? 5 : 4} className="px-4 py-4 bg-gray-50 dark:bg-gray-900">
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Payload</p>
                            <pre className="bg-gray-800 text-gray-100 p-3 rounded text-xs overflow-x-auto max-h-96">
                              {(() => {
                                try {
                                  return JSON.stringify(JSON.parse(log.payloadJson || '{}'), null, 2);
                                } catch {
                                  return log.payloadJson || 'No payload';
                                }
                              })()}
                            </pre>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Response</p>
                            <pre className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 p-3 rounded text-xs overflow-x-auto border border-gray-200 dark:border-gray-700 max-h-48">
                              {log.responseBody || 'No response'}
                            </pre>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
};

export default DeliveryLogsTable;
