import { useMemo } from 'react';
import { Activity, Users, Clock, Shield, AlertTriangle, Server } from 'lucide-react';
import { ActivityStats as ActivityStatsType, TimeRange } from '@/types/auth';

interface ActivityStatsProps {
  stats: ActivityStatsType;
  timeRange?: TimeRange;
}

const getTimeRangeLabel = (timeRange: TimeRange = '24h') => {
  switch (timeRange) {
    case '24h':
      return 'Last 24 hours';
    case '7d':
      return 'Last 7 days';
    case '30d':
      return 'Last 30 days';
    default:
      return 'Last 24 hours';
  }
};

export function ActivityStats({ stats, timeRange = '24h' }: ActivityStatsProps) {
  const timeLabel = getTimeRangeLabel(timeRange);
  const statCards = useMemo(() => [
    {
      id: 'total',
      icon: Activity,
      label: 'Total Activities',
      value: stats.total.toLocaleString(),
      sublabel: timeLabel,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      trend: stats.trends.totalChange
    },
    {
      id: 'users',
      icon: Users,
      label: 'Unique Active Users',
      value: stats.uniqueUsers.toLocaleString(),
      sublabel: timeLabel,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      trend: stats.trends.userChange
    },
    {
      id: 'peak',
      icon: Clock,
      label: 'Peak Activity Hour',
      value: stats.peakHour.formattedRange,
      sublabel: `${stats.peakHour.count} activities`,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10'
    },
    {
      id: 'auth',
      icon: Shield,
      label: 'Auth Events',
      value: stats.authEvents.total.toLocaleString(),
      sublabel: `${stats.authEvents.successful} successful, ${stats.authEvents.failed} failed`,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      trend: stats.trends.authChange
    },
    {
      id: 'failed',
      icon: AlertTriangle,
      label: 'Failed Operations',
      value: stats.failedOperations.toLocaleString(),
      sublabel: 'Errors and failures',
      color: 'text-red-400',
      bgColor: 'bg-red-500/10'
    },
    {
      id: 'system',
      icon: Server,
      label: 'System Events',
      value: stats.systemEvents.toLocaleString(),
      sublabel: 'Automated actions',
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10'
    }
  ], [stats, timeLabel]);

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return '↑';
    if (trend < 0) return '↓';
    return '→';
  };

  const getTrendColor = (trend: number) => {
    if (trend > 0) return 'text-green-400';
    if (trend < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {statCards.map((stat) => {
        const Icon = stat.icon;
        const isPeakHour = stat.id === 'peak';

        return (
          <div
            key={stat.id}
            className={`${stat.bgColor} rounded-lg p-4 border border-border shadow-sm`}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-accent rounded-lg flex-shrink-0">
                <Icon size={20} className={stat.color} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-muted-foreground text-xs mb-1">{stat.label}</p>
                {/* Peak Hour: use smaller font and break text instead of truncate */}
                <p className={`font-bold ${isPeakHour ? 'text-base break-words' : 'text-xl truncate'}`}>
                  {stat.value}
                </p>
                <p className="text-muted-foreground text-xs mt-1 truncate">{stat.sublabel}</p>
                {stat.trend !== undefined ? (
                  <div className={`text-xs mt-1 font-medium ${getTrendColor(stat.trend)}`}>
                    {getTrendIcon(stat.trend)} {Math.abs(stat.trend)}%
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
