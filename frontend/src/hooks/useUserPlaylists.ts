import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userPlaylistsApi } from '@/lib/api/userPlaylists';
import { sharedPlaylistsApi } from '@/lib/api/sharedPlaylists';
import type { PlaylistWithGames } from '@/lib/api/userPlaylists';
import {
  UpdatePlaylistData,
  UserPlaylist,
  PlaylistStats,
  EnableSharingOptions,
  ShareLinkData,
} from '@/types/playlist';
import { Game } from '@/types/game';
import { useFeatureFlags } from './useFeatureFlags';
import { useDialog } from '@/contexts/DialogContext';
import { getErrorMessage } from '@/types/api-error';

/**
 * Hook to fetch all user playlists
 */
export function useUserPlaylists(enabled = true) {
  const { enablePlaylists } = useFeatureFlags();

  return useQuery({
    queryKey: ['user-playlists'],
    queryFn: () => userPlaylistsApi.getAll(),
    enabled: enablePlaylists && enabled,
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
    mutationFn: userPlaylistsApi.create,
    onSuccess: (newPlaylist) => {
      queryClient.setQueryData<UserPlaylist[]>(['user-playlists'], (old = []) => {
        return [newPlaylist, ...old];
      });
      showToast('Playlist created successfully', 'success');
    },
    onError: (error: unknown) => {
      showToast(getErrorMessage(error), 'error');
    },
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
    onSuccess: (updated) => {
      // Update the playlists list cache
      queryClient.setQueryData<UserPlaylist[]>(['user-playlists'], (old = []) => {
        return old.map((playlist) => (playlist.id === updated.id ? updated : playlist));
      });

      // Update the single playlist detail cache
      queryClient.setQueryData(['user-playlist', updated.id], updated);

      showToast('Playlist updated successfully', 'success');
    },
    onError: (error: unknown) => {
      showToast(getErrorMessage(error), 'error');
    },
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
    mutationFn: userPlaylistsApi.delete,
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData<UserPlaylist[]>(['user-playlists'], (old = []) => {
        return old.filter((playlist) => playlist.id !== deletedId);
      });
      showToast('Playlist deleted successfully', 'success');
    },
    onError: (error: unknown) => {
      showToast(getErrorMessage(error), 'error');
    },
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
    enabled: enablePlaylists,
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
    enabled: enablePlaylists && id !== null && id !== undefined,
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
    enabled: enablePlaylists && id !== null && id !== undefined,
  });
}

/**
 * Hook to add games to a user playlist
 * Uses optimistic updates for immediate UI feedback
 */
export function useAddGamesToUserPlaylist() {
  const queryClient = useQueryClient();
  const { showToast } = useDialog();

  return useMutation<
    PlaylistWithGames,
    unknown,
    { id: number; gameIds: string[] },
    { previousPlaylist: unknown; previousGames: unknown; previousPlaylists: unknown }
  >({
    mutationFn: ({ id, gameIds }: { id: number; gameIds: string[] }) =>
      userPlaylistsApi.addGames(id, gameIds),

    onMutate: async ({ id }) => {
      // Cancel outgoing refetches to prevent race conditions
      await queryClient.cancelQueries({ queryKey: ['user-playlist', id] });
      await queryClient.cancelQueries({ queryKey: ['user-playlist', id, 'games'] });
      await queryClient.cancelQueries({ queryKey: ['user-playlists'] });

      // Snapshot previous values for rollback
      const previousPlaylist = queryClient.getQueryData(['user-playlist', id]);
      const previousGames = queryClient.getQueryData(['user-playlist', id, 'games']);
      const previousPlaylists = queryClient.getQueryData(['user-playlists']);

      return { previousPlaylist, previousGames, previousPlaylists };
    },

    onSuccess: (response, variables) => {
      // Update single playlist cache with new gameCount
      queryClient.setQueryData(['user-playlist', variables.id], {
        id: response.id,
        userId: response.userId,
        title: response.title,
        description: response.description,
        icon: response.icon,
        createdAt: response.createdAt,
        updatedAt: response.updatedAt,
        isPublic: response.isPublic,
        gameCount: response.gameCount, // Updated count from backend
      });

      // Update games list cache
      queryClient.setQueryData(['user-playlist', variables.id, 'games'], response.games);

      // Update playlists list cache
      queryClient.setQueryData<UserPlaylist[]>(['user-playlists'], (old = []) => {
        return old.map((playlist) =>
          playlist.id === variables.id ? { ...playlist, gameCount: response.gameCount } : playlist
        );
      });

      showToast('Games added to playlist', 'success');
    },

    onError: (err: unknown, variables, context) => {
      // Rollback all caches on error
      if (context?.previousPlaylist) {
        queryClient.setQueryData(['user-playlist', variables.id], context.previousPlaylist);
      }
      if (context?.previousGames) {
        queryClient.setQueryData(['user-playlist', variables.id, 'games'], context.previousGames);
      }
      if (context?.previousPlaylists) {
        queryClient.setQueryData(['user-playlists'], context.previousPlaylists);
      }

      const message = getErrorMessage(err) || 'Failed to add games to playlist';
      showToast(message, 'error');
    },
  });
}

