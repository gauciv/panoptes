import React from 'react';
import { Skeleton } from './ui/skeleton';

interface DeliveryLogsTableSkeletonProps {
  showSubscriptionId?: boolean;
  rowCount?: number;
}

const DeliveryLogsTableSkeleton: React.FC<DeliveryLogsTableSkeletonProps> = ({
  showSubscriptionId = false,
  rowCount = 6,
}) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <Skeleton className="h-4 w-16" aria-label="Loading header" />
            </th>
            {showSubscriptionId && (
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <Skeleton className="h-4 w-24" aria-label="Loading header" />
              </th>
            )}
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <Skeleton className="h-4 w-16" aria-label="Loading header" />
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <Skeleton className="h-4 w-16" aria-label="Loading header" />
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <Skeleton className="h-4 w-20" aria-label="Loading header" />
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {Array.from({ length: rowCount }).map((_, idx) => (
            <tr key={idx} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                <Skeleton className="h-4 w-32" aria-label="Loading time" />
              </td>
              {showSubscriptionId && (
                <td className="px-4 py-3 text-sm text-gray-500">
                  <Skeleton className="h-4 w-24" aria-label="Loading subscription id" />
                </td>
              )}
              <td className="px-4 py-3 text-sm">
                <Skeleton className="h-5 w-12 rounded-full" aria-label="Loading status" />
              </td>
              <td className="px-4 py-3 text-sm text-gray-900">
                <Skeleton className="h-4 w-16" aria-label="Loading latency" />
              </td>
              <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                <Skeleton className="h-4 w-48" aria-label="Loading response" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DeliveryLogsTableSkeleton;
