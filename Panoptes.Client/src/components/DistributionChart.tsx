import React from 'react';
import { PieChart, Pie, Cell } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';

interface DistributionDataPoint {
  eventType: string;
  count: number;
  percentage: number;
  fill: string;
}

interface DistributionChartProps {
  data: DistributionDataPoint[];
  isLoading?: boolean;
}

// Generate chart config from data
function generateChartConfig(data: DistributionDataPoint[]): ChartConfig {
  const config: ChartConfig = {};
  data.forEach((item) => {
    config[item.eventType] = {
      label: item.eventType,
      color: item.fill,
    };
  });
  return config;
}

const DistributionChart: React.FC<DistributionChartProps> = ({
  data,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
            <div className="h-3 w-48 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        </div>
        <div className="h-[300px] flex items-center justify-center">
          <div className="w-48 h-48 rounded-full bg-gray-100 dark:bg-gray-700 animate-pulse" />
        </div>
      </div>
    );
  }

  const chartConfig = generateChartConfig(data);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-mono text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Event Distribution
          </h3>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            Webhooks by event type
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-mono font-semibold text-gray-900 dark:text-gray-100">
            {data.length}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">event types</p>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center text-gray-400">
          <p>No data available</p>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row items-center gap-6">
          <ChartContainer config={chartConfig} className="h-[250px] w-full lg:w-1/2">
            <PieChart>
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => (
                      <span>
                        {name}: {value} ({data.find(d => d.eventType === name)?.percentage}%)
                      </span>
                    )}
                  />
                }
              />
              <Pie
                data={data}
                dataKey="count"
                nameKey="eventType"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                strokeWidth={2}
                stroke="#fff"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          
          {/* Custom Legend */}
          <div className="flex-1 space-y-3">
            {data.map((item) => (
              <div
                key={item.eventType}
                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: item.fill }}
                  />
                  <span className="text-sm font-medium text-gray-700">
                    {item.eventType}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-sm text-gray-600">
                    {item.count.toLocaleString()}
                  </span>
                  <span className="font-mono text-xs text-gray-400 w-12 text-right">
                    {item.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DistributionChart;

