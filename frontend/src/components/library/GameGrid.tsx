import { Game } from '@/types/game';
import { GameCard } from './GameCard';
import { BreadcrumbContext } from '@/components/common/Breadcrumbs';
import { useUIStore } from '@/store/ui';

interface GameGridProps {
  games: Game[];
  showFavoriteButton?: boolean;
  showAddToPlaylistButton?: boolean;
  favoriteGameIds?: Set<string>;
  isFavoritePage?: boolean;
  shareToken?: string | null;
  breadcrumbContext?: BreadcrumbContext;
}

export function GameGrid({
  games,
  showFavoriteButton = true,
  showAddToPlaylistButton = true,
  favoriteGameIds,
  isFavoritePage = false,
  shareToken = null,
  breadcrumbContext,
}: GameGridProps) {
  const cardSize = useUIStore((state) => state.cardSize);

  if (games.length === 0) {
    return <div className="text-center py-12 text-muted-foreground">No games found</div>;
  }

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
          breadcrumbContext={breadcrumbContext}
        />
      ))}
    </div>
  );
}
