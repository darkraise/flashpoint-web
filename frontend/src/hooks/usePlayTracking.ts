import { useQuery, useMutation } from '@tanstack/react-query';
import { playTrackingApi } from '../lib/api';
import { useAuthStore } from '../store/auth';
import { useEffect, useRef } from 'react';

/**
 * Hook for tracking play sessions
 */
export function usePlaySession(gameId: string | null, gameTitle: string | null) {
  const sessionIdRef = useRef<string | null>(null);
  const { isAuthenticated } = useAuthStore();

  const startMutation = useMutation({
    mutationFn: ({ gameId, gameTitle }: { gameId: string; gameTitle: string }) =>
      playTrackingApi.startSession(gameId, gameTitle),
    onSuccess: (data) => {
      sessionIdRef.current = data.sessionId;
    },
    onError: (error) => {
      console.error('Failed to start play session:', error);
    }
  });

  const endMutation = useMutation({
    mutationFn: (sessionId: string) => playTrackingApi.endSession(sessionId),
    onSuccess: () => {
      sessionIdRef.current = null;
    },
    onError: (error) => {
      console.error('Failed to end play session:', error);
    }
  });

  // Start session when game loads
  useEffect(() => {
    if (isAuthenticated && gameId && gameTitle && !sessionIdRef.current) {
      startMutation.mutate({ gameId, gameTitle });
    }
  }, [isAuthenticated, gameId, gameTitle]);

  // End session on unmount or when game changes
  useEffect(() => {
    return () => {
      if (sessionIdRef.current) {
        playTrackingApi.endSession(sessionIdRef.current).catch(error => {
          console.error('Failed to end play session on cleanup:', error);
        });
      }
    };
  }, []);

  // End current session and start new one when game changes
  useEffect(() => {
    if (sessionIdRef.current && gameId && gameTitle) {
      const currentSessionId = sessionIdRef.current;
      sessionIdRef.current = null;

      playTrackingApi.endSession(currentSessionId).then(() => {
        if (isAuthenticated) {
          startMutation.mutate({ gameId, gameTitle });
        }
      });
    }
  }, [gameId, gameTitle]);

  return {
    sessionId: sessionIdRef.current,
    isTracking: !!sessionIdRef.current,
    endSession: () => {
      if (sessionIdRef.current) {
        endMutation.mutate(sessionIdRef.current);
      }
    }
  };
}

/**
 * Hook to get user stats
 */
export function useUserStats() {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: ['playStats'],
    queryFn: () => playTrackingApi.getStats(),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to get user's game stats
 */
export function useGameStats(limit = 50, offset = 0) {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: ['gameStats', limit, offset],
    queryFn: () => playTrackingApi.getGameStats(limit, offset),
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to get user's play history
 */
export function usePlayHistory(limit = 50, offset = 0) {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: ['playHistory', limit, offset],
    queryFn: () => playTrackingApi.getHistory(limit, offset),
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to get user's top played games
 */
export function useTopGames(limit = 10) {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: ['topGames', limit],
    queryFn: () => playTrackingApi.getTopGames(limit),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to get play activity over time
 */
export function usePlayActivityOverTime(days = 30) {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: ['playActivity', days],
    queryFn: () => playTrackingApi.getActivityOverTime(days),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to get games distribution by playtime
 */
export function useGamesDistribution(limit = 10) {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: ['gamesDistribution', limit],
    queryFn: () => playTrackingApi.getGamesDistribution(limit),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
