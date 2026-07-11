import { useState, useCallback, useRef, useEffect } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  /** Current rating value (1-5), or null/undefined for unrated */
  value?: number | null;
  /** Callback when rating changes. Omit for read-only mode. */
  onChange?: (rating: number) => void;
  /** Display size */
  size?: 'sm' | 'md' | 'lg';
  /** Show aggregate count alongside stars */
  showCount?: boolean;
  /** Total number of ratings (for display) */
  totalRatings?: number;
  /** Average rating (for compact read-only display) */
  averageRating?: number;
  /** Whether the rating input is disabled */
  disabled?: boolean;
  /** Additional class name */
  className?: string;
}

const STAR_SIZES = {
  sm: 14,
  md: 20,
  lg: 24,
} as const;

const STAR_LABELS = ['Terrible', 'Poor', 'Fair', 'Good', 'Excellent'] as const;

export function StarRating({
  value,
  onChange,
  size = 'md',
  showCount = false,
  totalRatings,
  averageRating,
  disabled = false,
  className,
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const isReadOnly = !onChange;
  const starSize = STAR_SIZES[size];
  const displayValue = hoverValue ?? value ?? 0;

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const handleClick = useCallback(
    (star: number) => {
      if (disabled) return;
      onChangeRef.current?.(star);
    },
    [disabled]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, star: number) => {
      if (disabled) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onChangeRef.current?.(star);
      }
    },
    [disabled]
  );

  // Compact read-only mode for game cards
  if (isReadOnly && size === 'sm' && averageRating !== undefined) {
    if (totalRatings === undefined || totalRatings < 2) {
      return null;
    }

    return (
      <div className={cn('flex items-center gap-1', className)}>
        <Star
          size={starSize}
          className="text-star shrink-0"
          fill="currentColor"
          aria-hidden="true"
        />
        <span className="text-xs font-medium text-foreground">{averageRating.toFixed(1)}</span>
        {showCount && totalRatings !== undefined ? (
          <span className="text-xs text-muted-foreground">({totalRatings})</span>
        ) : null}
      </div>
    );
  }

  // Interactive or full read-only mode
  return (
    <div
      className={cn('inline-flex items-center gap-0.5', className)}
      role={isReadOnly ? undefined : 'radiogroup'}
      aria-label={isReadOnly ? `Rating: ${value ?? 0} out of 5` : 'Rate this game'}
      onMouseLeave={() => {
        if (!isReadOnly) setHoverValue(null);
      }}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= displayValue;

        if (isReadOnly) {
          return (
            <Star
              key={star}
              size={starSize}
              className={cn(
                'shrink-0 transition-colors',
                isFilled ? 'text-star' : 'text-muted-foreground/30'
              )}
              fill={isFilled ? 'currentColor' : 'none'}
              aria-hidden="true"
            />
          );
        }

        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} star${star > 1 ? 's' : ''} - ${STAR_LABELS[star - 1]}`}
            className={cn(
              'shrink-0 cursor-pointer transition-all duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:rounded-sm',
              disabled && 'cursor-not-allowed opacity-50'
            )}
            onClick={() => handleClick(star)}
            onKeyDown={(e) => handleKeyDown(e, star)}
            onMouseEnter={() => setHoverValue(star)}
            disabled={disabled}
          >
            <Star
              size={starSize}
              className={cn(
                'transition-all duration-150',
                isFilled ? 'text-star' : 'text-muted-foreground/30',
                !disabled && 'hover:scale-110'
              )}
              fill={isFilled ? 'currentColor' : 'none'}
              aria-hidden="true"
            />
          </button>
        );
      })}

      {showCount && totalRatings !== undefined ? (
        <span className="ml-1.5 text-xs text-muted-foreground">({totalRatings})</span>
      ) : null}
    </div>
  );
}

StarRating.displayName = 'StarRating';
