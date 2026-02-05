import { useState } from 'react';
import { Medal, Trophy, Award } from 'lucide-react';
import { useActivityBreakdown } from '@/hooks/useActivities';
import { TimeRange } from '@/types/auth';
import { useDateTimeFormat } from '@/hooks/useDateTimeFormat';

interface UserLeaderboardProps {
  autoRefresh?: boolean;
}

export function UserLeaderboard({ autoRefresh = false }: UserLeaderboardProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const { formatDateTime } = useDateTimeFormat();

  const { data, isLoading } = useActivityBreakdown('user', 10, timeRange, autoRefresh);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy size={20} className="text-yellow-400" />;
      case 2:
        return <Medal size={20} className="text-gray-400" />;
      case 3:
        return <Award size={20} className="text-amber-600" />;
      default:
        return <span className="text-muted-foreground font-semibold">{rank}</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg p-6 border border-border shadow-md">
        <div className="h-96 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading leaderboard...</div>
        </div>
      </div>
    );
  }

  if (!data || data.data.length === 0) {
    return (
      <div className="bg-card rounded-lg p-6 border border-border shadow-md">
        <h3 className="text-lg font-semibold mb-4">User Leaderboard</h3>
        <div className="h-96 flex items-center justify-center">
          <p className="text-muted-foreground">No user activity data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg p-6 border border-border shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">User Leaderboard</h3>
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

      <div className="bg-accent rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-3 text-sm font-semibold text-muted-foreground">Rank</th>
                <th className="text-left p-3 text-sm font-semibold text-muted-foreground">
                  Username
                </th>
                <th className="text-right p-3 text-sm font-semibold text-muted-foreground">
                  Activities
                </th>
                <th className="text-right p-3 text-sm font-semibold text-muted-foreground">%</th>
                <th className="text-left p-3 text-sm font-semibold text-muted-foreground">
                  Top Action
                </th>
                <th className="text-left p-3 text-sm font-semibold text-muted-foreground">
                  Last Activity
                </th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((user, index) => {
                const rank = index + 1;
                const isTopThree = rank <= 3;

                return (
                  <tr
                    key={user.key}
                    className={`border-b border-border/50 hover:bg-muted/50 transition-colors ${
                      isTopThree ? 'bg-muted/20' : ''
                    }`}
                  >
                    <td className="p-3">
                      <div className="flex items-center justify-center w-8">
                        {getRankIcon(rank)}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`font-medium ${isTopThree ? 'text-primary' : ''}`}>
                        {user.key}
                      </span>
                    </td>
                    <td className="p-3 text-right font-semibold">{user.count.toLocaleString()}</td>
                    <td className="p-3 text-right text-muted-foreground">
                      {user.percentage.toFixed(1)}%
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {user.metadata.topAction || '-'}
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {user.metadata.lastActivity
                        ? formatDateTime(user.metadata.lastActivity)
                        : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 text-center text-sm text-muted-foreground">
        Showing top {data.data.length} most active users
      </div>
    </div>
  );
}
