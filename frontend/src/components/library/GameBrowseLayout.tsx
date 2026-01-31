import { useMemo, ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useGames } from '@/hooks/useGames';
import { useFavoriteGameIds } from '@/hooks/useFavorites';
import { GameGrid } from './GameGrid';
import { GameList } from './GameList';
import { GameGridSkeleton } from './GameGridSkeleton';
import { GameListSkeleton } from './GameListSkeleton';
import { FilterPanel } from '@/components/search/FilterPanel';
import { SortControls } from '@/components/search/SortControls';
import { FilterChips, FilterChip } from '@/components/search/FilterChips';
import { ViewOptions } from '@/components/common/ViewOptions';
import { PaginationWithInfo } from '@/components/ui/pagination';
import { useUIStore } from '@/store/ui';
import { useAuthStore } from '@/store/auth';
import { GameFilters } from '@/types/game';
import { BreadcrumbContext } from './GameCard';

interface GameBrowseLayoutProps {
  title: string;
  library: 'arcade' | 'theatre';
  platform?: string;
  headerContent?: ReactNode;
  breadcrumbContext?: BreadcrumbContext; // Optional: Context for breadcrumb navigation
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
  breadcrumbContext,
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
    yearTo: searchParams.get('yearTo') ? parseInt(searchParams.get('yearTo')!, 10) : undefined,
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
    if (filters.platform && !filters.tags) {
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

    // Default title
    return parts.length > 0 ? parts.join(' ') : title;
  }, [filters.search, filters.platform, filters.tags, title]);

  const { data, isLoading, error } = useGames(filters);

  // Build filter chips from active filters
  const filterChips = useMemo(() => {
    const chips: FilterChip[] = [];

    if (filters.search) {
      chips.push({
        id: 'search',
        label: 'Search',
        value: filters.search,
        category: 'Search',
      });
    }

    if (filters.platform && !platform) {
      chips.push({
        id: 'platform',
        label: 'Platform',
        value: filters.platform,
        category: 'Platform',
      });
    }

    if (filters.series) {
      filters.series.split(',').forEach((series, index) => {
        chips.push({
          id: `series-${index}`,
          label: 'Series',
          value: series,
          category: 'Series',
        });
      });
    }

    if (filters.developers) {
      filters.developers.split(',').forEach((dev, index) => {
        chips.push({
          id: `developers-${index}`,
          label: 'Developer',
          value: dev,
          category: 'Developer',
        });
      });
    }

    if (filters.publishers) {
      filters.publishers.split(',').forEach((pub, index) => {
        chips.push({
          id: `publishers-${index}`,
          label: 'Publisher',
          value: pub,
          category: 'Publisher',
        });
      });
    }

    if (filters.playModes) {
      filters.playModes.split(',').forEach((mode, index) => {
        chips.push({
          id: `playModes-${index}`,
          label: 'Play Mode',
          value: mode,
          category: 'Play Mode',
        });
      });
    }

    if (filters.languages) {
      filters.languages.split(',').forEach((lang, index) => {
        chips.push({
          id: `languages-${index}`,
          label: 'Language',
          value: lang,
          category: 'Language',
        });
      });
    }

    if (filters.tags) {
      filters.tags.split(',').forEach((tag, index) => {
        chips.push({
          id: `tags-${index}`,
          label: 'Tag',
          value: tag,
          category: 'Tag',
        });
      });
    }

    return chips;
  }, [filters, platform]);

  const handleRemoveChip = (chipId: string) => {
    const newParams = new URLSearchParams(searchParams);

    if (chipId === 'search') {
      newParams.delete('search');
    } else if (chipId === 'platform') {
      newParams.delete('platform');
    } else if (chipId.startsWith('series-')) {
      const remaining = filters.series
        ?.split(',')
        .filter((_, i) => chipId !== `series-${i}`)
        .join(',');
      if (remaining) {
        newParams.set('series', remaining);
      } else {
        newParams.delete('series');
      }
    } else if (chipId.startsWith('developers-')) {
      const remaining = filters.developers
        ?.split(',')
        .filter((_, i) => chipId !== `developers-${i}`)
        .join(',');
      if (remaining) {
        newParams.set('developers', remaining);
      } else {
        newParams.delete('developers');
      }
    } else if (chipId.startsWith('publishers-')) {
      const remaining = filters.publishers
        ?.split(',')
        .filter((_, i) => chipId !== `publishers-${i}`)
        .join(',');
      if (remaining) {
        newParams.set('publishers', remaining);
      } else {
        newParams.delete('publishers');
      }
    } else if (chipId.startsWith('playModes-')) {
      const remaining = filters.playModes
        ?.split(',')
        .filter((_, i) => chipId !== `playModes-${i}`)
        .join(',');
      if (remaining) {
        newParams.set('playModes', remaining);
      } else {
        newParams.delete('playModes');
      }
    } else if (chipId.startsWith('languages-')) {
      const remaining = filters.languages
        ?.split(',')
        .filter((_, i) => chipId !== `languages-${i}`)
        .join(',');
      if (remaining) {
        newParams.set('languages', remaining);
      } else {
        newParams.delete('languages');
      }
    } else if (chipId.startsWith('tags-')) {
      const remaining = filters.tags
        ?.split(',')
        .filter((_, i) => chipId !== `tags-${i}`)
        .join(',');
      if (remaining) {
        newParams.set('tags', remaining);
      } else {
        newParams.delete('tags');
      }
    }

    newParams.delete('page'); // Reset to page 1
    setSearchParams(newParams);
  };

  const handleClearAllFilters = () => {
    const newParams = new URLSearchParams();
    // Keep sort params if they exist
    const sortBy = searchParams.get('sortBy');
    const sortOrder = searchParams.get('sortOrder');
    if (sortBy) newParams.set('sortBy', sortBy);
    if (sortOrder) newParams.set('sortOrder', sortOrder);
    setSearchParams(newParams);
  };

  const handlePageChange = (newPage: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', newPage.toString());
    setSearchParams(newParams);
  };

  const handleSortChange = (key: 'sortBy' | 'sortOrder', value: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set(key, value);
    newParams.delete('page'); // Reset to page 1
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

        {/* Sort and View Mode Controls - Right Side */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <SortControls
            sortBy={filters.sortBy}
            sortOrder={filters.sortOrder}
            onSortChange={handleSortChange}
          />
          <ViewOptions />
        </div>
      </div>

      {/* Filter Panel - Separate Section */}
      <div className="bg-card rounded-lg p-4 border border-border relative">
        <FilterPanel filters={filters} showPlatformFilter={!platform} />
      </div>

      {/* Active Filter Chips */}
      {filterChips.length > 0 && (
        <FilterChips
          chips={filterChips}
          onRemove={handleRemoveChip}
          onClearAll={handleClearAllFilters}
        />
      )}

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
              breadcrumbContext={breadcrumbContext}
            />
          ) : (
            <GameList
              games={data.data}
              favoriteGameIds={isAuthenticated ? favoriteGameIds : undefined}
              breadcrumbContext={breadcrumbContext}
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
