import React from 'react';
import { DeliveryLog } from '../types';

interface DeliveryLogsTableProps {
  logs: DeliveryLog[];
  showSubscriptionId?: boolean;
}

const DeliveryLogsTable: React.FC<DeliveryLogsTableProps> = ({ logs, showSubscriptionId = false }) => {
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
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Time
            </th>
            {showSubscriptionId && (
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Subscription
              </th>
            )}
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Latency
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Response
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {logs.length === 0 ? (
            <tr>
              <td colSpan={showSubscriptionId ? 5 : 4} className="px-4 py-8 text-center text-sm text-gray-500">
                No delivery logs found
              </td>
            </tr>
          ) : (
            logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                  {formatTimestamp(log.attemptedAt)}
                </td>
                {showSubscriptionId && (
                  <td className="px-4 py-3 text-sm text-gray-500 font-mono">
                    {truncateId(log.subscriptionId)}
                  </td>
                )}
                <td className="px-4 py-3 text-sm">
                  {getStatusBadge(log.responseStatusCode)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {log.latencyMs.toFixed(0)}ms
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                  {log.responseBody || '—'}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default DeliveryLogsTable;
