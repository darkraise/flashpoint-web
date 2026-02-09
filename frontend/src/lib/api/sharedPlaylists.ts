import { apiClient } from './client';
import type { SharedPlaylist, UserPlaylist } from '@/types/playlist';
import type { Game } from '@/types/game';

export const sharedPlaylistsApi = {
  getByToken: async (shareToken: string): Promise<SharedPlaylist> => {
    const { data } = await apiClient.get<SharedPlaylist>(`/playlists/shared/${shareToken}`);
    return data;
  },

  getGames: async (shareToken: string): Promise<Game[]> => {
    const { data } = await apiClient.get<Game[]>(`/playlists/shared/${shareToken}/games`);
    return data;
  },

  clonePlaylist: async (shareToken: string, newTitle?: string): Promise<UserPlaylist> => {
    const { data } = await apiClient.post<UserPlaylist>(`/playlists/shared/${shareToken}/clone`, {
      newTitle,
    });
    return data;
  },

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

  /** Token expires in 60 minutes and cannot be refreshed */
  generateAccessToken: async (
    shareToken: string
  ): Promise<{
    accessToken: string;
    expiresIn: number;
    playlistId: number;
  }> => {
    const { data } = await apiClient.post(`/playlists/shared/${shareToken}/generate-access-token`);
    return data;
  },
};
