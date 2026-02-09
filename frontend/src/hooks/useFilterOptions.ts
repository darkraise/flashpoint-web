import { useQuery } from '@tanstack/react-query';
import { gamesApi } from '@/lib/api';
import { FilterOptions } from '@/types/game';

export function useFilterOptions() {
  return useQuery<FilterOptions>({
    queryKey: ['filter-options'],
    queryFn: () => gamesApi.getFilterOptions(),
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
  });
}
