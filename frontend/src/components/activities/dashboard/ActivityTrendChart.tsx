import { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useActivityTrend } from '@/hooks/useActivities';
import { useDateTimeFormat } from '@/hooks/useDateTimeFormat';
import type { CustomTooltipProps } from '@/types/chart';

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
        <p className="font-medium mb-2">{label}</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-muted-foreground text-sm">Total:</span>
            <span className="font-semibold text-sm">{payload[0].value}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <span className="text-muted-foreground text-sm">Auth Events:</span>
            <span className="font-semibold text-sm">{payload[1].value}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-muted-foreground text-sm">Failed Actions:</span>
            <span className="font-semibold text-sm">{payload[2].value}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

interface ActivityTrendChartProps {
  autoRefresh?: boolean;
}

export function ActivityTrendChart({ autoRefresh = false }: ActivityTrendChartProps) {
  const [selectedRange, setSelectedRange] = useState<'1' | '7' | '30'>('7');
  const { formatDate, formatTime } = useDateTimeFormat();

  const days = parseInt(selectedRange);
  const { data, isLoading } = useActivityTrend(days, autoRefresh);

  const formatTimestamp = (timestamp: string) => {
    if (days === 1) {
      // For 24h view, show time
      return formatTime(timestamp);
    } else {
      // For multi-day view, show date
      return formatDate(timestamp);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg p-6 border border-border shadow-md">
        <div className="h-80 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading chart...</div>
        </div>
      </div>
    );
  }

  if (!data || data.data.length === 0) {
    return (
      <div className="bg-card rounded-lg p-6 border border-border shadow-md">
        <h3 className="text-lg font-semibold mb-4">Activity Trend</h3>
        <div className="h-80 flex items-center justify-center">
          <p className="text-muted-foreground">No activity data available</p>
        </div>
      </div>
    );
  }

  const chartData = data.data.map((item) => ({
    timestamp: formatTimestamp(item.timestamp),
    total: item.total,
    authEvents: item.authEvents,
    failedActions: item.failedActions,
  }));

  return (
    <div className="bg-card rounded-lg p-6 border border-border shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Activity Trend</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedRange('1')}
            className={`px-3 py-1 text-sm rounded ${
              selectedRange === '1'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            24h
          </button>
          <button
            onClick={() => setSelectedRange('7')}
            className={`px-3 py-1 text-sm rounded ${
              selectedRange === '7'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            7d
          </button>
          <button
            onClick={() => setSelectedRange('30')}
            className={`px-3 py-1 text-sm rounded ${
              selectedRange === '30'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            30d
          </button>
        </div>
      </div>
      <div className="bg-accent rounded-lg p-4">
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorAuth" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="timestamp" stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} />
            <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="circle"
              formatter={(value: string) => <span className="text-gray-300">{value}</span>}
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke="#3b82f6"
              fillOpacity={1}
              fill="url(#colorTotal)"
              name="Total Activities"
            />
            <Area
              type="monotone"
              dataKey="authEvents"
              stroke="#f59e0b"
              fillOpacity={1}
              fill="url(#colorAuth)"
              name="Auth Events"
            />
            <Area
              type="monotone"
              dataKey="failedActions"
              stroke="#ef4444"
              fillOpacity={1}
              fill="url(#colorFailed)"
              name="Failed Actions"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
