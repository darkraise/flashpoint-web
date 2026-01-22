import { useMemo, ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useGames } from '@/hooks/useGames';
import { useFavoriteGameIds } from '@/hooks/useFavorites';
import { GameGrid } from './GameGrid';
import { GameList } from './GameList';
import { GameGridSkeleton } from './GameGridSkeleton';
import { GameListSkeleton } from './GameListSkeleton';
import { FilterPanel } from '@/components/search/FilterPanel';
import { ViewOptions } from '@/components/common/ViewOptions';
import { PaginationWithInfo } from '@/components/ui/pagination';
import { useUIStore } from '@/store/ui';
import { useAuthStore } from '@/store/auth';
import { GameFilters } from '@/types/game';

interface GameBrowseLayoutProps {
  title: string;
  library: 'arcade' | 'theatre';
  platform?: string;
  headerContent?: ReactNode;
}

/**
 * Reusable layout component for browsing games with filters and pagination
 * Used by FlashGamesView, HTML5GamesView, and BrowseView
 */
export function GameBrowseLayout({
  title,
  library,
  platform,
  headerContent,
}: GameBrowseLayoutProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const viewMode = useUIStore((state) => state.viewMode);
  const { isAuthenticated } = useAuthStore();

  // Fetch favorite game IDs for performance optimization (single API call)
  const { data: favoriteGameIdsArray } = useFavoriteGameIds();
  const favoriteGameIds = useMemo(
    () => (favoriteGameIdsArray ? new Set(favoriteGameIdsArray) : undefined),
    [favoriteGameIdsArray]
  );

  // Build filters from URL params
  const filters: GameFilters = {
    search: searchParams.get('search') || undefined,
    platform: searchParams.get('platform') || platform || undefined,
    series: searchParams.get('series') || undefined,
    developers: searchParams.get('developers') || undefined,
    publishers: searchParams.get('publishers') || undefined,
    playModes: searchParams.get('playModes') || undefined,
    languages: searchParams.get('languages') || undefined,
    library,
    tags: searchParams.get('tags') || undefined,
    yearFrom: searchParams.get('yearFrom')
      ? parseInt(searchParams.get('yearFrom')!, 10)
      : undefined,
    yearTo: searchParams.get('yearTo')
      ? parseInt(searchParams.get('yearTo')!, 10)
      : undefined,
    sortBy: searchParams.get('sortBy') || 'title',
    sortOrder: (searchParams.get('sortOrder') || 'asc') as 'asc' | 'desc',
    page: parseInt(searchParams.get('page') || '1', 10),
    limit: 50,
  };

  // Compute dynamic page title based on active filters
  const pageTitle = useMemo(() => {
    const parts: string[] = [];

    // Search query takes priority
    if (filters.search) {
      return `Search result for "${filters.search}"`;
    }

    // Platform filter (show as main title if no other filters)
    if (
      filters.platform &&
      !filters.tags &&
      !filters.yearFrom &&
      !filters.yearTo
    ) {
      return title; // Use the provided title when only platform is filtered
    }

    // Platform filter with other filters
    if (filters.platform) {
      parts.push(title);
    }

    // Tags filter
    if (filters.tags) {
      const tagList = filters.tags
        .split(';')
        .map((t) => t.trim())
        .join(', ');
      if (parts.length > 0) {
        parts.push(`tagged ${tagList}`);
      } else {
        parts.push(`Games tagged ${tagList}`);
      }
    }

    // Year range filter
    if (filters.yearFrom || filters.yearTo) {
      let yearText = '';
      if (filters.yearFrom && filters.yearTo) {
        yearText = `from ${filters.yearFrom}-${filters.yearTo}`;
      } else if (filters.yearFrom) {
        yearText = `from ${filters.yearFrom} onwards`;
      } else if (filters.yearTo) {
        yearText = `up to ${filters.yearTo}`;
      }

      if (parts.length > 0) {
        parts.push(yearText);
      } else {
        parts.push(`Games ${yearText}`);
      }
    }

    // Default title
    return parts.length > 0 ? parts.join(' ') : title;
  }, [
    filters.search,
    filters.platform,
    filters.tags,
    filters.yearFrom,
    filters.yearTo,
    title,
  ]);

  const { data, isLoading, error } = useGames(filters);

  const handlePageChange = (newPage: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', newPage.toString());
    setSearchParams(newParams);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header with Title and View Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{pageTitle}</h1>
          {isLoading ? (
            <div className="h-5 bg-muted rounded w-32 mt-1 animate-pulse"></div>
          ) : (
            data && (
              <p className="text-sm text-muted-foreground mt-1">
                Found {data.total.toLocaleString()} games
              </p>
            )
          )}
          {headerContent}
        </div>

        {/* View Mode Controls - Right Side */}
        <div className="flex items-center gap-2">
          <ViewOptions />
        </div>
      </div>

      {/* Filter Panel - Separate Section */}
      <div className="bg-card rounded-lg p-4 border border-border relative">
        <FilterPanel filters={filters} showPlatformFilter={!platform} />
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 text-red-300">
          Error loading games: {error.message}
        </div>
      )}

      {isLoading ? (
        viewMode === 'grid' ? (
          <GameGridSkeleton />
        ) : (
          <GameListSkeleton />
        )
      ) : data ? (
        <>
          {viewMode === 'grid' ? (
            <GameGrid
              games={data.data}
              favoriteGameIds={isAuthenticated ? favoriteGameIds : undefined}
            />
          ) : (
            <GameList
              games={data.data}
              favoriteGameIds={isAuthenticated ? favoriteGameIds : undefined}
            />
          )}

          {data.totalPages > 1 && (
            <PaginationWithInfo
              currentPage={data.page}
              totalPages={data.totalPages}
              pageSize={filters.limit || 50}
              totalItems={data.total}
              onPageChange={handlePageChange}
              siblingCount={1}
              showFirstLast={true}
              showInfo={true}
              className="mt-8 pb-2"
            />
          )}
        </>
      ) : null}
    </div>
  );
}
