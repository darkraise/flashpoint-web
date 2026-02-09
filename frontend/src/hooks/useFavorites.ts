import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { favoritesApi } from '@/lib/api';
import { FavoritesStats } from '@/types/favorite';
import { useFeatureFlags } from './useFeatureFlags';
import { useDialog } from '@/contexts/DialogContext';
import { getErrorMessage } from '@/types/api-error';

export function useFavorites(limit?: number, offset?: number) {
  const { enableFavorites } = useFeatureFlags();

  return useQuery({
    queryKey: ['favorites', { limit, offset }],
    queryFn: () => favoritesApi.getAll(limit, offset),
    enabled: enableFavorites,
  });
}

export function useFavoriteGameIds() {
  const { enableFavorites } = useFeatureFlags();

  return useQuery({
    queryKey: ['favorites', 'game-ids'],
    queryFn: () => favoritesApi.getGameIds(),
    enabled: enableFavorites,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

export function useFavoriteGames(
  limit?: number,
  offset?: number,
  sortBy?: 'title' | 'dateAdded',
  sortOrder?: 'asc' | 'desc'
) {
  const { enableFavorites } = useFeatureFlags();

  return useQuery({
    queryKey: ['favorites', 'games', { limit, offset, sortBy, sortOrder }],
    queryFn: () => favoritesApi.getGames(limit, offset, sortBy, sortOrder),
    enabled: enableFavorites,
  });
}

export function useFavoritesStats() {
  const { enableFavorites } = useFeatureFlags();

  return useQuery({
    queryKey: ['favorites', 'stats'],
    queryFn: () => favoritesApi.getStats(),
    enabled: enableFavorites,
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();
  const { showToast } = useDialog();

  return useMutation({
    mutationFn: (gameId: string) => favoritesApi.toggle(gameId),

    onMutate: async (gameId) => {
      await queryClient.cancelQueries({ queryKey: ['favorites', 'game-ids'] });
      const previousIds = queryClient.getQueryData<string[]>(['favorites', 'game-ids']);

      queryClient.setQueryData<string[]>(['favorites', 'game-ids'], (old = []) => {
        const isFavorited = old.includes(gameId);
        return isFavorited
          ? old.filter((id) => id !== gameId) // Remove
          : [...old, gameId]; // Add
      });

      queryClient.setQueryData<FavoritesStats>(['favorites', 'stats'], (old) => {
        if (!old) return old;
        const wasAdded = !(previousIds || []).includes(gameId);
        return {
          ...old,
          totalFavorites: wasAdded
            ? (old.totalFavorites || 0) + 1
            : Math.max(0, (old.totalFavorites || 0) - 1),
        };
      });

      return { previousIds };
    },

    onError: (err: unknown, _gameId, context) => {
      if (context?.previousIds) {
        queryClient.setQueryData(['favorites', 'game-ids'], context.previousIds);
      }
      const message = getErrorMessage(err) || 'Failed to toggle favorite';
      showToast(message, 'error');
    },

    onSuccess: (_isFavorited, _gameId) => {
      queryClient.invalidateQueries({
        queryKey: ['favorites'],
        predicate: (query) =>
          query.queryKey[0] === 'favorites' &&
          query.queryKey.length > 1 &&
          query.queryKey[1] !== 'game-ids' &&
          query.queryKey[1] !== 'stats',
      });
    },
  });
}

export function useAddFavorite() {
  const queryClient = useQueryClient();
  const { showToast } = useDialog();

  return useMutation({
    mutationFn: (gameId: string) => favoritesApi.add(gameId),

    onMutate: async (gameId) => {
      await queryClient.cancelQueries({ queryKey: ['favorites', 'game-ids'] });
      const previousIds = queryClient.getQueryData<string[]>(['favorites', 'game-ids']);

      queryClient.setQueryData<string[]>(['favorites', 'game-ids'], (old = []) => {
        if (old.includes(gameId)) return old;
        return [...old, gameId];
      });

      queryClient.setQueryData<FavoritesStats>(['favorites', 'stats'], (old) => {
        if (!old) return old;
        return { ...old, totalFavorites: (old.totalFavorites || 0) + 1 };
      });

      return { previousIds };
    },

    onError: (err: unknown, _gameId, context) => {
      if (context?.previousIds) {
        queryClient.setQueryData(['favorites', 'game-ids'], context.previousIds);
      }
      const message = getErrorMessage(err) || 'Failed to add favorite';
      showToast(message, 'error');
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['favorites'],
        predicate: (query) =>
          query.queryKey[0] === 'favorites' &&
          query.queryKey.length > 1 &&
          query.queryKey[1] !== 'game-ids' &&
          query.queryKey[1] !== 'stats',
      });
    },
  });
}

export function useRemoveFavorite() {
  const queryClient = useQueryClient();
  const { showToast } = useDialog();

  return useMutation({
    mutationFn: (gameId: string) => favoritesApi.remove(gameId),

    onMutate: async (gameId) => {
      await queryClient.cancelQueries({ queryKey: ['favorites', 'game-ids'] });
      const previousIds = queryClient.getQueryData<string[]>(['favorites', 'game-ids']);

      queryClient.setQueryData<string[]>(['favorites', 'game-ids'], (old = []) => {
        return old.filter((id) => id !== gameId);
      });

      queryClient.setQueryData<FavoritesStats>(['favorites', 'stats'], (old) => {
        if (!old) return old;
        return { ...old, totalFavorites: Math.max(0, (old.totalFavorites || 0) - 1) };
      });

      return { previousIds };
    },

    onError: (err: unknown, _gameId, context) => {
      if (context?.previousIds) {
        queryClient.setQueryData(['favorites', 'game-ids'], context.previousIds);
      }
      const message = getErrorMessage(err) || 'Failed to remove favorite';
      showToast(message, 'error');
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['favorites'],
        predicate: (query) =>
          query.queryKey[0] === 'favorites' &&
          query.queryKey.length > 1 &&
          query.queryKey[1] !== 'game-ids' &&
          query.queryKey[1] !== 'stats',
      });
    },
  });
}

export function useBatchAddFavorites() {
  const queryClient = useQueryClient();
  const { showToast } = useDialog();

  return useMutation({
    mutationFn: (gameIds: string[]) => favoritesApi.batchAdd(gameIds),

    onMutate: async (gameIds) => {
      await queryClient.cancelQueries({ queryKey: ['favorites', 'game-ids'] });
      const previousIds = queryClient.getQueryData<string[]>(['favorites', 'game-ids']);

      queryClient.setQueryData<string[]>(['favorites', 'game-ids'], (old = []) => {
        const newIds = gameIds.filter((id) => !old.includes(id));
        return [...old, ...newIds];
      });

      queryClient.setQueryData<FavoritesStats>(['favorites', 'stats'], (old) => {
        if (!old) return old;
        const newIds = gameIds.filter((id) => !(previousIds || []).includes(id));
        return { ...old, totalFavorites: (old.totalFavorites || 0) + newIds.length };
      });

      return { previousIds };
    },

    onError: (err: unknown, _gameIds, context) => {
      if (context?.previousIds) {
        queryClient.setQueryData(['favorites', 'game-ids'], context.previousIds);
      }
      const message = getErrorMessage(err) || 'Failed to add favorites';
      showToast(message, 'error');
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['favorites'],
        predicate: (query) =>
          query.queryKey[0] === 'favorites' &&
          query.queryKey.length > 1 &&
          query.queryKey[1] !== 'game-ids' &&
          query.queryKey[1] !== 'stats',
      });
    },
  });
}

