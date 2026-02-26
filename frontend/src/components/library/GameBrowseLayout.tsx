import { useMemo, ReactNode, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useGames } from '@/hooks/useGames';
import { useFilterOptions, FilterOptionsParams } from '@/hooks/useFilterOptions';
import { useDebounce } from '@/hooks/useDebounce';
import { useFavoriteGameIds } from '@/hooks/useFavorites';
import { GameGrid } from './GameGrid';
import { GameList } from './GameList';
import { GameGridSkeleton } from './GameGridSkeleton';
import { GameListSkeleton } from './GameListSkeleton';
import { FilterPanel } from '@/components/search/FilterPanel';
import { SortControls } from '@/components/search/SortControls';
import type { FilterChip } from '@/components/search/FilterChips';
import { ViewOptions } from '@/components/common/ViewOptions';
import { PaginationWithInfo } from '@/components/ui/pagination';
import { useUIStore } from '@/store/ui';
import { useAuthStore } from '@/store/auth';
import { GameFilters } from '@/types/game';
import { BreadcrumbContext } from '@/components/common/Breadcrumbs';
import {
  parseFilterParams,
  buildFilterSearchParams,
  hasLegacyParams,
  FilterUrlParams,
} from '@/lib/filterUrlCompression';

interface GameBrowseLayoutProps {
  title: string;
  library: 'arcade' | 'theatre';
  platform?: string;
  headerContent?: ReactNode;
  breadcrumbContext?: BreadcrumbContext;
  /** Section key for URL building ('flash', 'html5', 'animations', 'browse') */
  sectionKey?: string | null;
}

