import React from 'react';
import { Skeleton } from './ui/skeleton';

interface SubscriptionTableSkeletonProps {
  rows?: number;
}

const SubscriptionTableSkeleton: React.FC<SubscriptionTableSkeletonProps> = ({ rows = 4 }) => {
  const headerCells = [
    'Name',
    'Target URL',
    'Event Type',
    'Status',
    'Rate Limit',
    'Actions',
  ];

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {headerCells.map((key) => (
                <th
                  key={key}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  <Skeleton className="h-4 w-20" aria-label="Loading header" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {Array.from({ length: rows }).map((_, idx) => (
              <tr key={idx}>
                <td className="px-4 py-3 whitespace-nowrap">
                  <Skeleton className="h-4 w-24" aria-label="Loading name" />
                </td>
                <td className="px-4 py-3">
                  <Skeleton className="h-4 w-40" aria-label="Loading target URL" />
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <Skeleton className="h-6 w-24 rounded-full" aria-label="Loading event type" />
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-5 w-20 rounded-full" aria-label="Loading status" />
                    <Skeleton className="h-5 w-20 rounded-full" aria-label="Loading status badge" />
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-xs">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Skeleton className="h-4 w-10" aria-label="Loading rate label" />
                      <Skeleton className="h-4 w-16" aria-label="Loading rate value" />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <Skeleton className="h-4 w-10" aria-label="Loading rate label" />
                      <Skeleton className="h-4 w-16" aria-label="Loading rate value" />
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right">
                  <div className="flex justify-end gap-2">
                    <Skeleton className="h-7 w-12 rounded-md" aria-label="Loading action" />
                    <Skeleton className="h-7 w-12 rounded-md" aria-label="Loading action" />
                    <Skeleton className="h-7 w-12 rounded-md" aria-label="Loading action" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SubscriptionTableSkeleton;
