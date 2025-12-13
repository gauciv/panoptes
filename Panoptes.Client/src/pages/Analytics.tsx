import React from 'react';
import { 
  Activity, 
  BarChart3, 
  Clock, 
  Wallet, 
  AlertTriangle, 
  Layers, 
  RefreshCw 
} from 'lucide-react';
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
    totalWebhooks,
    successRate,
    avgLatency,
    rateLimitedCount,
    
    // Value Metrics
    totalVolumeAda,
    topSourceWallet,
    topSourceCount,
    
    // Chart Data
    volumeData,
    distributionData,
    heatmapData,
    
    isLoading,
    error,
    timeRange,
    setTimeRange,
    refetch,
  } = useStatsData(subscriptions);

  // --- ERROR STATE ---
  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-950/20 border-l-4 border-red-500 p-6 shadow-sm rounded-sm">
        <div className="flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-red-600 mt-0.5" />
          <div>
            <h3 className="font-mono font-bold text-red-800 dark:text-red-400 uppercase tracking-wider">
              Telemetry Load Failure
            </h3>
            <p className="font-mono text-sm text-red-700 dark:text-red-300 mt-2 mb-4">
              Unable to retrieve analytics data from the aggregation engine.
            </p>
            <button 
              onClick={refetch} 
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-mono text-xs uppercase tracking-wider rounded-sm flex items-center gap-2 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry_Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- MAIN CONTENT ---
  return (
    <div className="space-y-8">
      
      {/* 1. Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 font-mono uppercase tracking-tight flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-zinc-500" />
            Performance_Deep_Dive
          </h2>
          <p className="text-xs font-mono text-zinc-500 mt-1">
            LATENCY ANALYSIS | TRAFFIC PATTERNS | VALUE TRANSFER
          </p>
        </div>
        <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
      </div>

      {/* 2. Primary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Volume */}
        <StatCard
          title="Total Volume"
          value={isLoading ? 'CALCULATING...' : `₳ ${totalVolumeAda.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          subtitle="ASSET_TRANSFER_VALUE"
          icon={<Activity className="w-5 h-5" />}
        />
        
        {/* Success Rate */}
        <StatCard
          title="Success Rate"
          value={isLoading ? '...' : `${successRate}%`}
          subtitle="HTTP_2XX_RATIO"
          trend={successRate >= 99 ? 'up' : 'down'}
          trendValue={successRate >= 99 ? 'OPTIMAL' : 'DEGRADED'}
          icon={<div className="font-mono font-bold text-xs">OK</div>}
        />

        {/* Avg Latency */}
        <StatCard
          title="Avg Latency"
          value={isLoading ? '...' : `${avgLatency}ms`}
          subtitle="RESPONSE_TIME"
          trend={avgLatency <= 500 ? 'up' : 'neutral'}
          trendValue={avgLatency <= 200 ? 'FAST' : 'NORMAL'}
          icon={<Clock className="w-5 h-5" />}
        />
        
        {/* Top Source */}
        <StatCard
          title="Top Source"
          value={isLoading ? '...' : (topSourceWallet ? `${topSourceWallet.slice(0, 8)}...` : 'NONE')}
          subtitle={topSourceWallet ? `EVENTS: ${topSourceCount}` : 'NO_ACTIVITY'}
          icon={<Wallet className="w-5 h-5" />}
        />
      </div>

      {/* 3. Secondary Metrics (Dense Row) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          title="Rate Limited"
          value={isLoading ? '...' : rateLimitedCount.toString()}
          subtitle="HTTP_429_THROTTLED"
          trend={rateLimitedCount === 0 ? 'up' : 'down'}
          alertColor={rateLimitedCount > 0 ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-900' : undefined}
          icon={<AlertTriangle className="w-5 h-5" />}
        />
        <StatCard
          title="Total Events"
          value={isLoading ? '...' : totalWebhooks.toLocaleString()}
          subtitle="LOG_AGGREGATION_COUNT"
          icon={<Layers className="w-5 h-5" />}
        />
      </div>

      {/* 4. Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm shadow-sm p-4">
            <VolumeChart data={volumeData} timeRange={timeRange} isLoading={isLoading} />
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm shadow-sm p-4 overflow-hidden">
            <DistributionChart data={distributionData} isLoading={isLoading} />
        </div>
      </div>

      {/* 5. Heatmap Section */}
      <div className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm shadow-sm p-4 overflow-hidden">
        <ActivityHeatmap data={heatmapData} isLoading={isLoading} />
      </div>
    </div>
  );
};

export default AnalyticsPage;