import { apiClient } from './client';
import type { PaginatedResponse } from '@/types/auth';
import type {
  GameRating,
  RatingAggregate,
  BatchRatingAggregate,
  UpsertRatingData,
} from '@/types/rating';
import type { Game } from '@/types/game';

export const ratingsApi = {
  upsert: async (data: UpsertRatingData): Promise<GameRating> => {
    const { data: response } = await apiClient.put<{ success: true; data: GameRating }>(
      '/ratings',
      data
    );
    return response.data;
  },

  getUserRating: async (gameId: string): Promise<GameRating | null> => {
    const { data: response } = await apiClient.get<{ success: true; data: GameRating | null }>(
      `/ratings/me/${gameId}`
    );
    return response.data;
  },

  getUserRatings: async (
    page: number = 1,
    limit: number = 24,
    sortBy?: string,
    sortOrder?: 'asc' | 'desc'
  ): Promise<PaginatedResponse<GameRating>> => {
    const { data } = await apiClient.get<PaginatedResponse<GameRating>>('/ratings/me', {
      params: { page, limit, sortBy, sortOrder },
    });
    return data;
  },

  getGameAggregate: async (gameId: string): Promise<RatingAggregate> => {
    const { data: response } = await apiClient.get<{ success: true; data: RatingAggregate }>(
      `/ratings/game/${gameId}`
    );
    return response.data;
  },

  getBatchAggregates: async (gameIds: string[]): Promise<Record<string, BatchRatingAggregate>> => {
    const { data: response } = await apiClient.post<{
      success: true;
      data: Record<string, BatchRatingAggregate>;
    }>('/ratings/batch', { gameIds });
    return response.data;
  },

  delete: async (gameId: string): Promise<void> => {
    await apiClient.delete(`/ratings/${gameId}`);
  },

  getTopRated: async (limit?: number): Promise<Game[]> => {
    const { data: response } = await apiClient.get<{ success: true; data: Game[] }>(
      '/ratings/top',
      {
        params: { limit },
      }
    );
    return response.data;
  },
};
