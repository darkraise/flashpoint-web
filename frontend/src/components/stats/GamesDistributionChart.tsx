import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useGamesDistribution } from '@/hooks/usePlayTracking';
import type { CustomTooltipProps, CustomLegendProps } from '@/types/chart';
import { CHART_COLORS, truncateTitle, formatPlaytimeCompact } from './chart-utils';

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0];
    if (!data?.payload) return null;

    const gameData = data.payload as { fullName?: string; percentage?: number; topAction?: string };
    const percentage = gameData.percentage;
    const value = typeof data.value === 'number' ? data.value : 0;

    return (
      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg max-w-xs">
        <p className="font-medium mb-2">{gameData.fullName}</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">Playtime:</span>
            <span className="font-semibold text-sm">{formatPlaytimeCompact(value)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">Percentage:</span>
            <span className="font-semibold text-sm">{percentage?.toFixed(1) ?? '0'}%</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

export function GamesDistributionChart() {
  const { data, isLoading } = useGamesDistribution(8);

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
        <h3 className="text-lg font-semibold mb-4">Playtime Distribution</h3>
        <div className="h-96 flex items-center justify-center">
          <p className="text-muted-foreground">
            No games played yet. Start playing to see distribution!
          </p>
        </div>
      </div>
    );
  }

  const totalPlaytime = data.reduce((sum, game) => sum + game.value, 0);

  const chartData = data.map((game, index) => ({
    name: truncateTitle(game.name),
    fullName: game.name,
    value: game.value,
    percentage: totalPlaytime > 0 ? (game.value / totalPlaytime) * 100 : 0,
    color: CHART_COLORS[index % CHART_COLORS.length],
  }));

  const renderLegend = (props: CustomLegendProps) => {
    const { payload } = props;
    return (
      <div className="flex flex-wrap gap-2 justify-center mt-4">
        {payload?.map((entry, index: number) =>
          entry.value ? (
            <div key={`legend-${index}`} className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-muted-foreground">{entry.value}</span>
            </div>
          ) : null
        )}
      </div>
    );
  };

  return (
    <div className="bg-card rounded-lg p-6 border border-border shadow-md">
      <h3 className="text-lg font-semibold mb-4">Playtime Distribution</h3>
      <div className="bg-accent rounded-lg p-4">
        <ResponsiveContainer width="100%" height={380}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={(props: { percent?: number }) => {
                if (!props.percent) return '';
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
            Total Playtime:{' '}
            <span className="font-semibold">{formatPlaytimeCompact(totalPlaytime)}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
