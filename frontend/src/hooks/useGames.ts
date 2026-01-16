import { useQuery } from '@tanstack/react-query';
import { gamesApi } from '@/lib/api';
import { GameFilters } from '@/types/game';

export function useGames(filters: GameFilters) {
  return useQuery({
    queryKey: ['games', filters],
    queryFn: () => gamesApi.search(filters)
  });
}

export function useGame(id: string) {
  return useQuery({
    queryKey: ['game', id],
    queryFn: () => gamesApi.getById(id),
    enabled: !!id
  });
}

export function useRelatedGames(id: string, limit = 10) {
  return useQuery({
    queryKey: ['games', id, 'related', limit],
    queryFn: () => gamesApi.getRelated(id, limit),
    enabled: !!id
  });
}

export function useRandomGame(library?: string) {
  return useQuery({
    queryKey: ['games', 'random', library],
    queryFn: () => gamesApi.getRandom(library)
  });
}

export function useGameLaunchData(id: string) {
  return useQuery({
    queryKey: ['game', id, 'launch'],
    queryFn: () => gamesApi.getLaunchData(id),
    enabled: !!id
  });
}
