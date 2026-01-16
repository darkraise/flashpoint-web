import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Game } from '@/types/game';
import { ImageIcon, ListPlus, Heart, CheckCircle2, Download } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface GameCardProps {
  game: Game;
  onAddToPlaylist?: (gameId: string) => void;
  onToggleFavorite?: (gameId: string) => void;
  isFavorited?: boolean;
  showFavoriteOnHoverOnly?: boolean;
}

export function GameCard({ game, onAddToPlaylist, onToggleFavorite, isFavorited, showFavoriteOnHoverOnly = false }: GameCardProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Prefer logo over screenshot for game list
  const imagePath = game.logoPath || game.screenshotPath;
  const imageUrl = imagePath ? `/proxy/images/${imagePath}` : null;

  return (
    <Card className="group overflow-hidden hover:ring-1 hover:ring-primary/40 hover:shadow-xl hover:-translate-y-1 hover:z-20 transition-all duration-200 relative">
      <Link to={`/games/${game.id}`}>
        <CardContent className="p-0 aspect-square flex items-center justify-center relative overflow-hidden">
          {imageUrl && !imageError ? (
            <>
              {/* Blur placeholder while loading */}
              {!imageLoaded && (
                <div className="absolute inset-0 bg-gradient-to-br from-muted to-accent animate-pulse" />
              )}
              <img
                src={imageUrl}
                alt={game.title}
                className={`w-full h-full object-contain p-2 transition-all duration-300 ${
                  imageLoaded ? 'opacity-100 blur-0' : 'opacity-0 blur-sm'
                }`}
                onError={() => setImageError(true)}
                onLoad={() => setImageLoaded(true)}
                loading="lazy"
              />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              <ImageIcon size={32} className="mb-2 opacity-50" />
              <span className="text-xs">{game.platformName || 'No Image'}</span>
            </div>
          )}

          {/* Availability Indicator */}
          {(game.platformName === 'Flash' || game.platformName === 'HTML5') && (
            <>
              {(game.presentOnDisk === 1 || game.presentOnDisk === null) && (
                <Badge
                  variant="default"
                  className="absolute top-1.5 left-1.5 h-5 w-5 p-0 flex items-center justify-center bg-green-500 hover:bg-green-500"
                  title="Available - Ready to play"
                >
                  <CheckCircle2 size={12} />
                </Badge>
              )}
              {game.presentOnDisk === 0 && (
                <Badge
                  variant="default"
                  className="absolute top-1.5 left-1.5 h-5 w-5 p-0 flex items-center justify-center bg-yellow-500 hover:bg-yellow-500"
                  title="Download Required"
                >
                  <Download size={12} />
                </Badge>
              )}
            </>
          )}
        </CardContent>

        <CardFooter className="p-2.5 flex-col items-start border-t bg-muted/30 min-h-[60px]">
          <h3 className="font-semibold text-sm truncate w-full" title={game.title}>
            {game.title}
          </h3>
          <p className="text-xs text-muted-foreground truncate w-full mt-0.5" title={game.developer || ''}>
            {game.developer || '\u00A0'}
          </p>
        </CardFooter>
      </Link>

      {/* Action Buttons */}
      <div className="absolute top-1.5 right-1.5 flex gap-1">
        {onToggleFavorite && (
          <Button
            size="sm"
            variant={isFavorited ? "default" : "secondary"}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleFavorite(game.id);
            }}
            className={`h-7 w-7 p-0 backdrop-blur-sm transition-opacity ${
              showFavoriteOnHoverOnly
                ? 'opacity-0 group-hover:opacity-100'
                : isFavorited
                  ? 'opacity-100 bg-rose-500 hover:bg-rose-600'
                  : 'opacity-0 group-hover:opacity-100'
            }`}
            title={isFavorited ? 'Remove from Favorites' : 'Add to Favorites'}
          >
            <Heart size={14} fill={isFavorited ? "currentColor" : "none"} />
          </Button>
        )}
        {onAddToPlaylist && (
          <Button
            size="sm"
            variant="secondary"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAddToPlaylist(game.id);
            }}
            className="h-7 w-7 p-0 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
            title="Add to Playlist"
          >
            <ListPlus size={14} />
          </Button>
        )}
      </div>
    </Card>
  );
}
