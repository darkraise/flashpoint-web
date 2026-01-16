import { Clock, GamepadIcon, TrendingUp, BarChart3 } from 'lucide-react';
import { useUserStats } from '../../hooks/usePlayTracking';
import { PlaytimeChart } from './PlaytimeChart';
import { TopGamesChart } from './TopGamesChart';
import { GamesDistributionChart } from './GamesDistributionChart';

function formatPlaytime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
}

function formatDate(dateString: string | null): string {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export function UserStatsPanel() {
  const { data: stats, isLoading: statsLoading } = useUserStats();

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
        <p className="text-muted-foreground">No play data available yet. Start playing some games!</p>
      </div>
    );
  }

  const statCards = [
    {
      icon: GamepadIcon,
      label: 'Games Played',
      value: stats.totalGamesPlayed.toString(),
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10'
    },
    {
      icon: Clock,
      label: 'Total Playtime',
      value: formatPlaytime(stats.totalPlaytimeSeconds),
      color: 'text-green-400',
      bgColor: 'bg-green-500/10'
    },
    {
      icon: TrendingUp,
      label: 'Play Sessions',
      value: stats.totalSessions.toString(),
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10'
    }
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
            <p className="font-medium">{formatDate(stats.firstPlayAt)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Last Played</p>
            <p className="font-medium">{formatDate(stats.lastPlayAt)}</p>
          </div>
        </div>
      </div>

      {/* Play Activity Over Time Chart */}
      <PlaytimeChart />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Games Bar Chart */}
        <TopGamesChart />

        {/* Games Distribution Pie Chart */}
        <GamesDistributionChart />
      </div>
    </div>
  );
}
