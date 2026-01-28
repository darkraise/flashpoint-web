import { apiClient } from './client';
import type {
  StartSessionResponse,
  EndSessionResponse,
  UserStats,
  GameStats,
  PlaySession,
  PlayActivityData,
  GameDistribution,
} from '@/types/play-tracking';

/**
 * Play Tracking API
 *
 * Tracks game play sessions and provides play statistics
 */
export const playTrackingApi = {
  /**
   * Start a new play session
   */
  startSession: async (gameId: string, gameTitle: string): Promise<StartSessionResponse> => {
    const { data } = await apiClient.post<StartSessionResponse>('/play/start', {
      gameId,
      gameTitle,
    });
    return data;
  },

  /**
   * End an active play session
   */
  endSession: async (sessionId: string): Promise<EndSessionResponse> => {
    const { data } = await apiClient.post<EndSessionResponse>('/play/end', {
      sessionId,
    });
    return data;
  },

  /**
   * Get user play statistics
   */
  getStats: async (): Promise<UserStats> => {
    const { data } = await apiClient.get<UserStats>('/play/stats');
    return data;
  },

  /**
   * Get game-specific play statistics with pagination
   */
  getGameStats: async (
    limit = 50,
    offset = 0
  ): Promise<{ data: GameStats[]; limit: number; offset: number }> => {
    const { data } = await apiClient.get('/play/game-stats', {
      params: { limit, offset },
    });
    return data;
  },

  /**
   * Get play history with pagination
   */
  getHistory: async (
    limit = 50,
    offset = 0
  ): Promise<{ data: PlaySession[]; limit: number; offset: number }> => {
    const { data } = await apiClient.get('/play/history', {
      params: { limit, offset },
    });
    return data;
  },

  /**
   * Get top played games
   */
  getTopGames: async (limit = 10): Promise<GameStats[]> => {
    const { data } = await apiClient.get<GameStats[]>('/play/top-games', {
      params: { limit },
    });
    return data;
  },

  /**
   * Get play activity over time
   */
  getActivityOverTime: async (days = 30): Promise<PlayActivityData[]> => {
    const { data } = await apiClient.get<PlayActivityData[]>('/play/activity-over-time', {
      params: { days },
    });
    return data;
  },

  /**
   * Get games distribution statistics
   */
  getGamesDistribution: async (limit = 10): Promise<GameDistribution[]> => {
    const { data } = await apiClient.get<GameDistribution[]>('/play/games-distribution', {
      params: { limit },
    });
    return data;
  },
};
