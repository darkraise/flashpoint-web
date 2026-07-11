import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ratingsApi } from '@/lib/api';
import { useFeatureFlags } from './useFeatureFlags';
import { useDialog } from '@/contexts/DialogContext';
import { getErrorMessage } from '@/types/api-error';
import type { GameRating, RatingAggregate, UpsertRatingData } from '@/types/rating';

export function useUserGameRating(gameId: string | undefined) {
  const { isFeatureEnabled } = useFeatureFlags();
  const enableRatings = isFeatureEnabled('enableRatings');

  return useQuery({
    queryKey: ['ratings', 'me', gameId],
    queryFn: () => ratingsApi.getUserRating(gameId!),
    enabled: !!gameId && enableRatings,
    staleTime: 1000 * 60 * 2,
  });
}

export function useGameRatingAggregate(gameId: string | undefined) {
  const { isFeatureEnabled } = useFeatureFlags();
  const enableRatings = isFeatureEnabled('enableRatings');

  return useQuery({
    queryKey: ['ratings', 'aggregate', gameId],
    queryFn: () => ratingsApi.getGameAggregate(gameId!),
    enabled: !!gameId && enableRatings,
    staleTime: 1000 * 60 * 2,
  });
}

export function useBatchRatingAggregates(gameIds: readonly string[]) {
  const { isFeatureEnabled } = useFeatureFlags();
  const enableRatings = isFeatureEnabled('enableRatings');

  const sortedIds = useMemo(() => [...gameIds].sort(), [gameIds]);

  return useQuery({
    queryKey: ['ratings', 'batch', sortedIds],
    queryFn: () => ratingsApi.getBatchAggregates(sortedIds),
    enabled: sortedIds.length > 0 && enableRatings,
    staleTime: 1000 * 60 * 2,
  });
}

export function useUpsertRating() {
  const queryClient = useQueryClient();
  const { showToast } = useDialog();

  return useMutation({
    mutationFn: (data: UpsertRatingData) => ratingsApi.upsert(data),

    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ['ratings', 'me', data.gameId] });
      await queryClient.cancelQueries({ queryKey: ['ratings', 'aggregate', data.gameId] });

      const previousUserRating = queryClient.getQueryData<GameRating | null>([
        'ratings',
        'me',
        data.gameId,
      ]);
      const previousAggregate = queryClient.getQueryData<RatingAggregate>([
        'ratings',
        'aggregate',
        data.gameId,
      ]);

      // Optimistically update the user's rating
      queryClient.setQueryData<GameRating | null>(['ratings', 'me', data.gameId], (old) => {
        const now = new Date().toISOString();
        if (old) {
          return { ...old, rating: data.rating, updatedAt: now };
        }
        return {
          id: -1,
          userId: -1,
          gameId: data.gameId,
          rating: data.rating,
          createdAt: now,
          updatedAt: now,
        };
      });

      // Optimistically update the aggregate
      queryClient.setQueryData<RatingAggregate>(['ratings', 'aggregate', data.gameId], (old) => {
        if (!old) return old;
        const wasRated = previousUserRating !== null && previousUserRating !== undefined;
        const totalRatings = wasRated ? old.totalRatings : old.totalRatings + 1;
        const prevRatingValue = wasRated ? (previousUserRating?.rating ?? 0) : 0;
        const totalScore = old.averageRating * old.totalRatings - prevRatingValue + data.rating;
        const averageRating = totalRatings > 0 ? totalScore / totalRatings : data.rating;
        return { ...old, averageRating, totalRatings };
      });

      return { previousUserRating, previousAggregate };
    },

    onError: (err: unknown, data, context) => {
      if (context?.previousUserRating !== undefined) {
        queryClient.setQueryData(['ratings', 'me', data.gameId], context.previousUserRating);
      }
      if (context?.previousAggregate !== undefined) {
        queryClient.setQueryData(['ratings', 'aggregate', data.gameId], context.previousAggregate);
      }
      const message = getErrorMessage(err) || 'Failed to save rating';
      showToast(message, 'error');
    },

    onSuccess: (_result, data) => {
      queryClient.invalidateQueries({
        queryKey: ['ratings', 'batch'],
        predicate: (query) => {
          if (query.queryKey[0] !== 'ratings' || query.queryKey[1] !== 'batch') return false;
          const ids = query.queryKey[2];
          return Array.isArray(ids) && ids.includes(data.gameId);
        },
      });
    },

    onSettled: (_result, _err, data) => {
      queryClient.invalidateQueries({ queryKey: ['ratings', 'me', data.gameId] });
      queryClient.invalidateQueries({ queryKey: ['ratings', 'aggregate', data.gameId] });
    },
  });
}

export function useDeleteRating() {
  const queryClient = useQueryClient();
  const { showToast } = useDialog();

  return useMutation({
    mutationFn: (gameId: string) => ratingsApi.delete(gameId),

    onMutate: async (gameId) => {
      await queryClient.cancelQueries({ queryKey: ['ratings', 'me', gameId] });
      await queryClient.cancelQueries({ queryKey: ['ratings', 'aggregate', gameId] });

      const previousUserRating = queryClient.getQueryData<GameRating | null>([
        'ratings',
        'me',
        gameId,
      ]);
      const previousAggregate = queryClient.getQueryData<RatingAggregate>([
        'ratings',
        'aggregate',
        gameId,
      ]);

      // Optimistically clear the user's rating
      queryClient.setQueryData<GameRating | null>(['ratings', 'me', gameId], null);

      // Optimistically update the aggregate
      queryClient.setQueryData<RatingAggregate>(['ratings', 'aggregate', gameId], (old) => {
        if (!old) return old;
        const totalRatings = Math.max(0, old.totalRatings - 1);
        const prevRatingValue = previousUserRating?.rating ?? 0;
        const totalScore = old.averageRating * old.totalRatings - prevRatingValue;
        const averageRating = totalRatings > 0 ? totalScore / totalRatings : 0;
        return { ...old, averageRating, totalRatings };
      });

      return { previousUserRating, previousAggregate };
    },

    onError: (err: unknown, gameId, context) => {
      if (context?.previousUserRating !== undefined) {
        queryClient.setQueryData(['ratings', 'me', gameId], context.previousUserRating);
      }
      if (context?.previousAggregate !== undefined) {
        queryClient.setQueryData(['ratings', 'aggregate', gameId], context.previousAggregate);
      }
      const message = getErrorMessage(err) || 'Failed to delete rating';
      showToast(message, 'error');
    },

    onSuccess: (_result, gameId) => {
      queryClient.invalidateQueries({
        queryKey: ['ratings', 'batch'],
        predicate: (query) => {
          if (query.queryKey[0] !== 'ratings' || query.queryKey[1] !== 'batch') return false;
          const ids = query.queryKey[2];
          return Array.isArray(ids) && ids.includes(gameId);
        },
      });
    },

    onSettled: (_result, _err, gameId) => {
      queryClient.invalidateQueries({ queryKey: ['ratings', 'me', gameId] });
      queryClient.invalidateQueries({ queryKey: ['ratings', 'aggregate', gameId] });
    },
  });
}

export function useTopRatedGames(limit: number) {
  const { isFeatureEnabled } = useFeatureFlags();
  const enableRatings = isFeatureEnabled('enableRatings');

  return useQuery({
    queryKey: ['ratings', 'top', limit],
    queryFn: () => ratingsApi.getTopRated(limit),
    enabled: enableRatings,
    staleTime: 1000 * 60 * 5,
  });
}
