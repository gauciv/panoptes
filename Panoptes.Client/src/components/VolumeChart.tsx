import React, { useMemo } from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Area,
  AreaChart,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { TimeRange, isCustomTimeRange, BucketSize } from '../hooks/useStatsData';

interface VolumeDataPoint {
  date: string;
  count: number;
  label: string;
}

interface VolumeChartProps {
  data: VolumeDataPoint[];
  timeRange: TimeRange;
  isLoading?: boolean;
}

const chartConfig: ChartConfig = {
  count: {
    label: 'Webhooks',
    color: 'hsl(147, 100%, 21%)', // Sentinel Green
  },
};

// Minimum pixels per data point to prevent overlap
const MIN_WIDTH_PER_POINT = 20;
// Minimum container width
const MIN_CONTAINER_WIDTH = 400;
// Maximum labels to show before scrolling is truly needed
const MAX_COMFORTABLE_LABELS = 30;

// Helper to determine bucket size from time range
function getBucketSizeFromTimeRange(timeRange: TimeRange): BucketSize {
  if (isCustomTimeRange(timeRange)) {
    const diffMs = timeRange.endDate.getTime() - timeRange.startDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    
    if (diffDays <= 3) return 'hour';
    if (diffDays <= 90) return 'day';
    if (diffDays <= 365) return 'week';
    return 'month';
  }
  
  return timeRange === '24h' ? 'hour' : 'day';
}

// Helper to determine bucket description based on time range
function getBucketDescription(timeRange: TimeRange): string {
  const bucketSize = getBucketSizeFromTimeRange(timeRange);
  
  switch (bucketSize) {
    case 'hour':
      return 'Hourly';
    case 'day':
      return 'Daily';
    case 'week':
      return 'Weekly';
    case 'month':
      return 'Monthly';
  }
}

// Helper to determine X-axis interval based on time range and data length
function getXAxisInterval(timeRange: TimeRange, dataLength: number): number | 'preserveStartEnd' {
  if (dataLength === 0) return 'preserveStartEnd';
  
  const bucketSize = getBucketSizeFromTimeRange(timeRange);
  
  // Calculate ideal number of visible labels (8-12 is usually readable)
  const idealLabelCount = 10;
  
  switch (bucketSize) {
    case 'hour':
      // For hourly data, show every few hours
      return Math.max(1, Math.floor(dataLength / idealLabelCount));
    case 'day':
      // For daily data, show every few days
      if (dataLength <= 14) return 'preserveStartEnd';
      return Math.max(1, Math.floor(dataLength / idealLabelCount));
    case 'week':
      // For weekly data, show every 2-4 weeks
      if (dataLength <= 12) return 'preserveStartEnd';
      return Math.max(1, Math.floor(dataLength / idealLabelCount));
    case 'month':
      // For monthly data, show every month or every few months
      if (dataLength <= 12) return 'preserveStartEnd';
      return Math.max(1, Math.floor(dataLength / idealLabelCount));
    default:
      return 'preserveStartEnd';
  }
}

// Calculate chart width based on data length
function calculateChartWidth(dataLength: number): number {
  if (dataLength <= MAX_COMFORTABLE_LABELS) {
    return MIN_CONTAINER_WIDTH; // Use container width
  }
  // Calculate minimum width needed to prevent overlap
  return Math.max(MIN_CONTAINER_WIDTH, dataLength * MIN_WIDTH_PER_POINT);
}

// Check if scrolling is needed
function needsScrolling(dataLength: number): boolean {
  return dataLength > MAX_COMFORTABLE_LABELS;
}

const VolumeChart: React.FC<VolumeChartProps> = ({
  data,
  timeRange,
  isLoading = false,
}) => {
  // Calculate chart dimensions
  const chartMetrics = useMemo(() => {
    const scrollNeeded = needsScrolling(data.length);
    const chartWidth = calculateChartWidth(data.length);
    return { scrollNeeded, chartWidth };
  }, [data.length]);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
            <div className="h-3 w-48 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        </div>
        <div className="h-[300px] bg-gray-50 dark:bg-gray-700 rounded animate-pulse" />
      </div>
    );
  }

  const maxCount = Math.max(...data.map(d => d.count), 1);
  const yAxisMax = Math.ceil(maxCount * 1.1); // Add 10% padding

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-mono text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Webhook Volume
          </h3>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            {getBucketDescription(timeRange)} webhook activity
            {chartMetrics.scrollNeeded && (
              <span className="ml-2 text-xs text-gray-300 dark:text-gray-400">(scroll to see more)</span>
            )}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-mono font-semibold text-gray-900 dark:text-gray-100">
            {data.reduce((sum, d) => sum + d.count, 0).toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">total webhooks</p>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center text-gray-400">
          <p>No data available for selected time range</p>
        </div>
      ) : (
        <div 
          className={`relative ${chartMetrics.scrollNeeded ? 'overflow-x-auto' : ''}`}
          style={{ 
            // Add scrollbar styling
            scrollbarWidth: 'thin',
            scrollbarColor: '#d1d5db #f3f4f6'
          }}
        >
          {/* Scroll fade indicator for left side */}
          {chartMetrics.scrollNeeded && (
            <div 
              className="absolute left-0 top-0 bottom-4 w-8 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none"
              style={{ opacity: 0.8 }}
            />
          )}
          
          <ChartContainer 
            config={chartConfig} 
            className="h-[300px]"
            style={{ 
              width: chartMetrics.scrollNeeded ? chartMetrics.chartWidth : '100%',
              minWidth: chartMetrics.scrollNeeded ? chartMetrics.chartWidth : 'auto'
            }}
          >
            <AreaChart
              data={data}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(147, 100%, 21%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(147, 100%, 21%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: '#9ca3af', fontFamily: 'Space Mono, monospace' }}
                tickMargin={8}
                interval={getXAxisInterval(timeRange, data.length)}
              />
              <YAxis
                domain={[0, yAxisMax]}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: '#9ca3af', fontFamily: 'Space Mono, monospace' }}
                tickMargin={8}
                width={40}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => `Time: ${value}`}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="hsl(147, 100%, 21%)"
                strokeWidth={2}
                fill="url(#volumeGradient)"
                dot={false}
                activeDot={{
                  r: 5,
                  fill: 'hsl(147, 100%, 21%)',
                  stroke: '#fff',
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ChartContainer>
          
          {/* Scroll fade indicator for right side */}
          {chartMetrics.scrollNeeded && (
            <div 
              className="absolute right-0 top-0 bottom-4 w-8 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none"
              style={{ opacity: 0.8 }}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default VolumeChart;
