import { Link, useNavigate } from 'react-router-dom';
import { useState, memo } from 'react';
import { Game } from '@/types/game';
import { ImageIcon, ListPlus, Play, Heart } from 'lucide-react';
import { getGameLogoUrl } from '@/utils/gameUtils';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { FavoriteButton } from '@/components/common/FavoriteButton';
import { RemoveFavoriteButton } from '@/components/common/RemoveFavoriteButton';
import { AddToPlaylistModal } from '@/components/playlist/AddToPlaylistModal';
import { useAuthStore } from '@/store/auth';
import { toast } from 'sonner';
import { buildSharedGameUrl } from '@/hooks/useSharedPlaylistAccess';
import { BreadcrumbContext } from '@/components/common/Breadcrumbs';

interface GameCardProps {
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

const GameCardComponent = function GameCard({
  game,
  showFavoriteButton = true,
  showRemoveButton = false,
  showFavoriteIndicator = false,
  showAddToPlaylistButton = true,
  favoriteGameIds,
  isFavoritePage = false,
  shareToken = null,
  breadcrumbContext,
}: GameCardProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);

  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  const imageUrl = getGameLogoUrl(game.id) || null;

  const isFavorited = favoriteGameIds?.has(game.id) ?? false;
  const isPlayable = game.platformName === 'Flash' || game.platformName === 'HTML5';

  const gameDetailUrl = buildSharedGameUrl(`/games/${game.id}`, shareToken);
  const gamePlayUrl = buildSharedGameUrl(`/games/${game.id}/play`, shareToken);