/**
 * Hook to remove games from a user playlist
 * Uses optimistic updates for immediate UI feedback
 */
export function useRemoveGamesFromUserPlaylist() {
  const queryClient = useQueryClient();
  const { showToast } = useDialog();

  return useMutation<
    PlaylistWithGames,
    unknown,
    { id: number; gameIds: string[] },
    { previousPlaylist: unknown; previousGames: unknown; previousPlaylists: unknown }
  >({
    mutationFn: ({ id, gameIds }: { id: number; gameIds: string[] }) =>
      userPlaylistsApi.removeGames(id, gameIds),

    onMutate: async ({ id, gameIds }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['user-playlist', id] });
      await queryClient.cancelQueries({ queryKey: ['user-playlist', id, 'games'] });
      await queryClient.cancelQueries({ queryKey: ['user-playlists'] });

      // Snapshot previous values for rollback
      const previousPlaylist = queryClient.getQueryData(['user-playlist', id]);
      const previousGames = queryClient.getQueryData<Game[]>(['user-playlist', id, 'games']);
      const previousPlaylists = queryClient.getQueryData(['user-playlists']);

      // Optimistically remove games from cache for immediate feedback
      if (previousGames) {
        queryClient.setQueryData<Game[]>(
          ['user-playlist', id, 'games'],
          previousGames.filter((game) => !gameIds.includes(game.id))
        );
      }

      return { previousPlaylist, previousGames, previousPlaylists };
    },

    onSuccess: (response, variables) => {
      // Update single playlist cache with new gameCount
      queryClient.setQueryData(['user-playlist', variables.id], {
        id: response.id,
        userId: response.userId,
        title: response.title,
        description: response.description,
        icon: response.icon,
        createdAt: response.createdAt,
        updatedAt: response.updatedAt,
        isPublic: response.isPublic,
        gameCount: response.gameCount, // Updated count from backend
      });

      // Update games list cache with authoritative backend response
      queryClient.setQueryData(['user-playlist', variables.id, 'games'], response.games);

      // Update playlists list cache
      queryClient.setQueryData<UserPlaylist[]>(['user-playlists'], (old = []) => {
        return old.map((playlist) =>
          playlist.id === variables.id ? { ...playlist, gameCount: response.gameCount } : playlist
        );
      });

      showToast('Games removed from playlist', 'success');
    },

    onError: (err: unknown, variables, context) => {
      // Rollback all caches on error
      if (context?.previousPlaylist) {
        queryClient.setQueryData(['user-playlist', variables.id], context.previousPlaylist);
      }
      if (context?.previousGames) {
        queryClient.setQueryData(['user-playlist', variables.id, 'games'], context.previousGames);
      }
      if (context?.previousPlaylists) {
        queryClient.setQueryData(['user-playlists'], context.previousPlaylists);
      }

      const message = getErrorMessage(err) || 'Failed to remove games from playlist';
      showToast(message, 'error');
    },
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
      const previousGames = queryClient.getQueryData<Game[]>(['user-playlist', id, 'games']);

      // Optimistically reorder
      if (previousGames) {
        const reordered = gameIdOrder
          .map((gameId) => previousGames.find((g) => g.id === gameId))
          .filter((g): g is Game => g !== undefined);
        queryClient.setQueryData<Game[]>(['user-playlist', id, 'games'], reordered);
      }

      return { previousGames };
    },

    onError: (err: unknown, variables, context) => {
      if (context?.previousGames) {
        queryClient.setQueryData(['user-playlist', variables.id, 'games'], context.previousGames);
      }
      const message = getErrorMessage(err) || 'Failed to reorder games';
      showToast(message, 'error');
    },

    onSuccess: (_, variables) => {
      // Invalidate queries to refetch updated data
      queryClient.invalidateQueries({ queryKey: ['user-playlist', variables.id] });
      queryClient.invalidateQueries({
        queryKey: ['user-playlist', variables.id, 'games'],
      });
      showToast('Games reordered successfully', 'success');
    },
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
    mutationFn: ({
      flashpointPlaylistId,
      newTitle,
    }: {
      flashpointPlaylistId: string;
      newTitle?: string;
    }) => userPlaylistsApi.copyFlashpointPlaylist(flashpointPlaylistId, newTitle),

    onSuccess: (newPlaylist) => {
      // Add to list cache
      queryClient.setQueryData<UserPlaylist[]>(['user-playlists'], (old = []) => {
        return [newPlaylist, ...old];
      });

      // Add to single-item cache
      queryClient.setQueryData(['user-playlist', newPlaylist.id], newPlaylist);

      // Update stats
      queryClient.setQueryData<PlaylistStats>(['user-playlists', 'stats'], (old) => {
        if (!old) return old;
        return { ...old, totalPlaylists: (old.totalPlaylists || 0) + 1 };
      });

      showToast('Playlist copied successfully', 'success');
    },

    onError: (err: unknown) => {
      const message = getErrorMessage(err) || 'Failed to copy playlist';
      showToast(message, 'error');
    },
  });
}

