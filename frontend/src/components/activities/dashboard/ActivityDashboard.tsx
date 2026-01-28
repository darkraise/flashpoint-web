import { useState, useEffect, memo } from 'react';
import { ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { useActivityStats } from '@/hooks/useActivities';
import { TimeRange } from '@/types/auth';
import { ActivityStats } from './ActivityStats';
import { ActivityTrendChart } from './ActivityTrendChart';
import { TopActionsChart } from './TopActionsChart';
import { ResourceDistributionChart } from './ResourceDistributionChart';
import { UserLeaderboard } from './UserLeaderboard';

function ActivityDashboardComponent() {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const stored = localStorage.getItem('activityDashboardCollapsed');
    return stored === 'true';
  });

  const [autoRefresh, setAutoRefresh] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');

  // Persist collapsed state
  useEffect(() => {
    localStorage.setItem('activityDashboardCollapsed', String(isCollapsed));
  }, [isCollapsed]);

  const { data: stats, isLoading, isFetching } = useActivityStats(timeRange, undefined, autoRefresh);

  const handleToggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-card rounded-lg p-4 border border-border shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              aria-label={isCollapsed ? 'Expand dashboard' : 'Collapse dashboard'}
            >
              {isCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
            </button>
            <h2 className="text-xl font-bold">Activity Dashboard</h2>
            {!isCollapsed && (
              <div className="flex gap-2 ml-4">
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
            )}
          </div>
          {!isCollapsed && (
            <button
              onClick={handleToggleAutoRefresh}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                autoRefresh
                  ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <RefreshCw
                size={16}
                className={autoRefresh && isFetching ? 'animate-spin' : ''}
              />
              <span className="text-sm">
                Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
                {autoRefresh && isFetching && <span className="ml-1 opacity-70">(updating...)</span>}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Dashboard Content */}
      {!isCollapsed && (
        <div className="space-y-6">
          {/* Loading State */}
          {isLoading && (
            <div className="bg-card rounded-lg p-6 border border-border shadow-md">
              <div className="animate-pulse space-y-4">
                <div className="h-24 bg-muted rounded"></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-32 bg-muted rounded"></div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Stats Cards */}
          {stats && (
            <ActivityStats
              stats={stats.data}
              timeRange={timeRange}
            />
          )}

          {/* Activity Trend Chart */}
          <ActivityTrendChart autoRefresh={autoRefresh} />

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Actions Bar Chart */}
            <TopActionsChart autoRefresh={autoRefresh} />

            {/* Resource Distribution Pie Chart */}
            <ResourceDistributionChart autoRefresh={autoRefresh} />
          </div>

          {/* User Leaderboard */}
          <UserLeaderboard autoRefresh={autoRefresh} />
        </div>
      )}
    </div>
  );
}

export const ActivityDashboard = memo(ActivityDashboardComponent);
