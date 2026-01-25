import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useActivityBreakdown } from '@/hooks/useActivities';
import { TimeRange } from '@/types/auth';

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0];
    const percentage = data.payload.percentage;
    return (
      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg max-w-xs">
        <p className="font-medium mb-2">{data.payload.fullName}</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">Count:</span>
            <span className="font-semibold text-sm">{data.value.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">Percentage:</span>
            <span className="font-semibold text-sm">{percentage.toFixed(1)}%</span>
          </div>
          {data.payload.topAction && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">Top Action:</span>
              <span className="font-semibold text-sm">{data.payload.topAction}</span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
}

const COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#84cc16', // lime
  '#6366f1', // indigo
];

function truncateName(name: string, maxLength = 20): string {
  if (name.length <= maxLength) return name;
  return name.substring(0, maxLength) + '...';
}

interface ResourceDistributionChartProps {
  autoRefresh?: boolean;
}

export function ResourceDistributionChart({ autoRefresh = false }: ResourceDistributionChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');

  const { data, isLoading } = useActivityBreakdown('resource', 10, timeRange, autoRefresh);

  const renderLegend = (props: any) => {
    const { payload } = props;
    return (
      <div className="flex flex-wrap gap-2 justify-center mt-4 max-h-24 overflow-y-auto">
        {payload.map((entry: any, index: number) => (
          <div key={`legend-${index}`} className="flex items-center gap-2 text-xs">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg p-6 border border-border shadow-md">
        <div className="h-96 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading chart...</div>
        </div>
      </div>
    );
  }

  if (!data || data.data.length === 0) {
    return (
      <div className="bg-card rounded-lg p-6 border border-border shadow-md">
        <h3 className="text-lg font-semibold mb-4">Resource Distribution</h3>
        <div className="h-96 flex items-center justify-center">
          <p className="text-muted-foreground">No activity data available</p>
        </div>
      </div>
    );
  }

  const chartData = data.data.map((item, index) => ({
    name: truncateName(item.key),
    fullName: item.key,
    value: item.count,
    percentage: item.percentage,
    topAction: item.metadata.topAction,
    color: COLORS[index % COLORS.length]
  }));

  const totalActivities = data.meta.total;

  return (
    <div className="bg-card rounded-lg p-6 border border-border shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Resource Distribution</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setTimeRange('24h')}
            className={`px-3 py-1 text-sm rounded ${
              timeRange === '24h'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            24h
          </button>
          <button
            onClick={() => setTimeRange('7d')}
            className={`px-3 py-1 text-sm rounded ${
              timeRange === '7d'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            7d
          </button>
          <button
            onClick={() => setTimeRange('30d')}
            className={`px-3 py-1 text-sm rounded ${
              timeRange === '30d'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            30d
          </button>
        </div>
      </div>
      <div className="bg-accent rounded-lg p-4">
        <ResponsiveContainer width="100%" height={380}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={(props: any) => {
                const percentage = props.percent * 100;
                return `${percentage.toFixed(0)}%`;
              }}
              outerRadius={120}
              innerRadius={60}
              fill="#8884d8"
              dataKey="value"
              paddingAngle={2}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={renderLegend} />
          </PieChart>
        </ResponsiveContainer>
        <div className="text-center mt-4">
          <p className="text-muted-foreground text-sm">
            Total Activities: <span className="font-semibold">{totalActivities.toLocaleString()}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
