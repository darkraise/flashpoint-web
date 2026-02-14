import { apiClient } from './client';
import type { Playlist } from '@/types/game';
import type { PaginatedResponse } from '@/types/auth';

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

export const playlistsApi = {
  getAll: async (
    page: number = 1,
    limit: number = 12
  ): Promise<PaginatedResponse<Playlist>> => {
    const { data } = await apiClient.get<PaginatedResponse<Playlist>>('/playlists', {
      params: { page, limit },
    });
    return data;
  },

  getById: async (id: string): Promise<Playlist> => {
    const { data } = await apiClient.get<Playlist>(`/playlists/${id}`);
    return data;
  },

  create: async (playlist: {
    title: string;
    description?: string;
    author?: string;
    library?: string;
  }): Promise<Playlist> => {
    const { data } = await apiClient.post<Playlist>('/playlists', playlist);
    return data;
  },

  addGames: async (playlistId: string, gameIds: string[]): Promise<Playlist> => {
    const { data } = await apiClient.post<Playlist>(`/playlists/${playlistId}/games`, {
      gameIds,
    });
    return data;
  },

  removeGames: async (playlistId: string, gameIds: string[]): Promise<Playlist> => {
    const { data } = await apiClient.delete<Playlist>(`/playlists/${playlistId}/games`, {
      data: { gameIds },
    });
    return data;
  },

  delete: async (playlistId: string): Promise<{ success: boolean; message: string }> => {
    const { data } = await apiClient.delete(`/playlists/${playlistId}`);
    return data;
  },
};

export const communityPlaylistsApi = {
  fetchAll: async (): Promise<CommunityPlaylistsResponse> => {
    const { data } = await apiClient.get<CommunityPlaylistsResponse>('/community-playlists');
    return data;
  },

  download: async (downloadUrl: string): Promise<Playlist> => {
    const { data } = await apiClient.post<Playlist>('/community-playlists/download', {
      downloadUrl,
    });
    return data;
  },
};