/**
 * Hook to enable sharing for a user playlist
 */
export function useEnableSharing() {
  const queryClient = useQueryClient();
  const { showToast } = useDialog();

  return useMutation<ShareLinkData, unknown, { id: number; options?: EnableSharingOptions }>({
    mutationFn: ({ id, options }) => userPlaylistsApi.enableSharing(id, options),

    onSuccess: (_, variables) => {
      // Invalidate playlist queries to refetch updated data
      queryClient.invalidateQueries({ queryKey: ['user-playlists'] });
      queryClient.invalidateQueries({ queryKey: ['user-playlist', variables.id] });

      showToast('Sharing enabled', 'success');
    },

    onError: (err: unknown) => {
      const message = getErrorMessage(err) || 'Failed to enable sharing';
      showToast(message, 'error');
    },
  });
}

/**
 * Hook to disable sharing for a user playlist
 */
export function useDisableSharing() {
  const queryClient = useQueryClient();
  const { showToast } = useDialog();

  return useMutation<{ success: boolean }, unknown, number>({
    mutationFn: (id: number) => userPlaylistsApi.disableSharing(id),

    onSuccess: (_, id) => {
      // Invalidate playlist queries
      queryClient.invalidateQueries({ queryKey: ['user-playlists'] });
      queryClient.invalidateQueries({ queryKey: ['user-playlist', id] });

      showToast('Sharing disabled', 'success');
    },

    onError: (err: unknown) => {
      const message = getErrorMessage(err) || 'Failed to disable sharing';
      showToast(message, 'error');
    },
  });
}

/**
 * Hook to regenerate share token (invalidates old links)
 */
export function useRegenerateShareToken() {
  const queryClient = useQueryClient();
  const { showToast } = useDialog();

  return useMutation<ShareLinkData, unknown, number>({
    mutationFn: (id: number) => userPlaylistsApi.regenerateShareToken(id),

    onSuccess: (_, id) => {
      // Invalidate playlist queries
      queryClient.invalidateQueries({ queryKey: ['user-playlists'] });
      queryClient.invalidateQueries({ queryKey: ['user-playlist', id] });

      showToast('Share link regenerated', 'success');
    },

    onError: (err: unknown) => {
      const message = getErrorMessage(err) || 'Failed to regenerate link';
      showToast(message, 'error');
    },
  });
}

/**
 * Hook to clone a shared playlist to the authenticated user's account
 */
export function useCloneSharedPlaylist() {
  const queryClient = useQueryClient();
  const { showToast } = useDialog();

  return useMutation<UserPlaylist, unknown, { shareToken: string; newTitle?: string }>({
    mutationFn: ({ shareToken, newTitle }) =>
      sharedPlaylistsApi.clonePlaylist(shareToken, newTitle),

    onSuccess: (newPlaylist) => {
      // Add to list cache
      queryClient.setQueryData<UserPlaylist[]>(['user-playlists'], (old = []) => {
        return [newPlaylist, ...old];
      });

      // Add to single-item cache
      queryClient.setQueryData(['user-playlist', newPlaylist.id], newPlaylist);

      // Update stats
      queryClient.setQueryData<PlaylistStats>(['user-playlists', 'stats'], (old) => {
        if (!old) return old;
        return { ...old, totalPlaylists: (old.totalPlaylists || 0) + 1 };
      });

      showToast('Playlist cloned successfully', 'success');
    },

    onError: (err: unknown) => {
      const message = getErrorMessage(err) || 'Failed to clone playlist';
      showToast(message, 'error');
    },
  });
}
