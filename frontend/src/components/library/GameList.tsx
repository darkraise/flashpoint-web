import { Game } from '@/types/game';
import { GameListItem } from './GameListItem';
import { useUIStore } from '@/store/ui';

interface GameListProps {
  games: Game[];
  showFavoriteButton?: boolean;
  showAddToPlaylistButton?: boolean;
  favoriteGameIds?: Set<string>; // Optional: for performance optimization
  isFavoritePage?: boolean;
}

export function GameList({ games, showFavoriteButton = true, showAddToPlaylistButton = true, favoriteGameIds, isFavoritePage = false }: GameListProps) {
  const listColumns = useUIStore((state) => state.listColumns);

  if (games.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        No games found
      </div>
    );
  }

  // Dynamic grid classes based on column count
  const gridClasses = {
    1: 'grid grid-cols-1 gap-3',
    2: 'grid grid-cols-1 md:grid-cols-2 gap-3',
    3: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3',
    4: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3'
  };

  return (
    <div className={gridClasses[listColumns]}>
      {games.map((game) => (
        <GameListItem
          key={game.id}
          game={game}
          showFavoriteButton={showFavoriteButton}
          showRemoveButton={isFavoritePage}
          showFavoriteIndicator={!isFavoritePage}
          showAddToPlaylistButton={showAddToPlaylistButton}
          favoriteGameIds={favoriteGameIds}
          isFavoritePage={isFavoritePage}
        />
      ))}
    </div>
  );
}
