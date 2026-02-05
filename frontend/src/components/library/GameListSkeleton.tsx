import { useUIStore } from '@/store/ui';
import { GameListItemSkeleton } from './GameListItemSkeleton';

export function GameListSkeleton() {
  const listColumns = useUIStore((state) => state.listColumns);

  // Dynamic grid classes based on column count (matching GameList)
  const gridClasses = {
    1: 'grid grid-cols-1 gap-2',
    2: 'grid grid-cols-1 md:grid-cols-2 gap-2',
    3: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2',
    4: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2',
  };

  // Show 20 skeleton items
  return (
    <div className={gridClasses[listColumns]}>
      {Array.from({ length: 20 }).map((_, index) => (
        <GameListItemSkeleton key={index} />
      ))}
    </div>
  );
}
