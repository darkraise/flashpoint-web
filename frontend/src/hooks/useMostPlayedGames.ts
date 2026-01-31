import { useQuery } from '@tanstack/react-query';
import { gamesApi } from '@/lib/api';

/**
 * Custom hook for fetching most played games globally
 * Used by the Home page to show "Most Played Games" section
 *
 * @param limit - Number of games to fetch (default: 20)
 * @returns TanStack Query result with most played games
 */
export function useMostPlayedGames(limit: number = 20) {
  return useQuery({
    queryKey: ['games', 'most-played', limit],
    queryFn: () => gamesApi.getMostPlayed(limit),
    // Cache for 10 minutes since play stats don't change frequently
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000, // Keep in memory for 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}
