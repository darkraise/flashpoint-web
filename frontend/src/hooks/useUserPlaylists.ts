import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userPlaylistsApi } from '@/lib/api';
import { CreatePlaylistData, UpdatePlaylistData } from '@/types/playlist';
import { useFeatureFlags } from './useFeatureFlags';
import { useDialog } from '@/contexts/DialogContext';

/**
 * Hook to fetch all user playlists
 */
export function useUserPlaylists(enabled: boolean = true) {
  const { enablePlaylists } = useFeatureFlags();

  return useQuery({
    queryKey: ['user-playlists'],
    queryFn: () => userPlaylistsApi.getAll(),
    enabled: enablePlaylists && enabled
  });
}

/**
 * Hook to fetch user playlist statistics
 */
export function useUserPlaylistStats() {
  const { enablePlaylists } = useFeatureFlags();

  return useQuery({
    queryKey: ['user-playlists', 'stats'],
    queryFn: () => userPlaylistsApi.getStats(),
    enabled: enablePlaylists
  });
}

/**
 * Hook to fetch a specific user playlist by ID
 */
export function useUserPlaylist(id: number | null) {
  const { enablePlaylists } = useFeatureFlags();

  return useQuery({
    queryKey: ['user-playlist', id],
    queryFn: () => userPlaylistsApi.getById(id!),
    enabled: enablePlaylists && id !== null && id !== undefined
  });
}

/**
 * Hook to fetch games in a user playlist
 */
export function useUserPlaylistGames(id: number | null) {
  const { enablePlaylists } = useFeatureFlags();

  return useQuery({
    queryKey: ['user-playlist', id, 'games'],
    queryFn: () => userPlaylistsApi.getGames(id!),
    enabled: enablePlaylists && id !== null && id !== undefined
  });
}

/**
 * Hook to create a new user playlist
 * Uses optimistic updates for immediate UI feedback
 */
export function useCreateUserPlaylist() {
  const queryClient = useQueryClient();
  const { showToast } = useDialog();

  return useMutation({
    mutationFn: (data: CreatePlaylistData) => userPlaylistsApi.create(data),

    onSuccess: (newPlaylist) => {
      // Add to list cache
      queryClient.setQueryData<any[]>(['user-playlists'], (old = []) => {
        return [newPlaylist, ...old];
      });

      // Add to single-item cache
      queryClient.setQueryData(['user-playlist', newPlaylist.id], newPlaylist);

      // Update stats
      queryClient.setQueryData(['user-playlists', 'stats'], (old: any) => {
        if (!old) return old;
        return { ...old, totalPlaylists: (old.totalPlaylists || 0) + 1 };
      });

      showToast('Playlist created successfully', 'success');
    },

    onError: (err: any) => {
      const message = err?.response?.data?.error?.message || 'Failed to create playlist';
      showToast(message, 'error');
    }
  });
}

/**
 * Hook to update a user playlist
 * Uses optimistic updates for immediate UI feedback
 */
export function useUpdateUserPlaylist() {
  const queryClient = useQueryClient();
  const { showToast } = useDialog();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdatePlaylistData }) =>
      userPlaylistsApi.update(id, data),

    onSuccess: (updatedPlaylist) => {
      // Update single-item cache
      queryClient.setQueryData(['user-playlist', updatedPlaylist.id], updatedPlaylist);

      // Update in list cache
      queryClient.setQueryData<any[]>(['user-playlists'], (old = []) => {
        return old.map(playlist =>
          playlist.id === updatedPlaylist.id ? updatedPlaylist : playlist
        );
      });

      showToast('Playlist updated successfully', 'success');
    },

    onError: (err: any) => {
      const message = err?.response?.data?.error?.message || 'Failed to update playlist';
      showToast(message, 'error');
    }
  });
}

/**
 * Hook to delete a user playlist
 * Uses optimistic updates for immediate UI feedback
 */
export function useDeleteUserPlaylist() {
  const queryClient = useQueryClient();
  const { showToast } = useDialog();

  return useMutation({
    mutationFn: (id: number) => userPlaylistsApi.delete(id),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['user-playlists'] });
      const previousPlaylists = queryClient.getQueryData<any[]>(['user-playlists']);

      // Remove from cache
      queryClient.setQueryData<any[]>(['user-playlists'], (old = []) => {
        return old.filter(playlist => playlist.id !== id);
      });

      // Update stats
      queryClient.setQueryData(['user-playlists', 'stats'], (old: any) => {
        if (!old) return old;
        return { ...old, totalPlaylists: Math.max(0, (old.totalPlaylists || 0) - 1) };
      });

      return { previousPlaylists };
    },

    onError: (err: any, id, context) => {
      if (context?.previousPlaylists) {
        queryClient.setQueryData(['user-playlists'], context.previousPlaylists);
      }
      const message = err?.response?.data?.error?.message || 'Failed to delete playlist';
      showToast(message, 'error');
    },

    onSuccess: (_, id) => {
      // Remove single-item cache
      queryClient.removeQueries({ queryKey: ['user-playlist', id] });
      queryClient.removeQueries({ queryKey: ['user-playlist', id, 'games'] });
      showToast('Playlist deleted successfully', 'success');
    }
  });
}

/**
 * Hook to add games to a user playlist
 * Uses optimistic updates for immediate UI feedback
 */
