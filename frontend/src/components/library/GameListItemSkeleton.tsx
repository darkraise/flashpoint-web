import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

export function GameListItemSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-3 p-3">
        {/* Thumbnail Skeleton */}
        <Skeleton className="flex-shrink-0 w-24 h-16 rounded" />

        {/* Game Info Skeleton */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Title */}
          <Skeleton className="h-5 w-3/4" />

          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-5 w-14" />
          </div>

          {/* Developer and Library */}
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>

        {/* Action Buttons Skeleton */}
        <div className="flex-shrink-0 flex gap-2">
          <Skeleton className="w-8 h-8 rounded" />
          <Skeleton className="w-8 h-8 rounded" />
        </div>
      </div>
    </Card>
  );
}
