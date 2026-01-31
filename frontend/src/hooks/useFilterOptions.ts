import { useQuery } from '@tanstack/react-query';
import { gamesApi } from '@/lib/api';
import { FilterOptions } from '@/types/game';

/**
 * Hook to fetch all filter options for the filter panel dropdowns
 * Caches results for 30 minutes to reduce API calls
 */
export function useFilterOptions() {
  return useQuery<FilterOptions>({
    queryKey: ['filter-options'],
    queryFn: () => gamesApi.getFilterOptions(),
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60, // 1 hour (formerly cacheTime)
  });
}
