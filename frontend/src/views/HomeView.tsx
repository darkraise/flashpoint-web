import { useMemo } from 'react';
import { useRecentGames } from '@/hooks/useRecentGames';
import { useMostPlayedGames } from '@/hooks/useMostPlayedGames';
import { useFavoriteGameIds } from '@/hooks/useFavorites';
import { usePublicSettings } from '@/hooks/usePublicSettings';
import { HomeSection } from '@/components/home/HomeSection';
import { useAuthStore } from '@/store/auth';

export function HomeView() {
  const { isAuthenticated } = useAuthStore();
  const { data: publicSettings } = usePublicSettings();

  // Get configured hours from backend (default to 24 if not set)
  const recentHours = publicSettings?.app?.homeRecentHours || 24;

  // Format time period for display
  const timePeriod = useMemo(() => {
    if (recentHours < 24) {
      return `${recentHours} hour${recentHours !== 1 ? 's' : ''}`;
    } else if (recentHours === 24) {
      return '24 hours';
    } else if (recentHours % 24 === 0) {
      const days = recentHours / 24;
      return `${days} day${days !== 1 ? 's' : ''}`;
    } else {
      const days = Math.floor(recentHours / 24);
      const hours = recentHours % 24;
      return `${days} day${days !== 1 ? 's' : ''} and ${hours} hour${hours !== 1 ? 's' : ''}`;
    }
  }, [recentHours]);

  // Fetch recent games and most played games
  const { data: recentAdded, isLoading: loadingAdded } = useRecentGames('added', 20, recentHours);
  const { data: recentUpdated, isLoading: loadingUpdated } = useRecentGames('modified', 20, recentHours);
  const { data: mostPlayed, isLoading: loadingMostPlayed } = useMostPlayedGames(20);

  // Fetch favorite IDs for performance
  const { data: favoriteGameIdsArray } = useFavoriteGameIds();
  const favoriteGameIds = useMemo(
    () => (favoriteGameIdsArray ? new Set(favoriteGameIdsArray) : undefined),
    [favoriteGameIdsArray]
  );

  return (
    <div className="max-w-7xl mx-auto space-y-12">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Welcome to Flashpoint Archive
        </h1>
        <p className="text-muted-foreground text-lg">
          Discover recently added and updated games from the preservation archive
        </p>
      </div>

      {/* Most Played Games Section */}
      <HomeSection
        title="Most Played Games"
        description="Games with the highest play counts from the community"
        games={mostPlayed?.data || []}
        isLoading={loadingMostPlayed}
        viewAllHref="/browse?sortBy=title&sortOrder=asc"
        favoriteGameIds={isAuthenticated ? favoriteGameIds : undefined}
      />

      {/* Recently Added Games Section */}
      <HomeSection
        title="Recently Added Games"
        description={`Games added in the last ${timePeriod}`}
        games={recentAdded?.data || []}
        isLoading={loadingAdded}
        viewAllHref="/browse?sortBy=dateAdded&sortOrder=desc"
        favoriteGameIds={isAuthenticated ? favoriteGameIds : undefined}
      />

      {/* Recently Updated Games Section */}
      <HomeSection
        title="Recently Updated Games"
        description={`Games updated in the last ${timePeriod}`}
        games={recentUpdated?.data || []}
        isLoading={loadingUpdated}
        viewAllHref="/browse?sortBy=dateModified&sortOrder=desc"
        favoriteGameIds={isAuthenticated ? favoriteGameIds : undefined}
      />
    </div>
  );
}