export function useBatchRemoveFavorites() {
  const queryClient = useQueryClient();
  const { showToast } = useDialog();

  return useMutation({
    mutationFn: (gameIds: string[]) => favoritesApi.batchRemove(gameIds),

    onMutate: async (gameIds) => {
      await queryClient.cancelQueries({ queryKey: ['favorites', 'game-ids'] });
      const previousIds = queryClient.getQueryData<string[]>(['favorites', 'game-ids']);

      queryClient.setQueryData<string[]>(['favorites', 'game-ids'], (old = []) => {
        return old.filter((id) => !gameIds.includes(id));
      });

      queryClient.setQueryData<FavoritesStats>(['favorites', 'stats'], (old) => {
        if (!old) return old;
        const removedCount = gameIds.length;
        return { ...old, totalFavorites: Math.max(0, (old.totalFavorites || 0) - removedCount) };
      });

      return { previousIds };
    },

    onError: (err: unknown, _gameIds, context) => {
      if (context?.previousIds) {
        queryClient.setQueryData(['favorites', 'game-ids'], context.previousIds);
      }
      const message = getErrorMessage(err) || 'Failed to remove favorites';
      showToast(message, 'error');
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['favorites'],
        predicate: (query) =>
          query.queryKey[0] === 'favorites' &&
          query.queryKey.length > 1 &&
          query.queryKey[1] !== 'game-ids' &&
          query.queryKey[1] !== 'stats',
      });
    },
  });
}

export function useClearAllFavorites() {
  const queryClient = useQueryClient();
  const { showToast } = useDialog();

  return useMutation({
    mutationFn: () => favoritesApi.clearAll(),

    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['favorites', 'game-ids'] });
      const previousIds = queryClient.getQueryData<string[]>(['favorites', 'game-ids']);

      queryClient.setQueryData<string[]>(['favorites', 'game-ids'], []);

      queryClient.setQueryData<FavoritesStats>(['favorites', 'stats'], (old) => {
        if (!old) return old;
        return { ...old, totalFavorites: 0 };
      });

      return { previousIds };
    },

    onError: (err: unknown, _, context) => {
      if (context?.previousIds) {
        queryClient.setQueryData(['favorites', 'game-ids'], context.previousIds);
      }
      const message = getErrorMessage(err) || 'Failed to clear favorites';
      showToast(message, 'error');
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });
}
