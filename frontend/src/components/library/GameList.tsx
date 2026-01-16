import { Game } from '@/types/game';
import { GameListItem } from './GameListItem';
import { useUIStore } from '@/store/ui';

interface GameListProps {
  games: Game[];
  onAddToPlaylist?: (gameId: string) => void;
  onToggleFavorite?: (gameId: string) => void;
  favoritedGameIds?: Set<string>;
  showFavoriteOnHoverOnly?: boolean;
}

export function GameList({ games, onAddToPlaylist, onToggleFavorite, favoritedGameIds, showFavoriteOnHoverOnly = false }: GameListProps) {
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
    1: 'grid grid-cols-1 gap-2',
    2: 'grid grid-cols-1 md:grid-cols-2 gap-2',
    3: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2',
    4: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2'
  };

  return (
    <div className={gridClasses[listColumns]}>
      {games.map((game) => (
        <GameListItem
          key={game.id}
          game={game}
          onAddToPlaylist={onAddToPlaylist}
          onToggleFavorite={onToggleFavorite}
          isFavorited={favoritedGameIds?.has(game.id) || false}
          showFavoriteOnHoverOnly={showFavoriteOnHoverOnly}
        />
      ))}
    </div>
  );
}
