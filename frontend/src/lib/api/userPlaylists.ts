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

/**
 * User Playlists API
 *
 * Manages user-created custom playlists
 */
export const userPlaylistsApi = {
  /**
   * Get all user playlists
   */
  getAll: async (): Promise<UserPlaylist[]> => {
    const { data } = await apiClient.get<UserPlaylist[]>('/user-playlists');
    return data;
  },

  /**
   * Get user playlist statistics
   */
  getStats: async (): Promise<PlaylistStats> => {
    const { data } = await apiClient.get<PlaylistStats>('/user-playlists/stats');
    return data;
  },

  /**
   * Get playlist by ID
   */
  getById: async (id: number): Promise<UserPlaylist> => {
    const { data } = await apiClient.get<UserPlaylist>(`/user-playlists/${id}`);
    return data;
  },

  /**
   * Get games in a playlist
   */
  getGames: async (id: number): Promise<Game[]> => {
    const { data } = await apiClient.get<Game[]>(`/user-playlists/${id}/games`);
    return data;
  },

  /**
   * Create a new playlist
   */
  create: async (playlistData: CreatePlaylistData): Promise<UserPlaylist> => {
    const { data } = await apiClient.post<UserPlaylist>('/user-playlists', playlistData);
    return data;
  },

  /**
   * Update playlist information
   */
  update: async (id: number, playlistData: UpdatePlaylistData): Promise<UserPlaylist> => {
    const { data } = await apiClient.patch<UserPlaylist>(`/user-playlists/${id}`, playlistData);
    return data;
  },

  /**
   * Delete a playlist
   */
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/user-playlists/${id}`);
  },

  /**
   * Add games to a playlist
   */
  addGames: async (id: number, gameIds: string[]): Promise<PlaylistWithGames> => {
    const { data } = await apiClient.post<PlaylistWithGames>(`/user-playlists/${id}/games`, {
      gameIds,
    });
    return data;
  },

  /**
   * Remove games from a playlist
   */
  removeGames: async (id: number, gameIds: string[]): Promise<PlaylistWithGames> => {
    const { data } = await apiClient.delete<PlaylistWithGames>(`/user-playlists/${id}/games`, {
      data: { gameIds },
    });
    return data;
  },

  /**
   * Reorder games in a playlist
   */
  reorderGames: async (id: number, gameIdOrder: string[]): Promise<void> => {
    await apiClient.put(`/user-playlists/${id}/games/reorder`, { gameIdOrder });
  },

  /**
   * Copy a Flashpoint playlist to user playlists
   */
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

  /**
   * Enable sharing for a playlist
   */
  enableSharing: async (id: number, options?: EnableSharingOptions): Promise<ShareLinkData> => {
    const { data } = await apiClient.post<ShareLinkData>(
      `/user-playlists/${id}/share/enable`,
      options
    );
    return data;
  },

  /**
   * Disable sharing for a playlist
   */
  disableSharing: async (id: number): Promise<{ success: boolean }> => {
    const { data } = await apiClient.post<{ success: boolean }>(
      `/user-playlists/${id}/share/disable`
    );
    return data;
  },

  /**
   * Regenerate share token (invalidates old links)
   */
  regenerateShareToken: async (id: number): Promise<ShareLinkData> => {
    const { data } = await apiClient.post<ShareLinkData>(`/user-playlists/${id}/share/regenerate`);
    return data;
  },

  /**
   * Update share settings (expiry, show_owner) without regenerating token
   */
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
