import { useQuery } from '@tanstack/react-query';
import { gamesApi } from '@/lib/api';

export function useMostPlayedGames(limit: number = 20) {
  return useQuery({
    queryKey: ['games', 'most-played', limit],
    queryFn: () => gamesApi.getMostPlayed(limit),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}
