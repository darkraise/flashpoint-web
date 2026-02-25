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
    // Convert comma-separated filter strings to arrays for POST body
    const body = {
      search: filters.search,
      platforms: filters.platform?.split(',').filter(Boolean),
      series: filters.series?.split(',').filter(Boolean),
      developers: filters.developers?.split(',').filter(Boolean),
      publishers: filters.publishers?.split(',').filter(Boolean),
      playModes: filters.playModes?.split(',').filter(Boolean),
      languages: filters.languages?.split(',').filter(Boolean),
      library: filters.library,
      tags: filters.tags?.split(',').filter(Boolean),
      yearFrom: filters.yearFrom,
      yearTo: filters.yearTo,
      dateAddedSince: filters.dateAddedSince,
      dateModifiedSince: filters.dateModifiedSince,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
      page: filters.page,
      limit: filters.limit,
    };

    const { data } = await apiClient.post<PaginatedResult<Game>>('/games', body, {
      signal,
    });
    return data;
  },

  getFilterOptions: async (params?: {
    platform?: string;
    library?: string;
    // Context filters for dynamic options
    series?: string;
    developers?: string;
    publishers?: string;
    playModes?: string;
    languages?: string;
    tags?: string;
    yearFrom?: number;
    yearTo?: number;
    // Exclude filter types from response (comma-separated)
    // Used to skip re-fetching options for already-active filters
    exclude?: string;
  }): Promise<Partial<FilterOptions>> => {
    const { data } = await apiClient.get<Partial<FilterOptions>>('/games/filter-options', {
      params,
    });
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
