import { apiClient } from './client';
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

/**
 * Favorites API
 *
 * Manages user's favorite games
 */
export const favoritesApi = {
  /**
   * Get all favorites with pagination
   */
  getAll: async (limit?: number, offset?: number): Promise<Favorite[]> => {
    const { data } = await apiClient.get<Favorite[]>('/favorites', {
      params: { limit, offset },
    });
    return data;
  },

  /**
   * Get favorite game IDs only (for quick lookups)
   */
  getGameIds: async (): Promise<string[]> => {
    const { data } = await apiClient.get<FavoriteGameIdsResponse>('/favorites/game-ids');
    return data.gameIds;
  },

  /**
   * Get favorites with full game data
   */
  getGames: async (
    limit?: number,
    offset?: number,
    sortBy?: 'title' | 'dateAdded',
    sortOrder?: 'asc' | 'desc'
  ): Promise<FavoriteGame[]> => {
    const { data } = await apiClient.get<FavoriteGame[]>('/favorites/games', {
      params: { limit, offset, sortBy, sortOrder },
    });
    return data;
  },

  /**
   * Get favorites statistics
   */
  getStats: async (): Promise<FavoritesStats> => {
    const { data } = await apiClient.get<FavoritesStats>('/favorites/stats');
    return data;
  },

  /**
   * Toggle favorite status
   * Returns true if now favorited, false if unfavorited
   */
  toggle: async (gameId: string): Promise<boolean> => {
    const { data } = await apiClient.post<ToggleFavoriteResponse>('/favorites/toggle', {
      gameId,
    });
    return data.isFavorited;
  },

  /**
   * Add a game to favorites
   */
  add: async (gameId: string): Promise<boolean> => {
    const { data } = await apiClient.post<AddFavoriteResponse>('/favorites', { gameId });
    return data.success;
  },

  /**
   * Remove a game from favorites
   */
  remove: async (gameId: string): Promise<void> => {
    await apiClient.delete(`/favorites/${gameId}`);
  },

  /**
   * Add multiple games to favorites
   * Returns number of games added
   */
  batchAdd: async (gameIds: string[]): Promise<number> => {
    const { data } = await apiClient.post<BatchAddFavoritesResponse>('/favorites/batch', {
      gameIds,
    });
    return data.added;
  },

  /**
   * Remove multiple games from favorites
   * Returns number of games removed
   */
  batchRemove: async (gameIds: string[]): Promise<number> => {
    const { data } = await apiClient.delete<BatchRemoveFavoritesResponse>('/favorites/batch', {
      data: { gameIds },
    });
    return data.removed;
  },

  /**
   * Clear all favorites
   * Returns number of games removed
   */
  clearAll: async (): Promise<number> => {
    const { data } = await apiClient.delete<ClearAllFavoritesResponse>('/favorites');
    return data.removed;
  },
};
