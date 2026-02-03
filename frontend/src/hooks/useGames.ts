import { useQuery } from '@tanstack/react-query';
import { gamesApi } from '@/lib/api';
import { GameFilters } from '@/types/game';

export function useGames(filters: GameFilters) {
  return useQuery({
    queryKey: ['games', filters],
    queryFn: () => gamesApi.search(filters),
    // OPTIMIZATION: Configure caching to reduce redundant API calls
    staleTime: 1000 * 60 * 5, // 5 minutes - game metadata rarely changes
    gcTime: 1000 * 60 * 30, // 30 minutes - keep in memory longer
    refetchOnWindowFocus: false, // Don't refetch when user switches tabs
    refetchOnMount: false, // Use cached data if available on component mount
  });
}

export function useGame(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['game', id],
    queryFn: () => gamesApi.getById(id),
    enabled: !!id && options?.enabled !== false,
  });
}

export function useRelatedGames(id: string, limit = 10) {
  return useQuery({
    queryKey: ['games', id, 'related', limit],
    queryFn: () => gamesApi.getRelated(id, limit),
    enabled: !!id,
  });
}

export function useRandomGame(library?: string) {
  return useQuery({
    queryKey: ['games', 'random', library],
    queryFn: () => gamesApi.getRandom(library),
  });
}

export function useGameLaunchData(id: string) {
  return useQuery({
    queryKey: ['game', id, 'launch'],
    queryFn: () => gamesApi.getLaunchData(id),
    enabled: !!id,
  });
}
