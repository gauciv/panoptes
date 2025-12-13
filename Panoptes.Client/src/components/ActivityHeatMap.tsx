import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

interface HeatmapDataPoint {
  hour: number;
  count: number;
  intensity: number;
}

interface ActivityHeatmapProps {
  data: HeatmapDataPoint[];
  isLoading: boolean;
}

const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-card rounded-lg shadow p-6 h-[320px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sentinel"></div>
      </div>
    );
  }

  // Format hour for X-Axis (e.g., 0 -> "12 AM", 14 -> "2 PM")
  const formatHour = (hour: number) => {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    return hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const hour = payload[0].payload.hour;
      const timeLabel = `${formatHour(hour)}`;
      
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-100 dark:border-gray-700 shadow-lg rounded-lg text-sm">
          <p className="font-medium text-gray-900 dark:text-gray-100">{timeLabel}</p>
          <p className="text-sentinel font-semibold">
            {payload[0].value} events
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-card rounded-lg shadow p-6 border border-border">
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Peak Traffic Hours
        </h3>
        <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
          Activity by Time of Day (UTC)
        </p>
      </div>

      <div className="h-[250px] w-full">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis 
                dataKey="hour" 
                tickFormatter={formatHour}
                tick={{ fontSize: 12, fill: '#6B7280' }}
                axisLine={false}
                tickLine={false}
                interval={3} // Show every 4th label (0, 4, 8, 12...) to avoid clutter
              />
              <YAxis 
                tick={{ fontSize: 12, fill: '#6B7280' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} content={<CustomTooltip />} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.intensity > 0.7 ? '#047857' : entry.intensity > 0.4 ? '#10B981' : '#34D399'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <svg className="w-12 h-12 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm">No activity data available yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityHeatmap;