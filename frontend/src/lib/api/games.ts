import { apiClient } from './client';
import type {
  Game,
  PaginatedResult,
  GameFilters,
  FilterOptions,
  GameLaunchData,
} from '@/types/game';

export const gamesApi = {
  search: async (filters: GameFilters, signal?: AbortSignal): Promise<PaginatedResult<Game>> => {
    const { data } = await apiClient.get<PaginatedResult<Game>>('/games', {
      params: filters,
      signal,
    });
    return data;
  },

  getFilterOptions: async (): Promise<FilterOptions> => {
    const { data } = await apiClient.get<FilterOptions>('/games/filter-options');
    return data;
  },

  getById: async (id: string): Promise<Game> => {
    const { data } = await apiClient.get<Game>(`/games/${id}`);
    return data;
  },

  getRelated: async (id: string, limit = 10): Promise<Game[]> => {
    const { data } = await apiClient.get<Game[]>(`/games/${id}/related`, {
      params: { limit },
    });
    return data;
  },

  getRandom: async (library?: string, platforms?: string[]): Promise<Game> => {
    const { data } = await apiClient.get<Game>('/games/random', {
      params: {
        library,
        platforms: platforms?.join(','),
      },
    });
    return data;
  },

  getLaunchData: async (id: string): Promise<GameLaunchData> => {
    const { data } = await apiClient.get<GameLaunchData>(`/games/${id}/launch`);
    return data;
  },

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

  getMostPlayed: async (limit = 20): Promise<Game[]> => {
    const { data } = await apiClient.get<{ success: boolean; data: Game[]; total: number }>(
      '/games/most-played',
      { params: { limit } }
    );
    return data.data;
  },

  cancelDownload: async (
    id: string
  ): Promise<{ success: boolean; cancelled: boolean; message: string }> => {
    const { data } = await apiClient.delete(`/games/${id}/download`);
    return data;
  },
};
