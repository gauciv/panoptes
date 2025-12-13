import { useState, useEffect, useMemo, useCallback } from 'react';
import { getLogs } from '../services/api';
import { DeliveryLog, WebhookSubscription } from '../types';

// Preset time ranges
export type PresetTimeRange = '24h' | '7d' | '30d';

// Custom date range with explicit start and end dates
export interface CustomTimeRange {
  type: 'custom';
  startDate: Date;
  endDate: Date;
}

// Combined TimeRange type supporting both presets and custom ranges
export type TimeRange = PresetTimeRange | CustomTimeRange;

// Type guard to check if a TimeRange is a custom range
export function isCustomTimeRange(timeRange: TimeRange): timeRange is CustomTimeRange {
  return typeof timeRange === 'object' && timeRange.type === 'custom';
}

// Type guard to check if a TimeRange is a preset
export function isPresetTimeRange(timeRange: TimeRange): timeRange is PresetTimeRange {
  return typeof timeRange === 'string';
}

// Format time range for display
export function formatTimeRangeLabel(timeRange: TimeRange): string {
  if (isCustomTimeRange(timeRange)) {
    const startStr = timeRange.startDate.toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric',
      year: timeRange.startDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
    const endStr = timeRange.endDate.toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric',
      year: timeRange.endDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
    return `${startStr} - ${endStr}`;
  }
  
  switch (timeRange) {
    case '24h': return '24 hours';
    case '7d': return '7 days';
    case '30d': return '30 days';
    default: return '7 days';
  }
}

interface VolumeDataPoint {
  date: string;
  count: number;
  label: string;
}

interface DistributionDataPoint {
  eventType: string;
  count: number;
  percentage: number;
  fill: string;
}

// NEW: Interface for Heatmap Data
interface HeatmapDataPoint {
  hour: number; // 0-23
  count: number;
  intensity: number; // 0.0 - 1.0 for coloring
}

interface StatsData {
  totalWebhooks: number;
  successRate: number;
  avgLatency: number;
  rateLimitedCount: number;

  // NEW: Value Metrics
  totalVolumeAda: number;
  topSourceWallet: string | null;
  topSourceCount: number;
  
  volumeData: VolumeDataPoint[];
  distributionData: DistributionDataPoint[];
  heatmapData: HeatmapDataPoint[]; // NEW
  
  isLoading: boolean;
  error: string | null;
}

// Chart colors from design system
const CHART_COLORS = [
  'hsl(147, 100%, 21%)',  // chart-1 - Sentinel Green
  'hsl(160, 60%, 45%)',   // chart-2
  'hsl(30, 80%, 55%)',    // chart-3
  'hsl(280, 65%, 60%)',   // chart-4
  'hsl(340, 75%, 55%)',   // chart-5
];

// Bucket size types for different time range granularities
export type BucketSize = 'hour' | 'day' | 'week' | 'month';

interface TimeRangeParams {
  hours: number;
  bucketSize: BucketSize;
  startDate?: Date;
  endDate?: Date;
}

// Determine the appropriate bucket size based on the number of days in the range
function determineBucketSize(diffDays: number): BucketSize {
  if (diffDays <= 3) {
    return 'hour';
  } else if (diffDays <= 90) {
    return 'day';
  } else if (diffDays <= 365) {
    return 'week';
  } else {
    return 'month';
  }
}

function getTimeRangeParams(timeRange: TimeRange): TimeRangeParams {
  // Handle custom time range
  if (isCustomTimeRange(timeRange)) {
    const diffMs = timeRange.endDate.getTime() - timeRange.startDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffHours / 24;
    
    // Determine bucket size based on range duration
    const bucketSize = determineBucketSize(diffDays);
    
    return {
      hours: diffHours,
      bucketSize,
      startDate: timeRange.startDate,
      endDate: timeRange.endDate,
    };
  }
  
  // Handle preset time ranges
  switch (timeRange) {
    case '24h':
      return { hours: 24, bucketSize: 'hour' };
    case '7d':
      return { hours: 24 * 7, bucketSize: 'day' };
    case '30d':
      return { hours: 24 * 30, bucketSize: 'day' };
    default:
      return { hours: 24 * 7, bucketSize: 'day' };
  }
}

function filterLogsByTimeRange(logs: DeliveryLog[], timeRange: TimeRange): DeliveryLog[] {
  const params = getTimeRangeParams(timeRange);
  
  // For custom ranges, use explicit start and end dates
  if (params.startDate && params.endDate) {
    const startTime = params.startDate.getTime();
    const endTime = params.endDate.getTime();
    
    return logs.filter(log => {
      const logTime = new Date(log.attemptedAt).getTime();
      return logTime >= startTime && logTime <= endTime;
    });
  }
  
  // For preset ranges, calculate cutoff from current time
  const cutoff = new Date(Date.now() - params.hours * 60 * 60 * 1000);
  return logs.filter(log => new Date(log.attemptedAt) >= cutoff);
}

// Helper: Get ISO week number and year for a date
function getISOWeekData(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { year: d.getUTCFullYear(), week };
}

