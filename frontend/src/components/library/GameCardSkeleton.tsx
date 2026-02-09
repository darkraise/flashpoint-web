import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardFooter } from '@/components/ui/card';

export function GameCardSkeleton() {
  return (
    <Card className="rounded-xl bg-gradient-to-br from-card to-card/80 border-b-4 flex flex-col">
      <CardContent className="p-0 aspect-square flex items-center justify-center relative overflow-hidden">
        <Skeleton className="w-full h-full" />

        <div className="absolute bottom-0 left-0 right-0 backdrop-blur-lg bg-black/30 border-t border-white/10 flex items-center justify-start gap-1.5 px-3 py-2">
          <Skeleton className="h-11 w-11 rounded-md bg-white/20" />
          <Skeleton className="h-11 w-11 rounded-md bg-white/20" />
          <Skeleton className="h-11 w-11 rounded-md bg-white/20 ml-auto" />
        </div>
      </CardContent>

      <CardFooter className="flex flex-col items-start gap-2 p-3 border-t border-border/50 mt-auto">
        <div className="flex items-center justify-between w-full h-6 min-h-[24px]">
          <Skeleton className="h-6 w-24 rounded-md" />
        </div>

        <div className="w-full h-12 min-h-[48px] space-y-2">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-3/4" />
        </div>

        <div className="h-5 min-h-[20px] w-full">
          <Skeleton className="h-5 w-2/3" />
        </div>
      </CardFooter>
    </Card>
  );
}
