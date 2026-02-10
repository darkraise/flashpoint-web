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
import { useTopGames } from '@/hooks/usePlayTracking';
import type { CustomTooltipProps } from '@/types/chart';
import { CHART_COLORS, truncateTitle, formatPlaytimeCompact, getCSSVar } from './chart-utils';

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0];
    if (!data?.payload) return null;

    const game = data.payload as { fullTitle?: string; playtime?: number; plays?: number };
    const playtime = typeof game.playtime === 'number' ? game.playtime : 0;

    return (
      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg max-w-xs">
        <p className="font-medium mb-2">{game.fullTitle}</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">Playtime:</span>
            <span className="font-semibold text-sm">{formatPlaytimeCompact(playtime)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">Total Plays:</span>
            <span className="font-semibold text-sm">{game.plays ?? 0}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

export function TopGamesChart() {
  const { data, isLoading } = useTopGames(10);

  // Get theme-aware colors
  const mutedForeground = getCSSVar('--muted-foreground') || '#9ca3af';
  const borderColor = getCSSVar('--border') || '#374151';

  // Convert HSL to hex if needed (shadcn/ui uses HSL format)
  const mutedForegroundColor = mutedForeground.includes(' ')
    ? `hsl(${mutedForeground})`
    : mutedForeground;
  const borderColorValue = borderColor.includes(' ') ? `hsl(${borderColor})` : borderColor;

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
          <p className="text-muted-foreground">
            No games played yet. Start playing to see your top games!
          </p>
        </div>
      </div>
    );
  }

  const chartData = data.map((game, index) => ({
    name: truncateTitle(game.gameTitle, 30),
    fullTitle: game.gameTitle,
    playtime: game.totalPlaytimeSeconds,
    plays: game.totalPlays,
    color: CHART_COLORS[index % CHART_COLORS.length],
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
            <CartesianGrid strokeDasharray="3 3" stroke={borderColorValue} horizontal={false} />
            <XAxis
              type="number"
              stroke={mutedForegroundColor}
              tick={{ fill: mutedForegroundColor, fontSize: 12 }}
              tickFormatter={(value: number) => formatPlaytimeCompact(value)}
            />
            <YAxis
              type="category"
              dataKey="name"
              stroke={mutedForegroundColor}
              tick={{ fill: mutedForegroundColor, fontSize: 12 }}
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
