import { apiClient } from './client';
import type {
  Game,
  PaginatedResult,
  GameFilters,
  FilterOptions,
  GameLaunchData,
} from '@/types/game';

/**
 * Games API
 *
 * Handles game searching, filtering, and game data operations
 */
export const gamesApi = {
  /**
   * Search games with filters and pagination
   */
  search: async (filters: GameFilters, signal?: AbortSignal): Promise<PaginatedResult<Game>> => {
    const { data } = await apiClient.get<PaginatedResult<Game>>('/games', {
      params: filters,
      signal,
    });
    return data;
  },

  /**
   * Get available filter options (platforms, libraries, tags)
   */
  getFilterOptions: async (): Promise<FilterOptions> => {
    const { data } = await apiClient.get<FilterOptions>('/games/filter-options');
    return data;
  },

  /**
   * Get game details by ID
   */
  getById: async (id: string): Promise<Game> => {
    const { data } = await apiClient.get<Game>(`/games/${id}`);
    return data;
  },

  /**
   * Get related games (same platform/library)
   */
  getRelated: async (id: string, limit = 10): Promise<Game[]> => {
    const { data } = await apiClient.get<Game[]>(`/games/${id}/related`, {
      params: { limit },
    });
    return data;
  },

  /**
   * Get a random game (optionally filtered by library)
   */
  getRandom: async (library?: string): Promise<Game> => {
    const { data } = await apiClient.get<Game>('/games/random', {
      params: { library },
    });
    return data;
  },

  /**
   * Get game launch data (URLs, application path, etc.)
   */
  getLaunchData: async (id: string): Promise<GameLaunchData> => {
    const { data } = await apiClient.get<GameLaunchData>(`/games/${id}/launch`);
    return data;
  },

  /**
   * Download game data
   */
  downloadGame: async (
    id: string,
    gameDataId?: number
  ): Promise<{ success: boolean; message: string; gameDataId: number; sha256: string }> => {
    const { data } = await apiClient.post<{
      success: boolean;
      message: string;
      gameDataId: number;
      sha256: string;
    }>(`/games/${id}/download`, { gameDataId });
    return data;
  },

  /**
   * Get most played games globally
   */
  getMostPlayed: async (limit = 20): Promise<Game[]> => {
    const { data } = await apiClient.get<{ success: boolean; data: Game[]; total: number }>(
      '/games/most-played',
      { params: { limit } }
    );
    return data.data;
  },

  /**
   * Cancel active game download
   */
  cancelDownload: async (
    id: string
  ): Promise<{ success: boolean; cancelled: boolean; message: string }> => {
    const { data } = await apiClient.delete(`/games/${id}/download`);
    return data;
  },
};
