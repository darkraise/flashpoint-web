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

export function useUserPlaylists(enabled = true) {
  const { enablePlaylists } = useFeatureFlags();

  return useQuery({
    queryKey: ['user-playlists'],
    queryFn: () => userPlaylistsApi.getAll(),
    enabled: enablePlaylists && enabled,
  });
}

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

export function useUpdateUserPlaylist() {
  const queryClient = useQueryClient();
  const { showToast } = useDialog();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdatePlaylistData }) =>
      userPlaylistsApi.update(id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData<UserPlaylist[]>(['user-playlists'], (old = []) => {
        return old.map((playlist) => (playlist.id === updated.id ? updated : playlist));
      });

      queryClient.setQueryData(['user-playlist', updated.id], updated);

      showToast('Playlist updated successfully', 'success');
    },
    onError: (error: unknown) => {
      showToast(getErrorMessage(error), 'error');
    },
  });
}

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

export function useUserPlaylistStats() {
  const { enablePlaylists } = useFeatureFlags();

  return useQuery({
    queryKey: ['user-playlists', 'stats'],
    queryFn: () => userPlaylistsApi.getStats(),
    enabled: enablePlaylists,
  });
}

export function useUserPlaylist(id: number | null) {
  const { enablePlaylists } = useFeatureFlags();

  return useQuery({
    queryKey: ['user-playlist', id],
    queryFn: () => userPlaylistsApi.getById(id!),
    enabled: enablePlaylists && id !== null && id !== undefined,
  });
}

export function useUserPlaylistGames(id: number | null) {
  const { enablePlaylists } = useFeatureFlags();

  return useQuery({
    queryKey: ['user-playlist', id, 'games'],
    queryFn: () => userPlaylistsApi.getGames(id!),
    enabled: enablePlaylists && id !== null && id !== undefined,
  });
}

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
      await queryClient.cancelQueries({ queryKey: ['user-playlist', id] });
      await queryClient.cancelQueries({ queryKey: ['user-playlist', id, 'games'] });
      await queryClient.cancelQueries({ queryKey: ['user-playlists'] });

      const previousPlaylist = queryClient.getQueryData(['user-playlist', id]);
      const previousGames = queryClient.getQueryData(['user-playlist', id, 'games']);
      const previousPlaylists = queryClient.getQueryData(['user-playlists']);

      return { previousPlaylist, previousGames, previousPlaylists };
    },

    onSuccess: (response, variables) => {
      queryClient.setQueryData(['user-playlist', variables.id], {
        id: response.id,
        userId: response.userId,
        title: response.title,
        description: response.description,
        icon: response.icon,
        createdAt: response.createdAt,
        updatedAt: response.updatedAt,
        isPublic: response.isPublic,
        gameCount: response.gameCount,
      });

      queryClient.setQueryData(['user-playlist', variables.id, 'games'], response.games);

      queryClient.setQueryData<UserPlaylist[]>(['user-playlists'], (old = []) => {
        return old.map((playlist) =>
          playlist.id === variables.id ? { ...playlist, gameCount: response.gameCount } : playlist
        );
      });

      showToast('Games added to playlist', 'success');
    },

    onError: (err: unknown, variables, context) => {
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
      await queryClient.cancelQueries({ queryKey: ['user-playlist', id] });
      await queryClient.cancelQueries({ queryKey: ['user-playlist', id, 'games'] });
      await queryClient.cancelQueries({ queryKey: ['user-playlists'] });

      const previousPlaylist = queryClient.getQueryData(['user-playlist', id]);
      const previousGames = queryClient.getQueryData<Game[]>(['user-playlist', id, 'games']);
      const previousPlaylists = queryClient.getQueryData(['user-playlists']);

      if (previousGames) {
        queryClient.setQueryData<Game[]>(
          ['user-playlist', id, 'games'],
          previousGames.filter((game) => !gameIds.includes(game.id))
        );
      }

      return { previousPlaylist, previousGames, previousPlaylists };
    },

    onSuccess: (response, variables) => {
      queryClient.setQueryData(['user-playlist', variables.id], {
        id: response.id,
        userId: response.userId,
        title: response.title,
        description: response.description,
        icon: response.icon,
        createdAt: response.createdAt,
        updatedAt: response.updatedAt,
        isPublic: response.isPublic,
        gameCount: response.gameCount,
      });

      queryClient.setQueryData(['user-playlist', variables.id, 'games'], response.games);

      queryClient.setQueryData<UserPlaylist[]>(['user-playlists'], (old = []) => {
        return old.map((playlist) =>
          playlist.id === variables.id ? { ...playlist, gameCount: response.gameCount } : playlist
        );
      });

      showToast('Games removed from playlist', 'success');
    },

    onError: (err: unknown, variables, context) => {
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

export function useReorderUserPlaylistGames() {
  const queryClient = useQueryClient();
  const { showToast } = useDialog();

  return useMutation({
    mutationFn: ({ id, gameIdOrder }: { id: number; gameIdOrder: string[] }) =>
      userPlaylistsApi.reorderGames(id, gameIdOrder),

    onMutate: async ({ id, gameIdOrder }) => {
      await queryClient.cancelQueries({ queryKey: ['user-playlist', id, 'games'] });
      const previousGames = queryClient.getQueryData<Game[]>(['user-playlist', id, 'games']);

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
      queryClient.invalidateQueries({ queryKey: ['user-playlist', variables.id] });
      queryClient.invalidateQueries({
        queryKey: ['user-playlist', variables.id, 'games'],
      });
      showToast('Games reordered successfully', 'success');
    },
  });
}

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
      queryClient.setQueryData<UserPlaylist[]>(['user-playlists'], (old = []) => {
        return [newPlaylist, ...old];
      });
      queryClient.setQueryData(['user-playlist', newPlaylist.id], newPlaylist);
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

export function useEnableSharing() {
  const queryClient = useQueryClient();
  const { showToast } = useDialog();

  return useMutation<ShareLinkData, unknown, { id: number; options?: EnableSharingOptions }>({
    mutationFn: ({ id, options }) => userPlaylistsApi.enableSharing(id, options),

    onSuccess: (_, variables) => {
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

export function useDisableSharing() {
  const queryClient = useQueryClient();
  const { showToast } = useDialog();

  return useMutation<{ success: boolean }, unknown, number>({
    mutationFn: (id: number) => userPlaylistsApi.disableSharing(id),

    onSuccess: (_, id) => {
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

export function useRegenerateShareToken() {
  const queryClient = useQueryClient();
  const { showToast } = useDialog();

  return useMutation<ShareLinkData, unknown, number>({
    mutationFn: (id: number) => userPlaylistsApi.regenerateShareToken(id),

    onSuccess: (_, id) => {
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

export function useCloneSharedPlaylist() {
  const queryClient = useQueryClient();
  const { showToast } = useDialog();

  return useMutation<UserPlaylist, unknown, { shareToken: string; newTitle?: string }>({
    mutationFn: ({ shareToken, newTitle }) =>
      sharedPlaylistsApi.clonePlaylist(shareToken, newTitle),

    onSuccess: (newPlaylist) => {
      queryClient.setQueryData<UserPlaylist[]>(['user-playlists'], (old = []) => {
        return [newPlaylist, ...old];
      });
      queryClient.setQueryData(['user-playlist', newPlaylist.id], newPlaylist);
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
