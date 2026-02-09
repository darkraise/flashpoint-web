import { useMemo, ReactNode, useCallback } from 'react';
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
import { BreadcrumbContext } from '@/components/common/Breadcrumbs';

interface GameBrowseLayoutProps {
  title: string;
  library: 'arcade' | 'theatre';
  platform?: string;
  headerContent?: ReactNode;
  breadcrumbContext?: BreadcrumbContext;
}

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

  const { data: favoriteGameIdsArray } = useFavoriteGameIds();
  const favoriteGameIds = useMemo(
    () => (favoriteGameIdsArray ? new Set(favoriteGameIdsArray) : undefined),
    [favoriteGameIdsArray]
  );

  const filters: GameFilters = useMemo(
    () => ({
      search: searchParams.get('search') || undefined,
      platform: searchParams.get('platform') || platform || undefined,
      series: searchParams.get('series') || undefined,
      developers: searchParams.get('developers') || undefined,
      publishers: searchParams.get('publishers') || undefined,
      playModes: searchParams.get('playModes') || undefined,
      languages: searchParams.get('languages') || undefined,
      library,
      tags: searchParams.get('tags') || undefined,
      yearFrom: (() => {
        const raw = searchParams.get('yearFrom');
        if (!raw) return undefined;
        const parsed = parseInt(raw, 10);
        return isNaN(parsed) ? undefined : parsed;
      })(),
      yearTo: (() => {
        const raw = searchParams.get('yearTo');
        if (!raw) return undefined;
        const parsed = parseInt(raw, 10);
        return isNaN(parsed) ? undefined : parsed;
      })(),
      sortBy: searchParams.get('sortBy') || 'title',
      sortOrder: (searchParams.get('sortOrder') || 'asc') as 'asc' | 'desc',
      page: parseInt(searchParams.get('page') || '1', 10),
      limit: 50,
    }),
    [searchParams, platform, library]
  );

  const pageTitle = useMemo(() => {
    const parts: string[] = [];

    if (filters.search) {
      return `Search result for "${filters.search}"`;
    }

    if (filters.platform && !filters.tags) {
      return title;
    }

    if (filters.platform) {
      parts.push(title);
    }

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

    return parts.length > 0 ? parts.join(' ') : title;
  }, [filters.search, filters.platform, filters.tags, title]);

  const { data, isLoading, error } = useGames(filters);

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
      filters.series.split(',').forEach((series) => {
        chips.push({
          id: `series-${encodeURIComponent(series.trim())}`,
          label: 'Series',
          value: series,
          category: 'Series',
        });
      });
    }

    if (filters.developers) {
      filters.developers.split(',').forEach((dev) => {
        chips.push({
          id: `developers-${encodeURIComponent(dev.trim())}`,
          label: 'Developer',
          value: dev,
          category: 'Developer',
        });
      });
    }

    if (filters.publishers) {
      filters.publishers.split(',').forEach((pub) => {
        chips.push({
          id: `publishers-${encodeURIComponent(pub.trim())}`,
          label: 'Publisher',
          value: pub,
          category: 'Publisher',
        });
      });
    }

    if (filters.playModes) {
      filters.playModes.split(',').forEach((mode) => {
        chips.push({
          id: `playModes-${encodeURIComponent(mode.trim())}`,
          label: 'Play Mode',
          value: mode,
          category: 'Play Mode',
        });
      });
    }

    if (filters.languages) {
      filters.languages.split(',').forEach((lang) => {
        chips.push({
          id: `languages-${encodeURIComponent(lang.trim())}`,
          label: 'Language',
          value: lang,
          category: 'Language',
        });
      });
    }

    if (filters.tags) {
      filters.tags.split(',').forEach((tag) => {
        chips.push({
          id: `tags-${encodeURIComponent(tag.trim())}`,
          label: 'Tag',
          value: tag,
          category: 'Tag',
        });
      });
    }

    return chips;
  }, [filters, platform]);

  const handleRemoveChip = useCallback(
    (chipId: string) => {
      const newParams = new URLSearchParams(searchParams);

      if (chipId === 'search') {
        newParams.delete('search');
      } else if (chipId === 'platform') {
        newParams.delete('platform');
      } else {
        const paramMap: Record<string, { param: string; value: string | undefined }> = {
          'series-': { param: 'series', value: filters.series },
          'developers-': { param: 'developers', value: filters.developers },
          'publishers-': { param: 'publishers', value: filters.publishers },
          'playModes-': { param: 'playModes', value: filters.playModes },
          'languages-': { param: 'languages', value: filters.languages },
          'tags-': { param: 'tags', value: filters.tags },
        };

        const prefix = Object.keys(paramMap).find((p) => chipId.startsWith(p));
        if (prefix) {
          const { param, value } = paramMap[prefix];
          const decodedValue = decodeURIComponent(chipId.replace(prefix, ''));
          const remaining = value
            ?.split(',')
            .filter((v) => v.trim() !== decodedValue)
            .join(',');

          if (remaining) {
            newParams.set(param, remaining);
          } else {
            newParams.delete(param);
          }
        }
      }

      newParams.delete('page'); // Reset to page 1
      setSearchParams(newParams);
    },
    [searchParams, filters, setSearchParams]
  );

  const handleClearAllFilters = useCallback(() => {
    const newParams = new URLSearchParams();
    const sortBy = searchParams.get('sortBy');
    const sortOrder = searchParams.get('sortOrder');
    if (sortBy) newParams.set('sortBy', sortBy);
    if (sortOrder) newParams.set('sortOrder', sortOrder);
    setSearchParams(newParams);
  }, [searchParams, setSearchParams]);

  const handlePageChange = useCallback(
    (newPage: number) => {
      const newParams = new URLSearchParams(searchParams);
      newParams.set('page', newPage.toString());
      setSearchParams(newParams);
    },
    [searchParams, setSearchParams]
  );

  const handleSortChange = useCallback(
    (key: 'sortBy' | 'sortOrder', value: string) => {
      const newParams = new URLSearchParams(searchParams);
      newParams.set(key, value);
      newParams.delete('page'); // Reset to page 1
      setSearchParams(newParams);
    },
    [searchParams, setSearchParams]
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{pageTitle}</h1>
          {isLoading ? (
            <div className="h-5 bg-muted rounded w-32 mt-1 animate-pulse"></div>
          ) : data ? (
            <p className="text-sm text-muted-foreground mt-1">
              Found {data.total.toLocaleString()} games
            </p>
          ) : null}
          {headerContent}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <SortControls
            sortBy={filters.sortBy}
            sortOrder={filters.sortOrder}
            onSortChange={handleSortChange}
          />
          <ViewOptions />
        </div>
      </div>

      <div className="bg-card rounded-lg p-4 border border-border relative">
        <FilterPanel filters={filters} showPlatformFilter={!platform} />
      </div>

      {filterChips.length > 0 ? (
        <FilterChips
          chips={filterChips}
          onRemove={handleRemoveChip}
          onClearAll={handleClearAllFilters}
        />
      ) : null}

      {error ? (
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 text-red-300">
          Error loading games: {error.message}
        </div>
      ) : null}

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

          {data.totalPages > 1 ? (
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
          ) : null}
        </>
      ) : null}
    </div>
  );
}
