import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useMemo, useRef } from 'react';
import { gamesApi } from '@/lib/api';
import { FilterOptions } from '@/types/game';

export interface FilterOptionsParams {
  platform?: string;
  library?: string;
  // Context filters - when set, filter options update to reflect current selection
  series?: string[];
  developers?: string[];
  publishers?: string[];
  playModes?: string[];
  languages?: string[];
  tags?: string[];
  yearFrom?: number;
  yearTo?: number;
}

// Version bump to invalidate cached filter options after updates
const FILTER_OPTIONS_VERSION = 3;

// Default empty filter options
const EMPTY_FILTER_OPTIONS: FilterOptions = {
  series: [],
  developers: [],
  publishers: [],
  playModes: [],
  languages: [],
  tags: [],
  platforms: [],
  yearRange: { min: 1970, max: new Date().getFullYear() },
};

// Filter option keys that can be excluded
type FilterOptionKey = keyof Omit<FilterOptions, 'yearRange'> | 'yearRange';

export function useFilterOptions(params?: FilterOptionsParams) {
  // Track previously fetched options for merging with partial responses
  // This cache persists across query key changes and ensures excluded types always have data
  const cachedOptionsRef = useRef<FilterOptions>({ ...EMPTY_FILTER_OPTIONS });

  // Track which filter types have been successfully fetched at least once
  // Only exclude types that are already cached to prevent empty dropdowns
  const fetchedTypesRef = useRef<Set<FilterOptionKey>>(new Set());

  // Compute which filters are active (have selections)
  const activeFilters = useMemo(() => {
    const active: FilterOptionKey[] = [];
    if (params?.series?.length) active.push('series');
    if (params?.developers?.length) active.push('developers');
    if (params?.publishers?.length) active.push('publishers');
    if (params?.playModes?.length) active.push('playModes');
    if (params?.languages?.length) active.push('languages');
    if (params?.tags?.length) active.push('tags');
    if (params?.yearFrom !== undefined || params?.yearTo !== undefined) {
      active.push('yearRange');
    }
    return active;
  }, [
    params?.series,
    params?.developers,
    params?.publishers,
    params?.playModes,
    params?.languages,
    params?.tags,
    params?.yearFrom,
    params?.yearTo,
  ]);

  // Only exclude filter types that have been fetched before (have cached data)
  // This prevents empty dropdowns when filters are selected before initial load completes
  const excludedFilters = useMemo(() => {
    return activeFilters.filter((type) => fetchedTypesRef.current.has(type));
  }, [activeFilters]);

  // Convert arrays to comma-separated strings for API params
  const apiParams = useMemo(
    () =>
      params
        ? {
            platform: params.platform,
            library: params.library,
            series: params.series?.join(','),
            developers: params.developers?.join(','),
            publishers: params.publishers?.join(','),
            playModes: params.playModes?.join(','),
            languages: params.languages?.join(','),
            tags: params.tags?.join(','),
            yearFrom: params.yearFrom,
            yearTo: params.yearTo,
            // Exclude active filter types that are already cached
            exclude: excludedFilters.length > 0 ? excludedFilters.join(',') : undefined,
          }
        : undefined,
    [params, excludedFilters]
  );

  // Build query key from all params - refetch when any filter changes
  const queryKey = useMemo(
    () => [
      'filter-options',
      FILTER_OPTIONS_VERSION,
      params?.platform,
      params?.library,
      params?.series?.join(','),
      params?.developers?.join(','),
      params?.publishers?.join(','),
      params?.playModes?.join(','),
      params?.languages?.join(','),
      params?.tags?.join(','),
      params?.yearFrom,
      params?.yearTo,
      // Include exclude in key so changes trigger refetch
      excludedFilters.join(','),
    ],
    [params, excludedFilters]
  );

  // Shorter stale time when filters are applied (dynamic updates)
  const hasActiveFilters = activeFilters.length > 0;

  const query = useQuery<Partial<FilterOptions>>({
    queryKey,
    queryFn: () => gamesApi.getFilterOptions(apiParams),
    // Shorter cache for dynamic filters, longer for base page
    staleTime: hasActiveFilters ? 1000 * 30 : 1000 * 60 * 5, // 30s vs 5min
    gcTime: 1000 * 60 * 10, // 10 minutes
    // Keep previous data while fetching new data - prevents dropdown from clearing during refetch
    placeholderData: keepPreviousData,
  });

  // Merge response with cached options for excluded types
  const mergedData = useMemo<FilterOptions | undefined>(() => {
    if (!query.data) return undefined;

    const newData = query.data;

    // Update cache with any new data we received (only non-undefined values)
    // Also track which types have been successfully fetched
    if (newData.series !== undefined && newData.series.length > 0) {
      cachedOptionsRef.current.series = newData.series;
      fetchedTypesRef.current.add('series');
    }
    if (newData.developers !== undefined && newData.developers.length > 0) {
      cachedOptionsRef.current.developers = newData.developers;
      fetchedTypesRef.current.add('developers');
    }
    if (newData.publishers !== undefined && newData.publishers.length > 0) {
      cachedOptionsRef.current.publishers = newData.publishers;
      fetchedTypesRef.current.add('publishers');
    }
    if (newData.playModes !== undefined && newData.playModes.length > 0) {
      cachedOptionsRef.current.playModes = newData.playModes;
      fetchedTypesRef.current.add('playModes');
    }
    if (newData.languages !== undefined && newData.languages.length > 0) {
      cachedOptionsRef.current.languages = newData.languages;
      fetchedTypesRef.current.add('languages');
    }
    if (newData.tags !== undefined && newData.tags.length > 0) {
      cachedOptionsRef.current.tags = newData.tags;
      fetchedTypesRef.current.add('tags');
    }
    if (newData.platforms !== undefined && newData.platforms.length > 0) {
      cachedOptionsRef.current.platforms = newData.platforms;
      fetchedTypesRef.current.add('platforms');
    }
    if (newData.yearRange !== undefined) {
      cachedOptionsRef.current.yearRange = newData.yearRange;
      fetchedTypesRef.current.add('yearRange');
    }

    // Return merged result - always use cached values for missing/excluded types
    return {
      series: newData.series ?? cachedOptionsRef.current.series,
      developers: newData.developers ?? cachedOptionsRef.current.developers,
      publishers: newData.publishers ?? cachedOptionsRef.current.publishers,
      playModes: newData.playModes ?? cachedOptionsRef.current.playModes,
      languages: newData.languages ?? cachedOptionsRef.current.languages,
      tags: newData.tags ?? cachedOptionsRef.current.tags,
      platforms: newData.platforms ?? cachedOptionsRef.current.platforms,
      yearRange: newData.yearRange ?? cachedOptionsRef.current.yearRange,
    };
  }, [query.data]);

  // Return query with merged data
  return {
    ...query,
    data: mergedData,
  };
}
