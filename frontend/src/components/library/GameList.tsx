import { Game } from '@/types/game';
import { GameListItem } from './GameListItem';
import { useUIStore } from '@/store/ui';
import { BreadcrumbContext } from '@/components/common/Breadcrumbs';

interface GameListProps {
  games: Game[];
  showFavoriteButton?: boolean;
  showAddToPlaylistButton?: boolean;
  favoriteGameIds?: Set<string>;
  isFavoritePage?: boolean;
  shareToken?: string | null;
  breadcrumbContext?: BreadcrumbContext;
  /** Section key for URL building ('flash', 'html5', 'animations', 'browse') */
  sectionKey?: string | null;
}

export function GameList({
  games,
  showFavoriteButton = true,
  showAddToPlaylistButton = true,
  favoriteGameIds,
  isFavoritePage = false,
  shareToken = null,
  breadcrumbContext,
  sectionKey = null,
}: GameListProps) {
  const listColumns = useUIStore((state) => state.listColumns);

  if (games.length === 0) {
    return <div className="text-center py-12 text-muted-foreground">No games found</div>;
  }

  const gridClasses = {
    1: 'grid grid-cols-1 gap-3',
    2: 'grid grid-cols-1 md:grid-cols-2 gap-3',
    3: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3',
    4: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3',
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
          shareToken={shareToken}
          breadcrumbContext={breadcrumbContext}
          sectionKey={sectionKey}
        />
      ))}
    </div>
  );
}
