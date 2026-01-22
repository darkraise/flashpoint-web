import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardFooter } from '@/components/ui/card';

export function GameCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      {/* Image Skeleton - Square aspect ratio matching actual card */}
      <CardContent className="p-0 aspect-square flex items-center justify-center">
        <Skeleton className="w-full h-full" />
      </CardContent>

      {/* Footer Skeleton - Matching actual card footer */}
      <CardFooter className="p-2.5 flex-col items-start border-t bg-muted/30 min-h-[58px] gap-1">
        {/* Title Skeleton */}
        <Skeleton className="h-5 w-3/4" />

        {/* Platform Badge Skeleton */}
        <Skeleton className="h-5 w-20" />
      </CardFooter>
    </Card>
  );
}
