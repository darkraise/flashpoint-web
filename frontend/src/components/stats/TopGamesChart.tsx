import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useTopGames } from '../../hooks/usePlayTracking';
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

function truncateTitle(title: string, maxLength = 30): string {
  if (title.length <= maxLength) return title;
  return title.substring(0, maxLength) + '...';
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0];
    if (!data?.payload) return null;

    const game = data.payload as any;
    const playtime = typeof game.playtime === 'number' ? game.playtime : 0;

    return (
      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg max-w-xs">
        <p className="font-medium mb-2">{game.fullTitle}</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">Playtime:</span>
            <span className="font-semibold text-sm">{formatPlaytime(playtime)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">Total Plays:</span>
            <span className="font-semibold text-sm">{game.plays}</span>
          </div>
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

export function TopGamesChart() {
  const { data, isLoading } = useTopGames(10);

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg p-6 border border-border shadow-md">
        <div className="h-96 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading chart...</div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-card rounded-lg p-6 border border-border shadow-md">
        <h3 className="text-lg font-semibold mb-4">Top Played Games</h3>
        <div className="h-96 flex items-center justify-center">
          <p className="text-muted-foreground">No games played yet. Start playing to see your top games!</p>
        </div>
      </div>
    );
  }

  const chartData = data.map((game, index) => ({
    name: truncateTitle(game.gameTitle),
    fullTitle: game.gameTitle,
    playtime: game.totalPlaytimeSeconds,
    plays: game.totalPlays,
    color: COLORS[index % COLORS.length]
  }));

  return (
    <div className="bg-card rounded-lg p-6 border border-border shadow-md">
      <h3 className="text-lg font-semibold mb-4">Top Played Games</h3>
      <div className="bg-accent rounded-lg p-4">
        <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
          <XAxis
            type="number"
            stroke="#9ca3af"
            tick={{ fill: '#9ca3af', fontSize: 12 }}
            tickFormatter={(value: number) => formatPlaytime(value)}
          />
          <YAxis
            type="category"
            dataKey="name"
            stroke="#9ca3af"
            tick={{ fill: '#9ca3af', fontSize: 12 }}
            width={120}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="playtime" radius={[0, 8, 8, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}
