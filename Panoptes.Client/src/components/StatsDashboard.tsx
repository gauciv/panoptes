import React from 'react';
import StatCard from './StatCard';
import TimeRangeSelector from './TimeRangeSelector';
import VolumeChart from './VolumeChart';
import DistributionChart from './DistributionChart';
import { useStatsData, formatTimeRangeLabel, isCustomTimeRange } from '../hooks/useStatsData';
import { WebhookSubscription } from '../types';

interface StatsDashboardProps {
  subscriptions: WebhookSubscription[];
}

const StatsDashboard: React.FC<StatsDashboardProps> = ({ subscriptions }) => {
  const {
    totalWebhooks,
    successRate,
    avgLatency,
    rateLimitedCount,
    volumeData,
    distributionData,
    isLoading,
    error,
    timeRange,
    setTimeRange,
    refetch,
  } = useStatsData(subscriptions);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-800 font-medium mb-2">Failed to load statistics</p>
        <button onClick={refetch} className="px-4 py-2 bg-red-600 text-white rounded-md">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Analytics Overview</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Historical performance metrics
          </p>
        </div>
        <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
      </div>

      {/* 4 Cards - Critical since Top Header is hidden on this page */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Events"
          value={isLoading ? '—' : totalWebhooks.toLocaleString()}
          subtitle={isCustomTimeRange(timeRange) ? formatTimeRangeLabel(timeRange) : `in last ${formatTimeRangeLabel(timeRange)}`}
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
        />
        <StatCard
          title="Success Rate"
          value={isLoading ? '—' : `${successRate}%`}
          subtitle="HTTP 2xx"
          trend={successRate >= 95 ? 'up' : 'down'}
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          title="Avg Latency"
          value={isLoading ? '—' : `${avgLatency}ms`}
          subtitle="Response time"
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          title="Rate Limited"
          value={isLoading ? '—' : rateLimitedCount}
          subtitle="Throttled events"
          trend={rateLimitedCount === 0 ? 'up' : 'down'}
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <VolumeChart data={volumeData} timeRange={timeRange} isLoading={isLoading} />
        <DistributionChart data={distributionData} isLoading={isLoading} />
      </div>
    </div>
  );
};

export default StatsDashboard;