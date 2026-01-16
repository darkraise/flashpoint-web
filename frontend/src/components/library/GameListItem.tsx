import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Game } from '@/types/game';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ImageIcon, Play, ListPlus, Heart, CheckCircle2, Download } from 'lucide-react';

interface GameListItemProps {
  game: Game;
  onAddToPlaylist?: (gameId: string) => void;
  onToggleFavorite?: (gameId: string) => void;
  isFavorited?: boolean;
  showFavoriteOnHoverOnly?: boolean;
}

export function GameListItem({ game, onAddToPlaylist, onToggleFavorite, isFavorited, showFavoriteOnHoverOnly = false }: GameListItemProps) {
  const [imageError, setImageError] = useState(false);

  // Prefer logo over screenshot for list view
  const imagePath = game.logoPath || game.screenshotPath;
  const imageUrl = imagePath ? `/proxy/images/${imagePath}` : null;

  // Parse tags (limit to first 3 for list display)
  const tags = game.tagsStr
    ? game.tagsStr.split(';').map(t => t.trim()).filter(Boolean).slice(0, 3)
    : [];

  const isPlayable = game.platformName === 'Flash' || game.platformName === 'HTML5';

  return (
    <Card className="group overflow-hidden hover:bg-accent hover:shadow-md hover:border-primary/20 hover:z-10 relative transition-all">
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          {/* Thumbnail */}
          <Link
            to={`/games/${game.id}`}
            className="flex-shrink-0 w-24 h-16 bg-muted rounded overflow-hidden border shadow-sm"
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
          </Link>

          {/* Game Info */}
          <div className="flex-1 min-w-0 space-y-1">
            <Link to={`/games/${game.id}`}>
              <h3 className="font-semibold text-sm truncate hover:text-primary transition-colors" title={game.title}>
                {game.title}
              </h3>
            </Link>

            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary">{game.platformName}</Badge>

              {/* Availability Indicator */}
              {(game.platformName === 'Flash' || game.platformName === 'HTML5') && (
                <>
                  {(game.presentOnDisk === 1 || game.presentOnDisk === null) && (
                    <div className="flex items-center gap-1 text-green-500 text-xs" title="Available - Ready to play">
                      <CheckCircle2 size={14} />
                      <span>Available</span>
                    </div>
                  )}
                  {game.presentOnDisk === 0 && (
                    <div className="flex items-center gap-1 text-yellow-500 text-xs" title="Download Required">
                      <Download size={14} />
                      <span>Download Required</span>
                    </div>
                  )}
                </>
              )}

              {tags.map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {game.developer && (
                <span className="truncate" title={game.developer}>
                  {game.developer}
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex-shrink-0 flex items-center gap-2">
            {onToggleFavorite && (
              <Button
                size="sm"
                variant={isFavorited ? "default" : "ghost"}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleFavorite(game.id);
                }}
                className={`h-9 w-9 p-0 transition-opacity ${
                  showFavoriteOnHoverOnly
                    ? 'opacity-0 group-hover:opacity-100'
                    : isFavorited
                      ? 'bg-rose-500 hover:bg-rose-600'
                      : ''
                }`}
                title={isFavorited ? 'Remove from Favorites' : 'Add to Favorites'}
              >
                <Heart size={18} fill={isFavorited ? "currentColor" : "none"} />
              </Button>
            )}

            {onAddToPlaylist && (
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onAddToPlaylist(game.id);
                }}
                className="h-9 w-9 p-0"
                title="Add to Playlist"
              >
                <ListPlus size={18} />
              </Button>
            )}

            {isPlayable && (
              <Button
                size="sm"
                asChild
              >
                <Link
                  to={`/games/${game.id}/play`}
                  title="Play Game"
                >
                  <Play size={18} />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
