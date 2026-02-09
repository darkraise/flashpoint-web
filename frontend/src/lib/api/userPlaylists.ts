import { apiClient } from './client';
import type {
  UserPlaylist,
  CreatePlaylistData,
  UpdatePlaylistData,
  PlaylistStats,
  ShareLinkData,
  EnableSharingOptions,
} from '@/types/playlist';
import type { Game } from '@/types/game';

/**
 * Playlist with games array (returned from add/remove operations)
 */
export interface PlaylistWithGames extends UserPlaylist {
  games: Game[];
}

export const userPlaylistsApi = {
  getAll: async (): Promise<UserPlaylist[]> => {
    const { data } = await apiClient.get<UserPlaylist[]>('/user-playlists');
    return data;
  },

  getStats: async (): Promise<PlaylistStats> => {
    const { data } = await apiClient.get<PlaylistStats>('/user-playlists/stats');
    return data;
  },

  getById: async (id: number): Promise<UserPlaylist> => {
    const { data } = await apiClient.get<UserPlaylist>(`/user-playlists/${id}`);
    return data;
  },

  getGames: async (id: number): Promise<Game[]> => {
    const { data } = await apiClient.get<Game[]>(`/user-playlists/${id}/games`);
    return data;
  },

  create: async (playlistData: CreatePlaylistData): Promise<UserPlaylist> => {
    const { data } = await apiClient.post<UserPlaylist>('/user-playlists', playlistData);
    return data;
  },

  update: async (id: number, playlistData: UpdatePlaylistData): Promise<UserPlaylist> => {
    const { data } = await apiClient.patch<UserPlaylist>(`/user-playlists/${id}`, playlistData);
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/user-playlists/${id}`);
  },

  addGames: async (id: number, gameIds: string[]): Promise<PlaylistWithGames> => {
    const { data } = await apiClient.post<PlaylistWithGames>(`/user-playlists/${id}/games`, {
      gameIds,
    });
    return data;
  },

  removeGames: async (id: number, gameIds: string[]): Promise<PlaylistWithGames> => {
    const { data } = await apiClient.delete<PlaylistWithGames>(`/user-playlists/${id}/games`, {
      data: { gameIds },
    });
    return data;
  },

  reorderGames: async (id: number, gameIdOrder: string[]): Promise<void> => {
    await apiClient.put(`/user-playlists/${id}/games/reorder`, { gameIdOrder });
  },

  copyFlashpointPlaylist: async (
    flashpointPlaylistId: string,
    newTitle?: string
  ): Promise<UserPlaylist> => {
    const { data } = await apiClient.post<UserPlaylist>('/user-playlists/copy-flashpoint', {
      flashpointPlaylistId,
      newTitle,
    });
    return data;
  },

  enableSharing: async (id: number, options?: EnableSharingOptions): Promise<ShareLinkData> => {
    const { data } = await apiClient.post<ShareLinkData>(
      `/user-playlists/${id}/share/enable`,
      options
    );
    return data;
  },

  disableSharing: async (id: number): Promise<{ success: boolean }> => {
    const { data } = await apiClient.post<{ success: boolean }>(
      `/user-playlists/${id}/share/disable`
    );
    return data;
  },

  regenerateShareToken: async (id: number): Promise<ShareLinkData> => {
    const { data } = await apiClient.post<ShareLinkData>(`/user-playlists/${id}/share/regenerate`);
    return data;
  },

  updateShareSettings: async (
    id: number,
    options: EnableSharingOptions
  ): Promise<ShareLinkData> => {
    const { data } = await apiClient.patch<ShareLinkData>(
      `/user-playlists/${id}/share/settings`,
      options
    );
    return data;
  },
};
