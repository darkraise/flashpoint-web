import { apiClient } from './client';
import type { PaginatedResponse } from '@/types/auth';
import type {
  Favorite,
  FavoriteGame,
  FavoriteGameIdsResponse,
  FavoritesStats,
  ToggleFavoriteResponse,
  AddFavoriteResponse,
  BatchAddFavoritesResponse,
  BatchRemoveFavoritesResponse,
  ClearAllFavoritesResponse,
} from '@/types/favorite';

export const favoritesApi = {
  getAll: async (limit?: number, offset?: number): Promise<Favorite[]> => {
    const { data } = await apiClient.get<Favorite[]>('/favorites', {
      params: { limit, offset },
    });
    return data;
  },

  getGameIds: async (): Promise<string[]> => {
    const { data } = await apiClient.get<FavoriteGameIdsResponse>('/favorites/game-ids');
    return data.gameIds;
  },

  getGames: async (
    page: number = 1,
    limit: number = 24,
    sortBy?: 'title' | 'dateAdded',
    sortOrder?: 'asc' | 'desc'
  ): Promise<PaginatedResponse<FavoriteGame>> => {
    const { data } = await apiClient.get<PaginatedResponse<FavoriteGame>>('/favorites/games', {
      params: { page, limit, sortBy, sortOrder },
    });
    return data;
  },

  getStats: async (): Promise<FavoritesStats> => {
    const { data } = await apiClient.get<FavoritesStats>('/favorites/stats');
    return data;
  },

  toggle: async (gameId: string): Promise<boolean> => {
    const { data } = await apiClient.post<ToggleFavoriteResponse>('/favorites/toggle', {
      gameId,
    });
    return data.isFavorited;
  },

  add: async (gameId: string): Promise<boolean> => {
    const { data } = await apiClient.post<AddFavoriteResponse>('/favorites', { gameId });
    return data.success;
  },

  remove: async (gameId: string): Promise<void> => {
    await apiClient.delete(`/favorites/${gameId}`);
  },

  batchAdd: async (gameIds: string[]): Promise<number> => {
    const { data } = await apiClient.post<BatchAddFavoritesResponse>('/favorites/batch', {
      gameIds,
    });
    return data.added;
  },

  batchRemove: async (gameIds: string[]): Promise<number> => {
    const { data } = await apiClient.delete<BatchRemoveFavoritesResponse>('/favorites/batch', {
      data: { gameIds },
    });
    return data.removed;
  },

  clearAll: async (): Promise<number> => {
    const { data } = await apiClient.delete<ClearAllFavoritesResponse>('/favorites');
    return data.removed;
  },
};