export function GameBrowseLayout({
  title,
  library,
  platform,
  headerContent,
  breadcrumbContext,
  sectionKey = null,
}: GameBrowseLayoutProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const viewMode = useUIStore((state) => state.viewMode);
  const { isAuthenticated } = useAuthStore();
  const hasMigrated = useRef(false);

  const { data: favoriteGameIdsArray } = useFavoriteGameIds();
  const favoriteGameIds = useMemo(
    () => (favoriteGameIdsArray ? new Set(favoriteGameIdsArray) : undefined),
    [favoriteGameIdsArray]
  );

  // Parse URL params (handles both compressed and legacy formats)
  const urlParams = useMemo(() => parseFilterParams(searchParams), [searchParams]);

  // Migrate legacy params to compressed format on first load
  useEffect(() => {
    if (!hasMigrated.current && hasLegacyParams(searchParams)) {
      hasMigrated.current = true;
      const parsed = parseFilterParams(searchParams);
      const compressed = buildFilterSearchParams(parsed);
      setSearchParams(compressed, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const filters: GameFilters = useMemo(
    () => ({
      search: urlParams.search,
      platform: urlParams.platform ?? platform,
      series: urlParams.series,
      developers: urlParams.developers,
      publishers: urlParams.publishers,
      playModes: urlParams.playModes,
      languages: urlParams.languages,
      library,
      tags: urlParams.tags,
      yearFrom: urlParams.yearFrom,
      yearTo: urlParams.yearTo,
      sortBy: urlParams.sortBy ?? 'title',
      sortOrder: (urlParams.sortOrder as 'asc' | 'desc') ?? 'asc',
      page: urlParams.page ?? 1,
      limit: 50,
    }),
    [urlParams, platform, library]
  );

  // Memoize filter options params for context-aware filter options
  // When a filter is applied, other filter options update to show only relevant values
  const filterOptionsParams = useMemo<FilterOptionsParams>(
    () => ({
      platform: filters.platform,
      library: filters.library,
      // Pass current filter selections for context-aware options
      series: filters.series?.split(',').filter(Boolean),
      developers: filters.developers?.split(',').filter(Boolean),
      publishers: filters.publishers?.split(',').filter(Boolean),
      playModes: filters.playModes?.split(',').filter(Boolean),
      languages: filters.languages?.split(',').filter(Boolean),
      tags: filters.tags?.split(',').filter(Boolean),
      yearFrom: filters.yearFrom,
      yearTo: filters.yearTo,
    }),
    [filters]
  );

  // Debounce filter options params by 300ms to reduce API calls during rapid filter changes
  const debouncedFilterOptionsParams = useDebounce(filterOptionsParams, 300);

  // Fetch filter options at page level - context-aware based on current selections
  const {
    data: filterOptions,
    isLoading: filterOptionsLoading,
    error: filterOptionsError,
    refetch: refetchFilterOptions,
  } = useFilterOptions(debouncedFilterOptionsParams);

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
        .split(',')
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

  // Get filter application order from URL (tracks the order categories were added)
  // Format: "Series,Language,Tag" - first added is leftmost (parent)
  const filterOrder = useMemo(
    () => (urlParams.fo ? urlParams.fo.split(',').filter(Boolean) : []),
    [urlParams.fo]
  );

  const filterChips = useMemo(() => {
    const chips: FilterChip[] = [];

    // Build a map of category -> order based on filterOrder array
    const orderMap = new Map<string, number>();
    filterOrder.forEach((cat, idx) => {
      orderMap.set(cat, idx);
    });

    // Helper to get order for a category (use high number if not in order list)
    const getOrder = (category: string) => orderMap.get(category) ?? 999;

    if (filters.search) {
      chips.push({
        id: 'search',
        label: 'Search',
        value: filters.search,
        category: 'Search',
        order: getOrder('Search'),
      });
    }

    if (filters.platform && !platform) {
      chips.push({
        id: 'platform',
        label: 'Platform',
        value: filters.platform,
        category: 'Platform',
        order: getOrder('Platform'),
      });
    }

    if (filters.series) {
      const order = getOrder('Series');
      filters.series.split(',').forEach((series) => {
        chips.push({
          id: `series-${encodeURIComponent(series.trim())}`,
          label: 'Series',
          value: series,
          category: 'Series',
          order,
        });
      });
    }

    if (filters.developers) {
      const order = getOrder('Developer');
      filters.developers.split(',').forEach((dev) => {
        chips.push({
          id: `developers-${encodeURIComponent(dev.trim())}`,
          label: 'Developer',
          value: dev,
          category: 'Developer',
          order,
        });
      });
    }

    if (filters.publishers) {
      const order = getOrder('Publisher');
      filters.publishers.split(',').forEach((pub) => {
        chips.push({
          id: `publishers-${encodeURIComponent(pub.trim())}`,
          label: 'Publisher',
          value: pub,
          category: 'Publisher',
          order,
        });
      });
    }

    if (filters.playModes) {
      const order = getOrder('Play Mode');
      filters.playModes.split(',').forEach((mode) => {
        chips.push({
          id: `playModes-${encodeURIComponent(mode.trim())}`,
          label: 'Play Mode',
          value: mode,
          category: 'Play Mode',
          order,
        });
      });
    }

    if (filters.languages) {
      const order = getOrder('Language');
      filters.languages.split(',').forEach((lang) => {
        chips.push({
          id: `languages-${encodeURIComponent(lang.trim())}`,
          label: 'Language',
          value: lang,
          category: 'Language',
          order,
        });
      });
    }

    if (filters.tags) {
      const order = getOrder('Tag');
      filters.tags.split(',').forEach((tag) => {
        chips.push({
          id: `tags-${encodeURIComponent(tag.trim())}`,
          label: 'Tag',
          value: tag,
          category: 'Tag',
          order,
        });
      });
    }

    // Year range filters
    if (filters.yearFrom !== undefined || filters.yearTo !== undefined) {
      const yearValue =
        filters.yearFrom !== undefined && filters.yearTo !== undefined
          ? `${filters.yearFrom} - ${filters.yearTo}`
          : filters.yearFrom !== undefined
            ? `From ${filters.yearFrom}`
            : `To ${filters.yearTo}`;

      chips.push({
        id: 'yearRange',
        label: 'Year',
        value: yearValue,
        category: 'Year',
        order: getOrder('Year'),
      });
    }

    // Sort chips by order to maintain hierarchy (application order)
    return chips.sort((a, b) => a.order - b.order);
  }, [filters, platform, filterOrder]);

  // Helper to get updated filter order
  const getUpdatedFilterOrder = useCallback(
    (currentFo: string | undefined, categoriesToRemove: string[]): string | undefined => {
      const currentOrder = currentFo?.split(',').filter(Boolean) ?? [];
      const newOrder = currentOrder.filter((cat) => !categoriesToRemove.includes(cat));
      return newOrder.length > 0 ? newOrder.join(',') : undefined;
    },
    []
  );

  const handleRemoveChip = useCallback(
    (chipId: string) => {
      const newParams: FilterUrlParams = { ...urlParams, page: undefined };
      let categoryRemoved: string | null = null;

      if (chipId === 'search') {
        newParams.search = undefined;
        categoryRemoved = 'Search';
      } else if (chipId === 'platform') {
        newParams.platform = undefined;
        categoryRemoved = 'Platform';
      } else if (chipId === 'yearRange') {
        newParams.yearFrom = undefined;
        newParams.yearTo = undefined;
        categoryRemoved = 'Year';
      } else {
        const paramMap: Record<string, { param: keyof FilterUrlParams; value: string | undefined; category: string }> = {
          'series-': { param: 'series', value: filters.series, category: 'Series' },
          'developers-': { param: 'developers', value: filters.developers, category: 'Developer' },
          'publishers-': { param: 'publishers', value: filters.publishers, category: 'Publisher' },
          'playModes-': { param: 'playModes', value: filters.playModes, category: 'Play Mode' },
          'languages-': { param: 'languages', value: filters.languages, category: 'Language' },
          'tags-': { param: 'tags', value: filters.tags, category: 'Tag' },
        };

        const prefix = Object.keys(paramMap).find((p) => chipId.startsWith(p));
        if (prefix) {
          const { param, value, category } = paramMap[prefix];
          const decodedValue = decodeURIComponent(chipId.replace(prefix, ''));
          const remaining = value
            ?.split(',')
            .filter((v) => v.trim() !== decodedValue)
            .join(',');

          if (remaining) {
            (newParams as Record<string, unknown>)[param] = remaining;
          } else {
            (newParams as Record<string, unknown>)[param] = undefined;
            categoryRemoved = category;
          }
        }
      }

      // Update filter order if a category was completely removed
      if (categoryRemoved) {
        newParams.fo = getUpdatedFilterOrder(urlParams.fo, [categoryRemoved]);
      }

      setSearchParams(buildFilterSearchParams(newParams));
    },
    [urlParams, filters, setSearchParams, getUpdatedFilterOrder]
  );

  // Remove all filters at or after a certain order position (for tree hierarchy)
  const handleRemoveWithChildren = useCallback(
    (categoryOrder: number) => {
      // Get categories to remove (all at or after the given order)
      const categoriesToRemove = filterOrder.slice(categoryOrder);

      // Map category to param keys
      const categoryToParamKeys: Record<string, (keyof FilterUrlParams)[]> = {
        Search: ['search'],
        Platform: ['platform'],
        Series: ['series'],
        Developer: ['developers'],
        Publisher: ['publishers'],
        'Play Mode': ['playModes'],
        Language: ['languages'],
        Tag: ['tags'],
        Year: ['yearFrom', 'yearTo'],
      };

      const newParams: FilterUrlParams = { ...urlParams, page: undefined };

      // Clear all params for categories being removed
      for (const category of categoriesToRemove) {
        const paramKeys = categoryToParamKeys[category];
        if (paramKeys) {
          paramKeys.forEach((key) => {
            (newParams as Record<string, unknown>)[key] = undefined;
          });
        }
      }

      // Update filter order - keep only categories before the removed one
      newParams.fo = getUpdatedFilterOrder(urlParams.fo, categoriesToRemove);

      setSearchParams(buildFilterSearchParams(newParams));
    },
    [urlParams, setSearchParams, filterOrder, getUpdatedFilterOrder]
  );

  const handleClearAllFilters = useCallback(() => {
    const newParams: FilterUrlParams = {
      sortBy: urlParams.sortBy,
      sortOrder: urlParams.sortOrder,
    };
    setSearchParams(buildFilterSearchParams(newParams));
  }, [urlParams.sortBy, urlParams.sortOrder, setSearchParams]);

  const handlePageChange = useCallback(
    (newPage: number) => {
      const newParams: FilterUrlParams = { ...urlParams, page: newPage };
      setSearchParams(buildFilterSearchParams(newParams));
    },
    [urlParams, setSearchParams]
  );

  const handleSortChange = useCallback(
    (key: 'sortBy' | 'sortOrder', value: string) => {
      const newParams: FilterUrlParams = { ...urlParams, [key]: value, page: undefined };
      setSearchParams(buildFilterSearchParams(newParams));
    },
    [urlParams, setSearchParams]
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
        <FilterPanel
          filters={filters}
          filterOptions={filterOptions}
          filterOptionsLoading={filterOptionsLoading}
          filterOptionsError={filterOptionsError}
          refetchFilterOptions={refetchFilterOptions}
          showPlatformFilter={!platform}
          filterChips={filterChips}
          onRemoveChip={handleRemoveChip}
          onRemoveWithChildren={handleRemoveWithChildren}
          onClearAllFilters={handleClearAllFilters}
        />
      </div>

      {error ? (
        <div className="bg-destructive/10 border border-destructive rounded-lg p-4 text-destructive">
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
              sectionKey={sectionKey}
            />
          ) : (
            <GameList
              games={data.data}
              favoriteGameIds={isAuthenticated ? favoriteGameIds : undefined}
              breadcrumbContext={breadcrumbContext}
              sectionKey={sectionKey}
            />
          )}

          {data.totalPages > 1 ? (
            <PaginationWithInfo
              currentPage={data.page}
              totalPages={data.totalPages}
              pageSize={filters.limit || 50}
              totalItems={data.total}
              onPageChange={handlePageChange}
              showFirstLast={true}
              showInfo={true}
              className="mt-8 pb-4"
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
