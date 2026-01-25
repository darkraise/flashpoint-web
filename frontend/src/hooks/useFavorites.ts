import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { favoritesApi } from '@/lib/api';
import { useFeatureFlags } from './useFeatureFlags';
import { useDialog } from '@/contexts/DialogContext';

/**
 * Hook to fetch all user favorites
 */
export function useFavorites(limit?: number, offset?: number) {
  const { enableFavorites } = useFeatureFlags();

  return useQuery({
    queryKey: ['favorites', { limit, offset }],
    queryFn: () => favoritesApi.getAll(limit, offset),
    enabled: enableFavorites
  });
}

/**
 * Hook to fetch favorite game IDs
 */
export function useFavoriteGameIds() {
  const { enableFavorites } = useFeatureFlags();

  return useQuery({
    queryKey: ['favorites', 'game-ids'],
    queryFn: () => favoritesApi.getGameIds(),
    enabled: enableFavorites,
    // OPTIMIZATION: Configure caching to prevent refetch on every pagination
    staleTime: 1000 * 60 * 2, // 2 minutes - acceptable staleness for favorites
    gcTime: 1000 * 60 * 10, // 10 minutes - keep in memory
    refetchOnMount: false, // Don't refetch on every component mount
    refetchOnWindowFocus: false, // Don't refetch when user switches tabs
  });
}

/**
 * Hook to fetch favorite games with full game data
 */
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
    enabled: enableFavorites
  });
}

/**
 * Hook to fetch favorites statistics
 */
export function useFavoritesStats() {
  const { enableFavorites } = useFeatureFlags();

  return useQuery({
    queryKey: ['favorites', 'stats'],
    queryFn: () => favoritesApi.getStats(),
    enabled: enableFavorites
  });
}

/**
 * Hook to toggle favorite status for a game
 * Uses optimistic updates for immediate UI feedback
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient();
  const { showToast } = useDialog();

  return useMutation({
    mutationFn: (gameId: string) => favoritesApi.toggle(gameId),

    // Optimistic update - immediate UI
    onMutate: async (gameId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['favorites', 'game-ids'] });

      // Snapshot previous value for rollback
      const previousIds = queryClient.getQueryData<string[]>(['favorites', 'game-ids']);

      // Optimistically update cache
      queryClient.setQueryData<string[]>(['favorites', 'game-ids'], (old = []) => {
        const isFavorited = old.includes(gameId);
        return isFavorited
          ? old.filter(id => id !== gameId)  // Remove
          : [...old, gameId];                // Add
      });

      // Update stats optimistically
      queryClient.setQueryData(['favorites', 'stats'], (old: any) => {
        if (!old) return old;
        const previousIds = queryClient.getQueryData<string[]>(['favorites', 'game-ids']) || [];
        const wasAdded = !previousIds.includes(gameId);
        return {
          ...old,
          totalFavorites: wasAdded ? (old.totalFavorites || 0) + 1 : Math.max(0, (old.totalFavorites || 0) - 1)
        };
      });

      return { previousIds };
    },

    // Rollback on error
    onError: (err: any, _gameId, context) => {
      if (context?.previousIds) {
        queryClient.setQueryData(['favorites', 'game-ids'], context.previousIds);
      }
      // Show error toast
      const message = err?.response?.data?.error?.message || 'Failed to toggle favorite';
      showToast(message, 'error');
    },

    // Verify with server response
    onSuccess: (_isFavorited, _gameId) => {
      // Invalidate paginated lists (they might have changed)
      queryClient.invalidateQueries({
        queryKey: ['favorites'],
        predicate: (query) =>
          query.queryKey[0] === 'favorites' &&
          query.queryKey.length > 1 &&
          query.queryKey[1] !== 'game-ids' &&
          query.queryKey[1] !== 'stats'
      });
    }
  });
}

/**
 * Hook to add a game to favorites
 * Uses optimistic updates for immediate UI feedback
 */
export function useAddFavorite() {
  const queryClient = useQueryClient();
  const { showToast } = useDialog();

  return useMutation({
    mutationFn: (gameId: string) => favoritesApi.add(gameId),

    onMutate: async (gameId) => {
      await queryClient.cancelQueries({ queryKey: ['favorites', 'game-ids'] });
      const previousIds = queryClient.getQueryData<string[]>(['favorites', 'game-ids']);

      // Add to cache
      queryClient.setQueryData<string[]>(['favorites', 'game-ids'], (old = []) => {
        if (old.includes(gameId)) return old;
        return [...old, gameId];
      });

      // Update stats
      queryClient.setQueryData(['favorites', 'stats'], (old: any) => {
        if (!old) return old;
        return { ...old, totalFavorites: (old.totalFavorites || 0) + 1 };
      });

      return { previousIds };
    },

    onError: (err: any, _gameId, context) => {
      if (context?.previousIds) {
        queryClient.setQueryData(['favorites', 'game-ids'], context.previousIds);
      }
      const message = err?.response?.data?.error?.message || 'Failed to add favorite';
      showToast(message, 'error');
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['favorites'],
        predicate: (query) =>
          query.queryKey[0] === 'favorites' &&
          query.queryKey.length > 1 &&
          query.queryKey[1] !== 'game-ids' &&
          query.queryKey[1] !== 'stats'
      });
    }
  });
}

/**
 * Hook to remove a game from favorites
 * Uses optimistic updates for immediate UI feedback
 */