  const handleCardClick = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e && 'key' in e && e.key !== 'Enter' && e.key !== ' ') {
      return;
    }
    if (e && 'key' in e) {
      e.preventDefault();
    }
    navigate(gameDetailUrl, {
      state: breadcrumbContext ? { breadcrumbContext } : undefined,
    });
  };

  return (
    <Card className="group cursor-pointer rounded-xl bg-gradient-to-br from-card to-card/80 hover:shadow-2xl hover:shadow-primary/20 hover:-translate-y-2 border-b-4 hover:border-b-4 hover:border-b-primary transition-all duration-300 ease-out relative flex flex-col">
      <CardContent
        className="p-0 aspect-square flex items-center justify-center relative overflow-hidden"
        onClick={handleCardClick}
        role="link"
        tabIndex={0}
        onKeyDown={handleCardClick}
      >
        {imageUrl && !imageError ? (
          <>
            {!imageLoaded ? (
              <div className="absolute inset-0 bg-gradient-to-br from-muted to-accent animate-pulse z-0" />
            ) : null}

            <img
              src={imageUrl}
              alt={game.title}
              className={`w-full h-full object-contain p-2 z-0 transition-all duration-500 ${
                imageLoaded ? 'opacity-100 blur-0 group-hover:scale-105' : 'opacity-0 blur-sm'
              }`}
              onError={() => setImageError(true)}
              onLoad={() => setImageLoaded(true)}
              loading="lazy"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent z-10 pointer-events-none" />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center text-muted-foreground z-0">
            <ImageIcon size={32} className="mb-2 opacity-50" />
            <span className="text-xs">{game.platformName || 'No Image'}</span>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 z-20 backdrop-blur-lg bg-black/30 border-t border-white/10 flex items-center justify-start gap-1.5 px-3 py-2 translate-y-0 md:translate-y-full md:group-hover:translate-y-0 motion-safe:transition-all motion-safe:duration-300 motion-safe:ease-out">
          {showFavoriteButton && !isFavorited ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <FavoriteButton
                    gameId={game.id}
                    isFavorited={false}
                    size="sm"
                    className="h-11 w-11 p-0 bg-white/10 hover:bg-white/20 text-white hover:text-red-400 border-none"
                    showOnHoverOnly={false}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>Add to Favorites</TooltipContent>
            </Tooltip>
          ) : null}

          {showRemoveButton && isFavorited ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <RemoveFavoriteButton
                    gameId={game.id}
                    size="sm"
                    className="h-11 w-11 p-0 bg-white/10 hover:bg-red-500/80 text-white border-none"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>Remove from Favorites</TooltipContent>
            </Tooltip>
          ) : null}

          {showAddToPlaylistButton ? (
            <Tooltip>
              <TooltipTrigger asChild>
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
                  className="h-11 w-11 p-0 bg-white/10 hover:bg-white/20 text-white hover:text-primary border-none"
                  aria-label={`Add ${game.title} to playlist`}
                >
                  <ListPlus size={16} aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Add to Playlist</TooltipContent>
            </Tooltip>
          ) : null}

          {isPlayable ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="default"
                  asChild
                  className="h-11 w-11 p-0 ml-auto bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg border-none hover:shadow-xl hover:shadow-primary/40"
                >
                  <Link
                    to={gamePlayUrl}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Play ${game.title}`}
                  >
                    <Play size={16} fill="currentColor" aria-hidden="true" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Play Game</TooltipContent>
            </Tooltip>
          ) : null}
        </div>
      </CardContent>

      <CardFooter
        className="flex flex-col items-start gap-2 p-3 border-t border-border/50 cursor-pointer mt-auto"
        onClick={handleCardClick}
        role="link"
        tabIndex={0}
        onKeyDown={handleCardClick}
      >
        <div className="flex items-center justify-between w-full h-6 min-h-[24px]">
          {game.platformName ? (
            <Badge
              className="backdrop-blur-md bg-primary/10 border border-primary/20 h-6 px-2 text-xs font-normal text-primary"
              variant="outline"
            >
              <img
                src={`/proxy/logos/${game.platformName}.png`}
                alt={game.platformName}
                className="w-3.5 h-3.5 object-contain mr-1"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <span className="truncate">{game.platformName}</span>
            </Badge>
          ) : null}

          {showFavoriteIndicator && isFavorited && !isFavoritePage ? (
            <div
              className="flex items-center gap-1 text-red-500"
              onClick={(e) => e.stopPropagation()}
            >
              <Heart size={16} fill="currentColor" aria-hidden="true" />
              {/* <span className="text-xs font-medium">Favorited</span> */}
            </div>
          ) : null}
        </div>

        <h3
          className="text-base font-semibold line-clamp-2 w-full h-12 min-h-[48px] leading-6"
          title={game.title}
        >
          {game.title}
        </h3>

        <div className="h-5 min-h-[20px] w-full">
          {game.developer ? (
            <p className="text-sm text-muted-foreground truncate w-full" title={game.developer}>
              by {game.developer}
            </p>
          ) : null}
        </div>
      </CardFooter>

      {isPlaylistModalOpen ? (
        <AddToPlaylistModal
          isOpen={isPlaylistModalOpen}
          onClose={() => setIsPlaylistModalOpen(false)}
          gameId={game.id}
          gameTitle={game.title}
        />
      ) : null}
    </Card>
  );
};

export const GameCard = memo(GameCardComponent, (prevProps, nextProps) => {
  if (prevProps.game.id !== nextProps.game.id || prevProps.game.title !== nextProps.game.title) {
    return false;
  }

  const prevIsFavorited = prevProps.favoriteGameIds?.has(prevProps.game.id) ?? false;
  const nextIsFavorited = nextProps.favoriteGameIds?.has(nextProps.game.id) ?? false;
  if (prevIsFavorited !== nextIsFavorited) {
    return false;
  }

  if (
    prevProps.showFavoriteButton !== nextProps.showFavoriteButton ||
    prevProps.showRemoveButton !== nextProps.showRemoveButton ||
    prevProps.showFavoriteIndicator !== nextProps.showFavoriteIndicator ||
    prevProps.showAddToPlaylistButton !== nextProps.showAddToPlaylistButton ||
    prevProps.isFavoritePage !== nextProps.isFavoritePage ||
    prevProps.shareToken !== nextProps.shareToken ||
    prevProps.breadcrumbContext?.label !== nextProps.breadcrumbContext?.label ||
    prevProps.breadcrumbContext?.href !== nextProps.breadcrumbContext?.href
  ) {
    return false;
  }

  return true;
});
GameCard.displayName = 'GameCard';
