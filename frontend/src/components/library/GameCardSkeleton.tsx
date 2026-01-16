import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

export function GameCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      {/* Image Skeleton */}
      <Skeleton className="aspect-video w-full" />

      {/* Content Skeleton */}
      <CardContent className="p-3 space-y-2">
        {/* Title */}
        <Skeleton className="h-5 w-3/4" />

        {/* Platform and Library */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-4 w-12" />
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1">
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-14" />
        </div>

        {/* Developer */}
        <Skeleton className="h-4 w-2/3" />
      </CardContent>
    </Card>
  );
}
