import { useQuery } from '@tanstack/react-query';
import { gamesApi } from '@/lib/api';
import { GameFilters } from '@/types/game';

export function useGames(filters: GameFilters) {
  return useQuery({
    queryKey: ['games', filters],
    queryFn: ({ signal }) => gamesApi.search(filters, signal),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
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
    // Auto-poll every 2s while the game ZIP is being downloaded
    refetchInterval: (query) => (query.state.data?.downloading ? 2000 : false),
  });
}
