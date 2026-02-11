import { Link, useNavigate } from 'react-router-dom';
import { useState, memo } from 'react';
import { Game } from '@/types/game';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ImageIcon, Play, ListPlus, Heart } from 'lucide-react';
import { FavoriteButton } from '@/components/common/FavoriteButton';
import { RemoveFavoriteButton } from '@/components/common/RemoveFavoriteButton';
import { AddToPlaylistModal } from '@/components/playlist/AddToPlaylistModal';
import { useAuthStore } from '@/store/auth';
import { toast } from 'sonner';
import { buildSharedGameUrl } from '@/hooks/useSharedPlaylistAccess';
import { BreadcrumbContext } from '@/components/common/Breadcrumbs';
import { getGameLogoUrl } from '@/utils/gameUtils';

interface GameListItemProps {
  game: Game;
  showFavoriteButton?: boolean;
  showRemoveButton?: boolean;
  showFavoriteIndicator?: boolean;
  showAddToPlaylistButton?: boolean;
  favoriteGameIds?: Set<string>;
  isFavoritePage?: boolean;
  shareToken?: string | null;
  breadcrumbContext?: BreadcrumbContext;
}

export const GameListItem = memo(
  function GameListItem({
    game,
    showFavoriteButton = true,
    showRemoveButton = false,
    showFavoriteIndicator = false,
    showAddToPlaylistButton = true,
    favoriteGameIds,
    isFavoritePage = false,
    shareToken = null,
    breadcrumbContext,
  }: GameListItemProps) {
    const [imageError, setImageError] = useState(false);
    const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);

    const { isAuthenticated } = useAuthStore();
    const navigate = useNavigate();

    const imageUrl = getGameLogoUrl(game.id) || null;

    const tags = game.tagsStr
      ? game.tagsStr
          .split(';')
          .map((t) => t.trim())
          .filter(Boolean)
          .slice(0, 3)
      : [];

    const isFavorited = favoriteGameIds?.has(game.id) ?? false;
    const isPlayable = game.platformName === 'Flash' || game.platformName === 'HTML5';

    const gameDetailUrl = buildSharedGameUrl(`/games/${game.id}`, shareToken);
    const gamePlayUrl = buildSharedGameUrl(`/games/${game.id}/play`, shareToken);

    const handleNavigateToDetails = () => {
      navigate(gameDetailUrl, {
        state: breadcrumbContext ? { breadcrumbContext } : undefined,
      });
    };

    return (
      <Card className="group overflow-hidden hover:bg-accent hover:shadow-md hover:border-primary/20 hover:z-10 relative transition-all">
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <div
              onClick={handleNavigateToDetails}
              className="flex-shrink-0 w-24 h-16 bg-muted rounded overflow-hidden border shadow-sm cursor-pointer"
            >
              {imageUrl && !imageError ? (
                <img
                  src={imageUrl}
                  alt={game.title}
                  className="w-full h-full object-contain"
                  onError={() => setImageError(true)}
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon size={20} className="text-muted-foreground opacity-50" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 space-y-1">
              <div onClick={handleNavigateToDetails} className="cursor-pointer">
                <h3
                  className="font-semibold text-sm truncate hover:text-primary transition-colors"
                  title={game.title}
                >
                  {game.title}
                </h3>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary">{game.platformName}</Badge>

                {tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {game.developer ? (
                  <span className="truncate" title={game.developer}>
                    {game.developer}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex-shrink-0 flex items-center gap-2">
              {showFavoriteIndicator && isFavorited && !isFavoritePage ? (
                <div className="h-9 w-9 flex items-center justify-center">
                  <Heart size={18} fill="currentColor" className="text-primary" />
                </div>
              ) : null}

              {showRemoveButton && isFavoritePage ? (
                <RemoveFavoriteButton gameId={game.id} size="sm" className="h-9 w-9 p-0" />
              ) : null}

              {showFavoriteButton && !isFavoritePage && !isFavorited ? (
                <FavoriteButton
                  gameId={game.id}
                  isFavorited={false}
                  size="sm"
                  variant="ghost"
                  className="h-9 w-9 p-0"
                  showOnHoverOnly={false}
                />
              ) : null}

              {showAddToPlaylistButton ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!isAuthenticated) {
                      toast.error('Please log in to add games to playlists');
                      return;
                    }
                    setIsPlaylistModalOpen(true);
                  }}
                  className="h-9 w-9 p-0"
                  title="Add to Playlist"
                  aria-label="Add to Playlist"
                >
                  <ListPlus size={18} />
                </Button>
              ) : null}

              {isPlayable ? (
                <Button size="sm" asChild>
                  <Link to={gamePlayUrl} title="Play Game" aria-label="Play Game">
                    <Play size={18} />
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>
        </CardContent>

        {/* Add to Playlist Modal — conditionally rendered to avoid hundreds of hidden instances */}
        {isPlaylistModalOpen && (
          <AddToPlaylistModal
            isOpen={isPlaylistModalOpen}
            onClose={() => setIsPlaylistModalOpen(false)}
            gameId={game.id}
            gameTitle={game.title}
          />
        )}
      </Card>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.game.id === nextProps.game.id &&
      prevProps.game.title === nextProps.game.title &&
      prevProps.showFavoriteButton === nextProps.showFavoriteButton &&
      prevProps.showRemoveButton === nextProps.showRemoveButton &&
      prevProps.showFavoriteIndicator === nextProps.showFavoriteIndicator &&
      prevProps.showAddToPlaylistButton === nextProps.showAddToPlaylistButton &&
      prevProps.isFavoritePage === nextProps.isFavoritePage &&
      prevProps.shareToken === nextProps.shareToken &&
      prevProps.breadcrumbContext?.label === nextProps.breadcrumbContext?.label &&
      prevProps.breadcrumbContext?.href === nextProps.breadcrumbContext?.href &&
      (prevProps.favoriteGameIds?.has(prevProps.game.id) ?? false) ===
        (nextProps.favoriteGameIds?.has(nextProps.game.id) ?? false)
    );
  }
);
