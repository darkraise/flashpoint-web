import { useQuery } from '@tanstack/react-query';
import { gamesApi } from '@/lib/api';
import { GameFilters } from '@/types/game';

/**
 * Custom hook for fetching recent games (added or modified)
 * Used by the Home page to show "Recently Added" and "Recently Updated" sections
 *
 * @param type - Type of recent games: 'added' or 'modified'
 * @param limit - Number of games to fetch (default: 20)
 * @param hours - Time window in hours for "recent" games (default: 24)
 * @returns TanStack Query result with recent games
 */
export function useRecentGames(type: 'added' | 'modified', limit: number = 20, hours: number = 24) {
  return useQuery({
    queryKey: ['games', 'recent', type, limit, hours],
    queryFn: async () => {
      // Calculate timestamp based on configured hours
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
    // Match backend cache TTL (5 minutes)
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000, // Keep in memory for 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}
