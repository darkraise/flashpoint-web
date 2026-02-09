import { useQuery } from '@tanstack/react-query';
import { gamesApi } from '@/lib/api';
import { GameFilters } from '@/types/game';

export function useRecentGames(type: 'added' | 'modified', limit: number = 20, hours: number = 24) {
  return useQuery({
    queryKey: ['games', 'recent', type, limit, hours],
    queryFn: async () => {
      const sinceDate = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

      const filters: GameFilters = {
        [type === 'added' ? 'dateAddedSince' : 'dateModifiedSince']: sinceDate,
        sortBy: type === 'added' ? 'dateAdded' : 'dateModified',
        sortOrder: 'desc',
        limit,
        page: 1,
        library: 'arcade',
      };

      return gamesApi.search(filters);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}