export function useRemoveFavorite() {
  const queryClient = useQueryClient();
  const { showToast } = useDialog();

  return useMutation({
    mutationFn: (gameId: string) => favoritesApi.remove(gameId),

    onMutate: async (gameId) => {
      await queryClient.cancelQueries({ queryKey: ['favorites', 'game-ids'] });
      const previousIds = queryClient.getQueryData<string[]>(['favorites', 'game-ids']);

      // Remove from cache
      queryClient.setQueryData<string[]>(['favorites', 'game-ids'], (old = []) => {
        return old.filter(id => id !== gameId);
      });

      // Update stats
      queryClient.setQueryData(['favorites', 'stats'], (old: any) => {
        if (!old) return old;
        return { ...old, totalFavorites: Math.max(0, (old.totalFavorites || 0) - 1) };
      });

      return { previousIds };
    },

    onError: (err: any, _gameId, context) => {
      if (context?.previousIds) {
        queryClient.setQueryData(['favorites', 'game-ids'], context.previousIds);
      }
      const message = err?.response?.data?.error?.message || 'Failed to remove favorite';
      showToast(message, 'error');
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['favorites'],
        predicate: (query) =>
          query.queryKey[0] === 'favorites' &&
          query.queryKey.length > 1 &&
          query.queryKey[1] !== 'game-ids' &&
          query.queryKey[1] !== 'stats'
      });
    }
  });
}

/**
 * Hook to batch add favorites
 * Uses optimistic updates for immediate UI feedback
 */
export function useBatchAddFavorites() {
  const queryClient = useQueryClient();
  const { showToast } = useDialog();

  return useMutation({
    mutationFn: (gameIds: string[]) => favoritesApi.batchAdd(gameIds),

    onMutate: async (gameIds) => {
      await queryClient.cancelQueries({ queryKey: ['favorites', 'game-ids'] });
      const previousIds = queryClient.getQueryData<string[]>(['favorites', 'game-ids']);

      // Add all to cache
      queryClient.setQueryData<string[]>(['favorites', 'game-ids'], (old = []) => {
        const newIds = gameIds.filter(id => !old.includes(id));
        return [...old, ...newIds];
      });

      // Update stats
      queryClient.setQueryData(['favorites', 'stats'], (old: any) => {
        if (!old) return old;
        const previousIds = queryClient.getQueryData<string[]>(['favorites', 'game-ids']) || [];
        const newIds = gameIds.filter(id => !previousIds.includes(id));
        return { ...old, totalFavorites: (old.totalFavorites || 0) + newIds.length };
      });

      return { previousIds };
    },

    onError: (err: any, _gameIds, context) => {
      if (context?.previousIds) {
        queryClient.setQueryData(['favorites', 'game-ids'], context.previousIds);
      }
      const message = err?.response?.data?.error?.message || 'Failed to add favorites';
      showToast(message, 'error');
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['favorites'],
        predicate: (query) =>
          query.queryKey[0] === 'favorites' &&
          query.queryKey.length > 1 &&
          query.queryKey[1] !== 'game-ids' &&
          query.queryKey[1] !== 'stats'
      });
    }
  });
}

/**
 * Hook to batch remove favorites
 * Uses optimistic updates for immediate UI feedback
 */
export function useBatchRemoveFavorites() {
  const queryClient = useQueryClient();
  const { showToast } = useDialog();

  return useMutation({
    mutationFn: (gameIds: string[]) => favoritesApi.batchRemove(gameIds),

    onMutate: async (gameIds) => {
      await queryClient.cancelQueries({ queryKey: ['favorites', 'game-ids'] });
      const previousIds = queryClient.getQueryData<string[]>(['favorites', 'game-ids']);

      // Remove all from cache
      queryClient.setQueryData<string[]>(['favorites', 'game-ids'], (old = []) => {
        return old.filter(id => !gameIds.includes(id));
      });

      // Update stats
      queryClient.setQueryData(['favorites', 'stats'], (old: any) => {
        if (!old) return old;
        const removedCount = gameIds.length;
        return { ...old, totalFavorites: Math.max(0, (old.totalFavorites || 0) - removedCount) };
      });

      return { previousIds };
    },

    onError: (err: any, _gameIds, context) => {
      if (context?.previousIds) {
        queryClient.setQueryData(['favorites', 'game-ids'], context.previousIds);
      }
      const message = err?.response?.data?.error?.message || 'Failed to remove favorites';
      showToast(message, 'error');
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['favorites'],
        predicate: (query) =>
          query.queryKey[0] === 'favorites' &&
          query.queryKey.length > 1 &&
          query.queryKey[1] !== 'game-ids' &&
          query.queryKey[1] !== 'stats'
      });
    }
  });
}

/**
 * Hook to clear all favorites
 * Uses optimistic updates for immediate UI feedback
 */
export function useClearAllFavorites() {
  const queryClient = useQueryClient();
  const { showToast } = useDialog();

  return useMutation({
    mutationFn: () => favoritesApi.clearAll(),

    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['favorites', 'game-ids'] });
      const previousIds = queryClient.getQueryData<string[]>(['favorites', 'game-ids']);

      // Clear cache
      queryClient.setQueryData<string[]>(['favorites', 'game-ids'], []);

      // Update stats
      queryClient.setQueryData(['favorites', 'stats'], (old: any) => {
        if (!old) return old;
        return { ...old, totalFavorites: 0 };
      });

      return { previousIds };
    },

    onError: (err: any, _, context) => {
      if (context?.previousIds) {
        queryClient.setQueryData(['favorites', 'game-ids'], context.previousIds);
      }
      const message = err?.response?.data?.error?.message || 'Failed to clear favorites';
      showToast(message, 'error');
    },

    onSuccess: () => {
      // Invalidate all favorites queries
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    }
  });
}
