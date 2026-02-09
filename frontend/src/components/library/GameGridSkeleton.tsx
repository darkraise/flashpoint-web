import { useUIStore } from '@/store/ui';
import { GameCardSkeleton } from './GameCardSkeleton';

export function GameGridSkeleton() {
  const cardSize = useUIStore((state) => state.cardSize);

  const gridClasses = {
    small:
      'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 py-2',
    medium:
      'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 py-2',
    large:
      'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 py-2',
  };

  return (
    <div className={gridClasses[cardSize]}>
      {Array.from({ length: 20 }).map((_, index) => (
        <GameCardSkeleton key={index} />
      ))}
    </div>
  );
}
