import { memo } from 'react';
import { Star } from 'lucide-react';
import { StarRating } from '@/components/common/StarRating';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserGameRating, useGameRatingAggregate, useUpsertRating } from '@/hooks/useRatings';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/lib/utils';

interface GameRatingSectionProps {
  gameId: string;
  layout?: 'inline' | 'detail';
  className?: string;
}

function GameRatingSectionComponent({
  gameId,
  layout = 'inline',
  className,
}: GameRatingSectionProps) {
  const { enableRatings } = useFeatureFlags();
  const { isAuthenticated, user } = useAuthStore();
  const hasRatePermission = user?.permissions?.includes('games.rate') ?? false;

  const { data: userRating, isLoading: loadingUserRating } = useUserGameRating(gameId);
  const { data: aggregate, isLoading: loadingAggregate } = useGameRatingAggregate(gameId);
  const upsertRating = useUpsertRating();

  if (!enableRatings) return null;

  const isLoading = loadingUserRating || loadingAggregate;
  const canRate = isAuthenticated && hasRatePermission;
  const currentRating = userRating?.rating ?? null;
  const hasAggregate = (aggregate?.totalRatings ?? 0) > 0;

  const handleRate = (rating: number) => {
    upsertRating.mutate({ gameId, rating });
  };

  // Detail layout — vertical, used in the two-column game detail page
  if (layout === 'detail') {
    if (isLoading) {
      return (
        <div className={cn('lg:w-64 lg:shrink-0 space-y-3', className)}>
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-32" />
        </div>
      );
    }

    return (
      <div className={cn('lg:w-64 lg:shrink-0', className)}>
        <h2 className="text-lg font-semibold mb-3">Community Rating</h2>

        {hasAggregate ? (
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <Star size={20} className="text-star" fill="currentColor" aria-hidden="true" />
              <span className="text-3xl font-bold text-foreground">
                {aggregate?.averageRating.toFixed(1)}
              </span>
              <span className="text-sm text-muted-foreground">/ 5</span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {aggregate?.totalRatings} {aggregate?.totalRatings === 1 ? 'rating' : 'ratings'}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground mb-4">No ratings yet</p>
        )}

        {canRate ? (
          <div className="mb-4">
            <p className="text-sm text-muted-foreground mb-1.5">
              {currentRating ? `Your rating: ${currentRating}/5` : 'Rate this game'}
            </p>
            <StarRating
              value={currentRating}
              onChange={handleRate}
              size="md"
              disabled={upsertRating.isPending}
            />
          </div>
        ) : !isAuthenticated ? (
          <p className="text-sm text-muted-foreground mb-4">Sign in to rate</p>
        ) : null}

        {hasAggregate && aggregate ? (
          <RatingDistribution
            distribution={aggregate.distribution}
            totalRatings={aggregate.totalRatings}
            compact={false}
          />
        ) : null}
      </div>
    );
  }

  // Inline layout — horizontal, for compact usage
  if (isLoading) {
    return (
      <div className={cn('flex items-center gap-6 mt-3', className)}>
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-6 w-24" />
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 mt-3', className)}>
      {/* User's rating input or read-only */}
      <div className="flex items-center gap-2">
        {canRate ? (
          <>
            <StarRating
              value={currentRating}
              onChange={handleRate}
              size="md"
              disabled={upsertRating.isPending}
            />
            <span className="text-sm text-muted-foreground">
              {currentRating ? `Your rating: ${currentRating}/5` : 'Rate this game'}
            </span>
          </>
        ) : (
          <>
            <StarRating value={Math.round(aggregate?.averageRating ?? 0)} size="md" />
            {!isAuthenticated ? (
              <span className="text-xs text-muted-foreground">Sign in to rate</span>
            ) : null}
          </>
        )}
      </div>

      {/* Aggregate display */}
      {hasAggregate ? (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Star size={14} className="text-star" fill="currentColor" aria-hidden="true" />
            <span className="text-sm font-medium text-foreground">
              {aggregate?.averageRating.toFixed(1)}
            </span>
            <span className="text-sm text-muted-foreground">/ 5</span>
          </div>
          <span className="text-sm text-muted-foreground">
            {aggregate?.totalRatings} {aggregate?.totalRatings === 1 ? 'rating' : 'ratings'}
          </span>
        </div>
      ) : canRate && !currentRating ? (
        <span className="text-sm text-muted-foreground">Be the first to rate this game</span>
      ) : null}

      {/* Distribution bars */}
      {hasAggregate && aggregate ? (
        <RatingDistribution
          distribution={aggregate.distribution}
          totalRatings={aggregate.totalRatings}
        />
      ) : null}
    </div>
  );
}

interface RatingDistributionProps {
  distribution: Record<string, number>;
  totalRatings: number;
  compact?: boolean;
}

const RatingDistribution = memo(function RatingDistribution({
  distribution,
  totalRatings,
  compact = true,
}: RatingDistributionProps) {
  if (totalRatings === 0) return null;

  return (
    <div className={cn('flex items-center gap-3', compact && 'hidden lg:flex')}>
      <div className="flex flex-col gap-1">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = distribution[String(star)] ?? 0;
          const percentage = totalRatings > 0 ? (count / totalRatings) * 100 : 0;

          return (
            <div key={star} className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground w-3 text-right">{star}</span>
              <div
                className={cn(
                  'h-1.5 bg-muted rounded-full overflow-hidden',
                  compact ? 'w-20' : 'w-32'
                )}
              >
                <div
                  className="h-full bg-star/80 rounded-full transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              {!compact ? (
                <span className="text-xs text-muted-foreground w-4 text-right">{count}</span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
});

RatingDistribution.displayName = 'RatingDistribution';

export const GameRatingSection = memo(GameRatingSectionComponent);
GameRatingSection.displayName = 'GameRatingSection';