// Helper: Get the start of an ISO week (Monday)
function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Helper: Get the start of a month
function getStartOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

// Helper: Generate bucket key based on bucket size
function getBucketKey(date: Date, bucketSize: BucketSize): string {
  switch (bucketSize) {
    case 'hour':
      return date.toISOString().slice(0, 13); // "2024-01-15T14"
    case 'day':
      return date.toISOString().slice(0, 10); // "2024-01-15"
    case 'week': {
      const { year, week } = getISOWeekData(date);
      return `${year}-W${week.toString().padStart(2, '0')}`; // "2024-W01"
    }
    case 'month':
      return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`; // "2024-01"
  }
}

// Helper: Advance date to next bucket
function advanceToNextBucket(date: Date, bucketSize: BucketSize): void {
  switch (bucketSize) {
    case 'hour':
      date.setHours(date.getHours() + 1);
      break;
    case 'day':
      date.setDate(date.getDate() + 1);
      break;
    case 'week':
      date.setDate(date.getDate() + 7);
      break;
    case 'month':
      date.setMonth(date.getMonth() + 1);
      break;
  }
}

// Helper: Normalize date to start of bucket period
function normalizeToBucketStart(date: Date, bucketSize: BucketSize): Date {
  const d = new Date(date);
  switch (bucketSize) {
    case 'hour':
      d.setMinutes(0, 0, 0);
      break;
    case 'day':
      d.setHours(0, 0, 0, 0);
      break;
    case 'week':
      return getStartOfWeek(d);
    case 'month':
      return getStartOfMonth(d);
  }
  return d;
}

// Helper: Format bucket label based on bucket size
function formatBucketLabel(key: string, bucketSize: BucketSize): string {
  switch (bucketSize) {
    case 'hour': {
      const date = new Date(`${key}:00:00Z`);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    case 'day': {
      const date = new Date(`${key}T00:00:00Z`);
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
    case 'week': {
      // Parse "2024-W01" format
      const [yearStr, weekStr] = key.split('-W');
      const year = parseInt(yearStr);
      const week = parseInt(weekStr);
      // Calculate the date of the Monday of that week
      const jan4 = new Date(year, 0, 4);
      const startOfWeek = new Date(jan4);
      startOfWeek.setDate(jan4.getDate() - jan4.getDay() + 1 + (week - 1) * 7);
      return `W${week} ${startOfWeek.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
    }
    case 'month': {
      // Parse "2024-01" format
      const [yearStr, monthStr] = key.split('-');
      const date = new Date(parseInt(yearStr), parseInt(monthStr) - 1, 1);
      return date.toLocaleDateString([], { month: 'short', year: '2-digit' });
    }
  }
}

function groupLogsByTimeBucket(
  logs: DeliveryLog[],
  timeRange: TimeRange
): VolumeDataPoint[] {
  const params = getTimeRangeParams(timeRange);
  const { bucketSize } = params;
  const buckets: Map<string, number> = new Map();
  
  // Determine start and end dates for bucket generation
  let startDate: Date;
  let endDate: Date;
  
  if (params.startDate && params.endDate) {
    // Custom range: use explicit start and end dates
    startDate = normalizeToBucketStart(new Date(params.startDate), bucketSize);
    endDate = new Date(params.endDate);
    endDate.setHours(23, 59, 59, 999);
  } else {
    // Preset range: calculate from current time going back
    endDate = new Date();
    startDate = normalizeToBucketStart(
      new Date(Date.now() - params.hours * 60 * 60 * 1000),
      bucketSize
    );
  }
  
  // Initialize all buckets with 0
  const currentBucket = new Date(startDate);
  while (currentBucket <= endDate) {
    const key = getBucketKey(currentBucket, bucketSize);
    buckets.set(key, 0);
    advanceToNextBucket(currentBucket, bucketSize);
  }
  
  // Count logs in each bucket
  logs.forEach(log => {
    const logDate = new Date(log.attemptedAt);
    const key = getBucketKey(logDate, bucketSize);
    
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) || 0) + 1);
    }
  });
  
  // Convert to array with formatted labels
  return Array.from(buckets.entries()).map(([key, count]) => ({
    date: key,
    count,
    label: formatBucketLabel(key, bucketSize),
  }));
}

// NEW HELPER: Calculate Hourly Heatmap
function calculateHourlyHeatmap(logs: DeliveryLog[]): HeatmapDataPoint[] {
  const hourCounts = new Array(24).fill(0);
  let maxCount = 0;

  logs.forEach(log => {
    const hour = new Date(log.attemptedAt).getHours(); // 0-23 Local time
    hourCounts[hour]++;
    if (hourCounts[hour] > maxCount) maxCount = hourCounts[hour];
  });

  return hourCounts.map((count, hour) => ({
    hour,
    count,
    intensity: maxCount > 0 ? count / maxCount : 0
  }));
}

