import { apiClient } from './client';
import type { SharedPlaylist, UserPlaylist } from '@/types/playlist';
import type { Game } from '@/types/game';

/**
 * Shared Playlists API
 *
 * Provides anonymous access to publicly shared playlists
 * Independent of guest access settings
 */
export const sharedPlaylistsApi = {
  /**
   * Get shared playlist metadata by share token
   * @param shareToken UUID v4 share token
   */
  getByToken: async (shareToken: string): Promise<SharedPlaylist> => {
    const { data } = await apiClient.get<SharedPlaylist>(
      `/playlists/shared/${shareToken}`
    );
    return data;
  },

  /**
   * Get games in a shared playlist
   * @param shareToken UUID v4 share token
   */
  getGames: async (shareToken: string): Promise<Game[]> => {
    const { data } = await apiClient.get<Game[]>(
      `/playlists/shared/${shareToken}/games`
    );
    return data;
  },

  /**
   * Clone a shared playlist to the authenticated user's account
   * @param shareToken UUID v4 share token
   * @param newTitle Optional custom title for the cloned playlist
   */
  clonePlaylist: async (
    shareToken: string,
    newTitle?: string
  ): Promise<UserPlaylist> => {
    const { data } = await apiClient.post<UserPlaylist>(
      `/playlists/shared/${shareToken}/clone`,
      { newTitle }
    );
    return data;
  },

  /**
   * Validate if a game is accessible via a shared playlist
   * @param shareToken UUID v4 share token
   * @param gameId Game UUID
   * @returns Whether the game is in the shared playlist
   */
  validateGameAccess: async (shareToken: string, gameId: string): Promise<boolean> => {
    try {
      const { data } = await apiClient.get<{ valid: boolean }>(
        `/playlists/shared/${shareToken}/games/${gameId}/validate`
      );
      return data.valid;
    } catch {
      return false;
    }
  },

  /**
   * Generate a temporary shared access token for accessing games in the playlist
   * Token expires in 60 minutes and cannot be refreshed
   * @param shareToken UUID v4 share token
   * @returns Access token, expiry time, and playlist ID
   */
  generateAccessToken: async (shareToken: string): Promise<{
    accessToken: string;
    expiresIn: number;
    playlistId: number;
  }> => {
    const { data } = await apiClient.post(
      `/playlists/shared/${shareToken}/generate-access-token`
    );
    return data;
  },
};
