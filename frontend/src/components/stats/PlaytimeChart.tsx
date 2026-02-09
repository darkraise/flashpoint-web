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
import { usePlayActivityOverTime } from '../../hooks/usePlayTracking';
import { useDateTimeFormat } from '../../hooks/useDateTimeFormat';
import type { CustomTooltipProps } from '@/types/chart';

function formatPlaytime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
  } else {
    const hours = (seconds / 3600).toFixed(1);
    return `${hours}h`;
  }
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length >= 2) {
    const playtimeValue = typeof payload[0].value === 'number' ? payload[0].value : 0;
    const sessionsValue = payload[1].value;

    return (
      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
        <p className="font-medium mb-2">{label}</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-muted-foreground text-sm">Playtime:</span>
            <span className="font-semibold text-sm">{formatPlaytime(playtimeValue)}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-muted-foreground text-sm">Sessions:</span>
            <span className="font-semibold text-sm">{sessionsValue}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

export function PlaytimeChart() {
  const { data, isLoading } = usePlayActivityOverTime(30);
  const { formatDate } = useDateTimeFormat();

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg p-6 border border-border shadow-md">
        <div className="h-80 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading chart...</div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-card rounded-lg p-6 border border-border shadow-md">
        <h3 className="text-lg font-semibold mb-4">Play Activity (Last 30 Days)</h3>
        <div className="h-80 flex items-center justify-center">
          <p className="text-muted-foreground">
            No play activity data yet. Start playing to see your activity!
          </p>
        </div>
      </div>
    );
  }

  const chartData = data.map((item) => ({
    date: formatDate(item.date),
    playtime: item.playtime,
    sessions: item.sessions,
  }));

  return (
    <div className="bg-card rounded-lg p-6 border border-border shadow-md">
      <h3 className="text-lg font-semibold mb-4">Play Activity (Last 30 Days)</h3>
      <div className="bg-accent rounded-lg p-4">
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPlaytime" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="date" stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} />
            <YAxis
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              tickFormatter={(value: number) => formatPlaytime(value)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="circle"
              formatter={(value: string) => <span className="text-muted-foreground">{value}</span>}
            />
            <Area
              type="monotone"
              dataKey="playtime"
              stroke="#3b82f6"
              fillOpacity={1}
              fill="url(#colorPlaytime)"
              name="Playtime (seconds)"
            />
            <Area
              type="monotone"
              dataKey="sessions"
              stroke="#10b981"
              fillOpacity={1}
              fill="url(#colorSessions)"
              name="Sessions"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