export function useAddGamesToUserPlaylist() {
  const queryClient = useQueryClient();
  const { showToast } = useDialog();

  return useMutation({
    mutationFn: ({ id, gameIds }: { id: number; gameIds: string[] }) =>
      userPlaylistsApi.addGames(id, gameIds),

    onMutate: async ({ id, gameIds }) => {
      await queryClient.cancelQueries({ queryKey: ['user-playlist', id, 'games'] });
      const previousGames = queryClient.getQueryData(['user-playlist', id, 'games']);

      // Optimistically add games (will be verified when backend returns updated playlist)
      return { previousGames };
    },

    onError: (err: any, variables, context) => {
      if (context?.previousGames) {
        queryClient.setQueryData(['user-playlist', variables.id, 'games'], context.previousGames);
      }
      const message = err?.response?.data?.error?.message || 'Failed to add games to playlist';
      showToast(message, 'error');
    },

    onSuccess: (_, variables) => {
      // Invalidate queries to refetch updated data
      queryClient.invalidateQueries({ queryKey: ['user-playlist', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['user-playlist', variables.id, 'games'] });
      showToast('Games added to playlist', 'success');
    }
  });
}

/**
 * Hook to remove games from a user playlist
 * Uses optimistic updates for immediate UI feedback
 */
export function useRemoveGamesFromUserPlaylist() {
  const queryClient = useQueryClient();
  const { showToast } = useDialog();

  return useMutation({
    mutationFn: ({ id, gameIds }: { id: number; gameIds: string[] }) =>
      userPlaylistsApi.removeGames(id, gameIds),

    onMutate: async ({ id, gameIds }) => {
      await queryClient.cancelQueries({ queryKey: ['user-playlist', id, 'games'] });
      const previousGames = queryClient.getQueryData(['user-playlist', id, 'games']);

      // Optimistically remove games
      queryClient.setQueryData<any[]>(['user-playlist', id, 'games'], (old = []) => {
        return old.filter((game: any) => !gameIds.includes(game.id));
      });

      return { previousGames };
    },

    onError: (err: any, variables, context) => {
      if (context?.previousGames) {
        queryClient.setQueryData(['user-playlist', variables.id, 'games'], context.previousGames);
      }
      const message = err?.response?.data?.error?.message || 'Failed to remove games from playlist';
      showToast(message, 'error');
    },

    onSuccess: (_, variables) => {
      // Invalidate queries to refetch updated data
      queryClient.invalidateQueries({ queryKey: ['user-playlist', variables.id] });
      showToast('Games removed from playlist', 'success');
    }
  });
}

/**
 * Hook to reorder games in a user playlist
 * Uses optimistic updates for immediate UI feedback
 */
export function useReorderUserPlaylistGames() {
  const queryClient = useQueryClient();
  const { showToast } = useDialog();

  return useMutation({
    mutationFn: ({ id, gameIdOrder }: { id: number; gameIdOrder: string[] }) =>
      userPlaylistsApi.reorderGames(id, gameIdOrder),

    onMutate: async ({ id, gameIdOrder }) => {
      await queryClient.cancelQueries({ queryKey: ['user-playlist', id, 'games'] });
      const previousGames = queryClient.getQueryData<any[]>(['user-playlist', id, 'games']);

      // Optimistically reorder
      if (previousGames) {
        const reordered = gameIdOrder.map(gameId =>
          previousGames.find((g: any) => g.id === gameId)
        ).filter(Boolean);
        queryClient.setQueryData(['user-playlist', id, 'games'], reordered);
      }

      return { previousGames };
    },

    onError: (err: any, variables, context) => {
      if (context?.previousGames) {
        queryClient.setQueryData(['user-playlist', variables.id, 'games'], context.previousGames);
      }
      const message = err?.response?.data?.error?.message || 'Failed to reorder games';
      showToast(message, 'error');
    },

    onSuccess: (_, variables) => {
      // Invalidate queries to refetch updated data
      queryClient.invalidateQueries({ queryKey: ['user-playlist', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['user-playlist', variables.id, 'games'] });
      showToast('Games reordered successfully', 'success');
    }
  });
}

/**
 * Hook to copy a Flashpoint playlist to user playlists
 * Uses cache updates for immediate UI feedback
 */
export function useCopyFlashpointPlaylist() {
  const queryClient = useQueryClient();
  const { showToast } = useDialog();

  return useMutation({
    mutationFn: ({ flashpointPlaylistId, newTitle }: { flashpointPlaylistId: string; newTitle?: string }) =>
      userPlaylistsApi.copyFlashpointPlaylist(flashpointPlaylistId, newTitle),

    onSuccess: (newPlaylist) => {
      // Add to list cache
      queryClient.setQueryData<any[]>(['user-playlists'], (old = []) => {
        return [newPlaylist, ...old];
      });

      // Add to single-item cache
      queryClient.setQueryData(['user-playlist', newPlaylist.id], newPlaylist);

      // Update stats
      queryClient.setQueryData(['user-playlists', 'stats'], (old: any) => {
        if (!old) return old;
        return { ...old, totalPlaylists: (old.totalPlaylists || 0) + 1 };
      });

      showToast('Playlist copied successfully', 'success');
    },

    onError: (err: any) => {
      const message = err?.response?.data?.error?.message || 'Failed to copy playlist';
      showToast(message, 'error');
    }
  });
}
