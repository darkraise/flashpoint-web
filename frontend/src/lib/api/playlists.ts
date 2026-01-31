import { apiClient } from './client';
import type { Playlist } from '@/types/game';

/**
 * Community Playlists API Response
 */
export interface CommunityPlaylistsResponse {
  categories: Array<{
    name: string;
    playlists: Array<{
      name: string;
      author: string;
      description: string;
      downloadUrl: string;
      category: string;
      subcategory?: string;
    }>;
  }>;
  lastFetched: string;
}

/**
 * Flashpoint Playlists API
 *
 * Manages Flashpoint's built-in playlists from the database
 */
export const playlistsApi = {
  /**
   * Get all Flashpoint playlists
   */
  getAll: async (): Promise<Playlist[]> => {
    const { data } = await apiClient.get<Playlist[]>('/playlists');
    return data;
  },

  /**
   * Get playlist by ID
   */
  getById: async (id: string): Promise<Playlist> => {
    const { data } = await apiClient.get<Playlist>(`/playlists/${id}`);
    return data;
  },

  /**
   * Create a new playlist
   */
  create: async (playlist: {
    title: string;
    description?: string;
    author?: string;
    library?: string;
  }): Promise<Playlist> => {
    const { data } = await apiClient.post<Playlist>('/playlists', playlist);
    return data;
  },

  /**
   * Add games to a playlist
   */
  addGames: async (playlistId: string, gameIds: string[]): Promise<Playlist> => {
    const { data } = await apiClient.post<Playlist>(`/playlists/${playlistId}/games`, {
      gameIds,
    });
    return data;
  },

  /**
   * Remove games from a playlist
   */
  removeGames: async (playlistId: string, gameIds: string[]): Promise<Playlist> => {
    const { data } = await apiClient.delete<Playlist>(`/playlists/${playlistId}/games`, {
      data: { gameIds },
    });
    return data;
  },

  /**
   * Delete a playlist
   */
  delete: async (playlistId: string): Promise<{ success: boolean; message: string }> => {
    const { data } = await apiClient.delete(`/playlists/${playlistId}`);
    return data;
  },
};

/**
 * Community Playlists API
 *
 * Manages community-curated playlists from external sources
 */
export const communityPlaylistsApi = {
  /**
   * Fetch all community playlists from external sources
   */
  fetchAll: async (): Promise<CommunityPlaylistsResponse> => {
    const { data } = await apiClient.get<CommunityPlaylistsResponse>('/community-playlists');
    return data;
  },

  /**
   * Download and import a community playlist
   */
  download: async (downloadUrl: string): Promise<Playlist> => {
    const { data } = await apiClient.post<Playlist>('/community-playlists/download', {
      downloadUrl,
    });
    return data;
  },
};