// NEW HELPER: Calculate Volume & Top Source
function calculateValueMetrics(logs: DeliveryLog[]): { totalAda: number, topSource: string | null, topSourceCount: number } {
  let totalAda = 0;
  const sourceCounts = new Map<string, number>();

  logs.forEach(log => {
    // 1. Parse Payload
    if (log.payloadJson) {
      try {
        const payload = JSON.parse(log.payloadJson);
        
        // Sum ADA
        if (payload.Metadata && typeof payload.Metadata.TotalOutputAda === 'number') {
          totalAda += payload.Metadata.TotalOutputAda;
        }

        // Identify Source (Wallet Address)
        // Note: We use Subscription Name as a reliable, readable source identifier
        if (payload.SubscriptionName) {
           const source = payload.SubscriptionName;
           sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1);
        }
      } catch (e) {}
    }
  });

  let topSource = null;
  let topSourceCount = 0;
  
  sourceCounts.forEach((count, source) => {
    if (count > topSourceCount) {
      topSourceCount = count;
      topSource = source;
    }
  });

  return { totalAda, topSource, topSourceCount };
}

function groupLogsByEventType(
  logs: DeliveryLog[],
  subscriptions: WebhookSubscription[]
): DistributionDataPoint[] {
  // Create a map for fallback lookup
  const subscriptionMap = new Map(subscriptions.map(s => [s.id, s]));
  const eventTypeCounts: Map<string, number> = new Map();
  
  logs.forEach(log => {
    let eventType = 'Unknown';

    // 1. Try to extract the real event type snapshot from the payload JSON
    if (log.payloadJson) {
      try {
        const payload = JSON.parse(log.payloadJson);
        if (payload.Event) {
          eventType = payload.Event;
        }
      } catch (e) {
        // JSON parse failed, ignore
      }
    }

    // 2. If JSON parsing failed or didn't have Event, try the current subscription list
    if (eventType === 'Unknown' || !eventType) {
       const subscription = subscriptionMap.get(log.subscriptionId);
       if (subscription && subscription.eventType) {
         eventType = subscription.eventType;
       }
    }

    // 3. Fallback for capitalization consistency (Backend sends 'Transaction', UI might use 'transaction')
    // Capitalize first letter to merge them
    if (eventType && eventType !== 'Unknown') {
        eventType = eventType.charAt(0).toUpperCase() + eventType.slice(1);
    }

    eventTypeCounts.set(eventType, (eventTypeCounts.get(eventType) || 0) + 1);
  });
  
  const total = logs.length || 1; 
  
  return Array.from(eventTypeCounts.entries())
    .map(([eventType, count], index) => ({
      eventType,
      count,
      percentage: Math.round((count / total) * 100),
      fill: CHART_COLORS[index % CHART_COLORS.length],
    }))
    .sort((a, b) => b.count - a.count);
}

function calculateSuccessRate(logs: DeliveryLog[]): number {
  if (logs.length === 0) return 0;
  
  const successfulLogs = logs.filter(
    log => log.responseStatusCode >= 200 && log.responseStatusCode < 300
  );
  
  return Math.round((successfulLogs.length / logs.length) * 100);
}

function calculateAvgLatency(logs: DeliveryLog[]): number {
  if (logs.length === 0) return 0;
  
  const totalLatency = logs.reduce((sum, log) => sum + log.latencyMs, 0);
  return Math.round(totalLatency / logs.length);
}

export function useStatsData(
  subscriptions: WebhookSubscription[],
  initialTimeRange: TimeRange = '7d'
) {
  const [timeRange, setTimeRange] = useState<TimeRange>(initialTimeRange);
  const [allLogs, setAllLogs] = useState<DeliveryLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch logs - get a larger batch for stats
  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch up to 1000 logs for stats (adjust based on expected volume)
      const response = await getLogs(0, 1000);
      setAllLogs(response.logs);
    } catch (err: any) {
      console.error('Error fetching stats data:', err);
      setError(err.message || 'Failed to fetch statistics data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Filter and calculate stats based on time range
  const statsData = useMemo((): StatsData => {
    const filteredLogs = filterLogsByTimeRange(allLogs, timeRange);
    
    // Calculate rate-limited subscriptions
    const rateLimitedCount = subscriptions.filter(s => s.isRateLimited).length;
    
    // NEW: Calculate Value Metrics & Heatmap
    const valueMetrics = calculateValueMetrics(filteredLogs);
    const heatmapData = calculateHourlyHeatmap(filteredLogs);
    
    return {
      totalWebhooks: filteredLogs.length,
      successRate: calculateSuccessRate(filteredLogs),
      avgLatency: calculateAvgLatency(filteredLogs),
      rateLimitedCount,
      
      // New Value Fields
      totalVolumeAda: valueMetrics.totalAda,
      topSourceWallet: valueMetrics.topSource,
      topSourceCount: valueMetrics.topSourceCount,
      heatmapData, // New

      volumeData: groupLogsByTimeBucket(filteredLogs, timeRange),
      distributionData: groupLogsByEventType(filteredLogs, subscriptions),
      isLoading,
      error,
    };
  }, [allLogs, subscriptions, timeRange, isLoading, error]);

  return {
    ...statsData,
    timeRange,
    setTimeRange,
    refetch: fetchLogs,
  };
}