import { Gamepad2, Film, Layers, FolderOpen, BarChart3, Tags } from 'lucide-react';
import { useStatistics } from '@/hooks/useStatistics';
import { UserStatsPanel } from '@/components/stats/UserStatsPanel';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

export function DashboardView() {
  const { data: statistics, isLoading: statsLoading } = useStatistics();

  return (
    <ErrorBoundary>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <BarChart3 size={32} className="text-primary" />
          <h1 className="text-3xl font-bold">Dashboard</h1>
        </div>

        {/* Archive Statistics */}
        <div className="bg-card rounded-lg p-6 border border-border shadow-md">
          <h2 className="text-xl font-semibold mb-4">Archive Statistics</h2>
          {statsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {/* Skeleton loaders - 6 cards */}
              {[...Array(6)].map((_, index) => (
                <div key={index} className="bg-muted rounded-lg p-4 animate-pulse">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 bg-muted/50 rounded-lg"></div>
                    <div className="flex-1">
                      <div className="h-7 bg-muted/50 rounded w-20 mb-2"></div>
                      <div className="h-4 bg-muted/50 rounded w-24"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : statistics ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {/* Games */}
              <div className="bg-accent rounded-lg p-4 border border-border">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-primary rounded-lg text-primary-foreground">
                    <Gamepad2 size={20} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{statistics.totalGames.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Games</p>
                  </div>
                </div>
              </div>

              {/* Animations */}
              <div className="bg-accent rounded-lg p-4 border border-border">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-purple-600 rounded-lg text-white">
                    <Film size={20} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {statistics.totalAnimations.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">Animations</p>
                  </div>
                </div>
              </div>

              {/* Platforms */}
              <div className="bg-accent rounded-lg p-4 border border-border">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-600 rounded-lg text-white">
                    <Layers size={20} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{statistics.totalPlatforms}</p>
                    <p className="text-sm text-muted-foreground">Platforms</p>
                  </div>
                </div>
              </div>

              {/* Web Playable Games */}
              <div className="bg-accent rounded-lg p-4 border border-border">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-green-600 rounded-lg text-white">
                    <div className="w-5 h-5 rounded-full bg-white"></div>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {statistics.webPlayableGames.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">Web Playable Games</p>
                  </div>
                </div>
              </div>

              {/* Flashpoint Playlists */}
              <div className="bg-accent rounded-lg p-4 border border-border">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-yellow-600 rounded-lg text-white">
                    <FolderOpen size={20} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{statistics.totalPlaylists}</p>
                    <p className="text-sm text-muted-foreground">Flashpoint Playlists</p>
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div className="bg-accent rounded-lg p-4 border border-border">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-orange-600 rounded-lg text-white">
                    <Tags size={20} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{statistics.totalTags.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Tags</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground">Failed to load statistics</div>
          )}
        </div>

        {/* User Play Statistics */}
        <UserStatsPanel />
      </div>
    </ErrorBoundary>
  );
}
