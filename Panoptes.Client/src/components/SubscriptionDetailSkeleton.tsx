import React from 'react';
import { Skeleton } from './ui/skeleton';

const SubscriptionDetailSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Nav */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <Skeleton className="h-6 w-6 rounded-full" aria-label="Loading back" />
              <Skeleton className="h-6 w-40" aria-label="Loading title" />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Details Card */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
            <Skeleton className="h-5 w-40" aria-label="Loading section title" />
            <div className="flex gap-3">
              <Skeleton className="h-9 w-28 rounded-md" aria-label="Loading button" />
              <Skeleton className="h-9 w-24 rounded-md" aria-label="Loading button" />
              <Skeleton className="h-9 w-24 rounded-md" aria-label="Loading button" />
            </div>
          </div>
          <div className="px-6 py-5">
            <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              {Array.from({ length: 8 }).map((_, idx) => (
                <div key={idx} className="space-y-2">
                  <Skeleton className="h-4 w-24" aria-label="Loading label" />
                  <Skeleton className="h-5 w-48" aria-label="Loading value" />
                </div>
              ))}
              <div className="sm:col-span-2 space-y-2">
                <Skeleton className="h-4 w-32" aria-label="Loading label" />
                <Skeleton className="h-10 w-full" aria-label="Loading textarea" />
              </div>
              <div className="sm:col-span-2 space-y-2">
                <Skeleton className="h-4 w-40" aria-label="Loading label" />
                <Skeleton className="h-16 w-full" aria-label="Loading list" />
              </div>
            </div>
          </div>
        </div>

        {/* Stats / Cards Placeholder */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="bg-white shadow rounded-lg p-5 space-y-3">
              <Skeleton className="h-4 w-24" aria-label="Loading stat label" />
              <Skeleton className="h-6 w-32" aria-label="Loading stat value" />
              <Skeleton className="h-4 w-20" aria-label="Loading stat subtext" />
            </div>
          ))}
        </div>

        {/* Logs Table Skeleton */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
            <Skeleton className="h-5 w-32" aria-label="Loading logs title" />
            <Skeleton className="h-4 w-20" aria-label="Loading count" />
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {['Time', 'Status', 'Latency', 'Response'].map((key) => (
                      <th key={key} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <Skeleton className="h-4 w-16" aria-label="Loading header" />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-3">
                        <Skeleton className="h-4 w-32" aria-label="Loading time" />
                      </td>
                      <td className="px-4 py-3">
                        <Skeleton className="h-5 w-12 rounded-full" aria-label="Loading status" />
                      </td>
                      <td className="px-4 py-3">
                        <Skeleton className="h-4 w-16" aria-label="Loading latency" />
                      </td>
                      <td className="px-4 py-3">
                        <Skeleton className="h-4 w-40" aria-label="Loading response" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SubscriptionDetailSkeleton;
