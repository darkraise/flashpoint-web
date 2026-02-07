import { lazy, Suspense } from 'react';
import { Clock, GamepadIcon, TrendingUp, BarChart3 } from 'lucide-react';
import { useUserStats } from '../../hooks/usePlayTracking';
import { useDateTimeFormat } from '../../hooks/useDateTimeFormat';
import { ChartErrorBoundary } from './ChartErrorBoundary';
import { formatDuration } from '@/lib/cron-utils';

// Lazy load chart components to reduce initial bundle size
const PlaytimeChart = lazy(() =>
  import('./PlaytimeChart').then((m) => ({ default: m.PlaytimeChart }))
);
const TopGamesChart = lazy(() =>
  import('./TopGamesChart').then((m) => ({ default: m.TopGamesChart }))
);
const GamesDistributionChart = lazy(() =>
  import('./GamesDistributionChart').then((m) => ({ default: m.GamesDistributionChart }))
);

// Skeleton loader for chart components
function ChartSkeleton({ height = 'h-80' }: { height?: string }) {
  return (
    <div className="bg-card rounded-lg p-6 border border-border shadow-md">
      <div className={`${height} flex items-center justify-center`}>
        <div className="animate-pulse text-muted-foreground">Loading chart...</div>
      </div>
    </div>
  );
}

export function UserStatsPanel() {
  const { data: stats, isLoading: statsLoading } = useUserStats();
  const { formatDate } = useDateTimeFormat();

  if (statsLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-card rounded-lg p-6 border border-border shadow-md">
          <div className="animate-pulse">
            <div className="h-6 bg-muted rounded w-1/3 mb-4"></div>
            <div className="space-y-3">
              <div className="h-16 bg-muted rounded"></div>
              <div className="h-16 bg-muted rounded"></div>
              <div className="h-16 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-card rounded-lg p-6 border border-border shadow-md">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BarChart3 size={20} className="text-primary" />
          Play Statistics
        </h3>
        <p className="text-muted-foreground">
          No play data available yet. Start playing some games!
        </p>
      </div>
    );
  }

  const statCards = [
    {
      icon: GamepadIcon,
      label: 'Games Played',
      value: stats.totalGamesPlayed.toString(),
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      icon: Clock,
      label: 'Total Playtime',
      value: formatDuration(stats.totalPlaytimeSeconds),
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
    },
    {
      icon: TrendingUp,
      label: 'Play Sessions',
      value: stats.totalSessions.toString(),
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-card rounded-lg p-6 border border-border shadow-md">
        <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
          <BarChart3 size={28} className="text-primary" />
          Play Statistics & Analytics
        </h3>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className={`${stat.bgColor} rounded-lg p-4 border border-border`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-accent rounded-lg">
                    <Icon size={24} className={stat.color} />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">{stat.label}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Activity Dates */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
          <div>
            <p className="text-muted-foreground text-sm">First Played</p>
            <p className="font-medium">
              {stats.firstPlayAt ? formatDate(stats.firstPlayAt) : 'Never'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Last Played</p>
            <p className="font-medium">
              {stats.lastPlayAt ? formatDate(stats.lastPlayAt) : 'Never'}
            </p>
          </div>
        </div>
      </div>

      {/* Play Activity Over Time Chart */}
      <ChartErrorBoundary fallbackTitle="Play Activity Chart Error">
        <Suspense fallback={<ChartSkeleton height="h-96" />}>
          <PlaytimeChart />
        </Suspense>
      </ChartErrorBoundary>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Games Bar Chart */}
        <ChartErrorBoundary fallbackTitle="Top Games Chart Error">
          <Suspense fallback={<ChartSkeleton height="h-96" />}>
            <TopGamesChart />
          </Suspense>
        </ChartErrorBoundary>

        {/* Games Distribution Pie Chart */}
        <ChartErrorBoundary fallbackTitle="Distribution Chart Error">
          <Suspense fallback={<ChartSkeleton height="h-96" />}>
            <GamesDistributionChart />
          </Suspense>
        </ChartErrorBoundary>
      </div>
    </div>
  );
}
