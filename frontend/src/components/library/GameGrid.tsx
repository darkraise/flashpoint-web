import { Game } from '@/types/game';
import { GameCard } from './GameCard';
import { useUIStore } from '@/store/ui';

interface GameGridProps {
  games: Game[];
  showFavoriteButton?: boolean;
  showAddToPlaylistButton?: boolean;
  favoriteGameIds?: Set<string>; // Optional: for performance optimization
  isFavoritePage?: boolean;
  shareToken?: string | null; // Optional: for shared playlist navigation
}

export function GameGrid({
  games,
  showFavoriteButton = true,
  showAddToPlaylistButton = true,
  favoriteGameIds,
  isFavoritePage = false,
  shareToken = null,
}: GameGridProps) {
  const cardSize = useUIStore((state) => state.cardSize);

  if (games.length === 0) {
    return <div className="text-center py-12 text-gray-400">No games found</div>;
  }

  // Dynamic grid classes based on card size
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
      {games.map((game) => (
        <GameCard
          key={game.id}
          game={game}
          showFavoriteButton={showFavoriteButton}
          showRemoveButton={true}
          showFavoriteIndicator={!isFavoritePage}
          showAddToPlaylistButton={showAddToPlaylistButton}
          favoriteGameIds={favoriteGameIds}
          isFavoritePage={isFavoritePage}
          shareToken={shareToken}
        />
      ))}
    </div>
  );
}
