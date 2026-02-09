import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useTopActions } from '@/hooks/useActivities';
import { TimeRange } from '@/types/auth';
import type { CustomTooltipProps } from '@/types/chart';

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const action = payload[0]?.payload as {
      fullAction?: string;
      count?: number;
      percentage?: number;
      category?: string;
      topResource?: string;
    };
    if (!action) return null;

    return (
      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg max-w-xs">
        <p className="font-medium mb-2">{action.fullAction}</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">Count:</span>
            <span className="font-semibold text-sm">{action.count?.toLocaleString() ?? 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">Percentage:</span>
            <span className="font-semibold text-sm">{action.percentage?.toFixed(1) ?? '0'}%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">Category:</span>
            <span className="font-semibold text-sm capitalize">{action.category}</span>
          </div>
          {action.topResource ? (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">Top Resource:</span>
              <span className="font-semibold text-sm">{action.topResource}</span>
            </div>
          ) : null}
        </div>
      </div>
    );
  }
  return null;
}

const CATEGORY_COLORS: Record<string, string> = {
  auth: '#10b981', // green
  crud: '#3b82f6', // blue
  error: '#ef4444', // red
  system: '#8b5cf6', // purple
};

function truncateAction(action: string, maxLength = 25): string {
  if (action.length <= maxLength) return action;
  return action.substring(0, maxLength) + '...';
}

interface TopActionsChartProps {
  autoRefresh?: boolean;
}

export function TopActionsChart({ autoRefresh = false }: TopActionsChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');

  const { data, isLoading } = useTopActions(10, timeRange, autoRefresh);

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
        <h3 className="text-lg font-semibold mb-4">Top Actions</h3>
        <div className="h-96 flex items-center justify-center">
          <p className="text-muted-foreground">No activity data available</p>
        </div>
      </div>
    );
  }

  const chartData = data.data.map((action) => ({
    name: truncateAction(action.action),
    fullAction: action.action,
    count: action.count,
    percentage: action.percentage,
    category: action.category,
    topResource: action.topResource,
    color: CATEGORY_COLORS[action.category] || '#6b7280',
  }));

  return (
    <div className="bg-card rounded-lg p-6 border border-border shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Top Actions</h3>
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
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 140, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
            <XAxis type="number" stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} />
            <YAxis
              type="category"
              dataKey="name"
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              width={140}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" radius={[0, 8, 8, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex gap-4 mt-4 justify-center flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-sm text-muted-foreground">Auth</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span className="text-sm text-muted-foreground">CRUD</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span className="text-sm text-muted-foreground">Error</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-purple-500"></div>
          <span className="text-sm text-muted-foreground">System</span>
        </div>
      </div>
    </div>
  );
}
