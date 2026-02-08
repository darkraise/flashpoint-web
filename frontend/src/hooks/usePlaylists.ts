import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { playlistsApi } from '@/lib/api';

export function usePlaylists() {
  return useQuery({
    queryKey: ['playlists'],
    queryFn: () => playlistsApi.getAll(),
  });
}

export function usePlaylist(id: string) {
  return useQuery({
    queryKey: ['playlist', id],
    queryFn: () => playlistsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreatePlaylist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      title: string;
      description?: string;
      author?: string;
      library?: string;
    }) => playlistsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      queryClient.invalidateQueries({ queryKey: ['statistics'] });
    },
  });
}

export function useAddGamesToPlaylist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ playlistId, gameIds }: { playlistId: string; gameIds: string[] }) =>
      playlistsApi.addGames(playlistId, gameIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      queryClient.invalidateQueries({ queryKey: ['playlist', variables.playlistId] });
      queryClient.invalidateQueries({ queryKey: ['statistics'] });
    },
  });
}

export function useRemoveGamesFromPlaylist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ playlistId, gameIds }: { playlistId: string; gameIds: string[] }) =>
      playlistsApi.removeGames(playlistId, gameIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      queryClient.invalidateQueries({ queryKey: ['playlist', variables.playlistId] });
      queryClient.invalidateQueries({ queryKey: ['statistics'] });
    },
  });
}

export function useDeletePlaylist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (playlistId: string) => playlistsApi.delete(playlistId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      queryClient.invalidateQueries({ queryKey: ['statistics'] });
    },
  });
}

// This is the well-known ID for the system favorites playlist in the Flashpoint database.
// It is used to identify the favorites playlist among regular playlists and filter it from user-created playlists.
export const FAVORITES_PLAYLIST_ID = 'c8f81d60-b134-4309-8985-fd184ec96dfe';

export function useFavoritesPlaylist() {
  return usePlaylist(FAVORITES_PLAYLIST_ID);
}

export function useAddToFavorites() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (gameId: string) => playlistsApi.addGames(FAVORITES_PLAYLIST_ID, [gameId]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      queryClient.invalidateQueries({ queryKey: ['playlist', FAVORITES_PLAYLIST_ID] });
      queryClient.invalidateQueries({ queryKey: ['statistics'] });
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });
}

export function useRemoveFromFavorites() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (gameId: string) => playlistsApi.removeGames(FAVORITES_PLAYLIST_ID, [gameId]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      queryClient.invalidateQueries({ queryKey: ['playlist', FAVORITES_PLAYLIST_ID] });
      queryClient.invalidateQueries({ queryKey: ['statistics'] });
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });
}
