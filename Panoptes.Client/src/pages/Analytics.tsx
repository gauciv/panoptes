import React from 'react';
import StatCard from '../components/StatCard';
import TimeRangeSelector from '../components/TimeRangeSelector';
import VolumeChart from '../components/VolumeChart';
import DistributionChart from '../components/DistributionChart';
import ActivityHeatmap from '../components/ActivityHeatMap';
import { useStatsData } from '../hooks/useStatsData';
import { WebhookSubscription } from '../types';

interface AnalyticsPageProps {
  subscriptions: WebhookSubscription[];
}

const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ subscriptions }) => {
  const {
    totalWebhooks,      // Restored
    successRate,
    avgLatency,
    rateLimitedCount,   // Restored
    
    // New Value Metrics
    totalVolumeAda,
    topSourceWallet,
    topSourceCount,
    
    volumeData,
    distributionData,
    heatmapData,        // New Heatmap Data
    
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
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Performance Deep Dive</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Latency analysis, value transfer, and traffic patterns
          </p>
        </div>
        <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
      </div>

      {/* Metric Cards Grid - Now displaying 4 key metrics (You can swap these as needed) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Volume (Value) */}
        <StatCard
          title="Total Volume"
          value={isLoading ? '—' : `₳ ${totalVolumeAda.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          subtitle="ADA transferred"
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        
        {/* 2. Success Rate (Health) */}
        <StatCard
          title="Success Rate"
          value={isLoading ? '—' : `${successRate}%`}
          subtitle="HTTP 2xx responses"
          trend={successRate >= 99 ? 'up' : 'down'}
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />

        {/* 3. Avg Latency (Performance) */}
        <StatCard
          title="Avg Latency"
          value={isLoading ? '—' : `${avgLatency}ms`}
          subtitle="Response time"
          trend={avgLatency <= 500 ? 'up' : 'neutral'}
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        
        {/* 4. Top Source (Behavior) */}
        <StatCard
          title="Top Source"
          value={isLoading ? '—' : (topSourceWallet || 'None')}
          subtitle={topSourceWallet ? `${topSourceCount} events` : 'No activity'}
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
        />
      </div>

      {/* Secondary Metrics Row (Optional - "Rate Limited" and "Total Events" restored here) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
         <StatCard
          title="Rate Limited"
          value={isLoading ? '—' : rateLimitedCount}
          subtitle="Throttled events (429)"
          trend={rateLimitedCount === 0 ? 'up' : 'down'}
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
        />
         <StatCard
          title="Total Events"
          value={isLoading ? '—' : totalWebhooks.toLocaleString()}
          subtitle="Total logs in period"
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <VolumeChart data={volumeData} timeRange={timeRange} isLoading={isLoading} />
        <DistributionChart data={distributionData} isLoading={isLoading} />
      </div>

      {/* Heatmap Row */}
      <div className="w-full">
        <ActivityHeatmap data={heatmapData} isLoading={isLoading} />
      </div>
    </div>
  );
};

export default AnalyticsPage;