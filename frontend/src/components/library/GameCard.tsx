import { Link } from "react-router-dom";
import { useState } from "react";
import { Game } from "@/types/game";
import { ImageIcon, ListPlus, Play, Heart } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FavoriteButton } from "@/components/common/FavoriteButton";
import { RemoveFavoriteButton } from "@/components/common/RemoveFavoriteButton";
import { AddToPlaylistModal } from "@/components/playlist/AddToPlaylistModal";
import { useAuthStore } from "@/store/auth";
import { toast } from "sonner";

interface GameCardProps {
  game: Game;
  showFavoriteButton?: boolean;
  showRemoveButton?: boolean; // NEW: Show remove button (Favorites page only)
  showFavoriteIndicator?: boolean; // NEW: Show filled heart indicator
  showAddToPlaylistButton?: boolean;
  favoriteGameIds?: Set<string>; // Optional: for performance optimization
  isFavoritePage?: boolean; // NEW: Are we on favorites page?
}

export function GameCard({
  game,
  showFavoriteButton = true,
  showRemoveButton = false,
  showFavoriteIndicator = false,
  showAddToPlaylistButton = true,
  favoriteGameIds,
  isFavoritePage = false,
}: GameCardProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);

  const { isAuthenticated } = useAuthStore();

  // Prefer logo over screenshot for game list
  const imagePath = game.logoPath || game.screenshotPath;
  const imageUrl = imagePath ? `/proxy/images/${imagePath}` : null;

  // Check if game is favorited and playable
  const isFavorited = favoriteGameIds?.has(game.id) ?? false;
  const isPlayable =
    game.platformName === "Flash" || game.platformName === "HTML5";

  return (
    <Card className="group overflow-hidden hover:ring-2 hover:ring-primary/80 hover:shadow-xl hover:-translate-y-1 hover:z-20 transition-all duration-200 relative">
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
                  imageLoaded ? "opacity-100 blur-0" : "opacity-0 blur-sm"
                }`}
                onError={() => setImageError(true)}
                onLoad={() => setImageLoaded(true)}
                loading="lazy"
              />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              <ImageIcon size={32} className="mb-2 opacity-50" />
              <span className="text-xs">{game.platformName || "No Image"}</span>
            </div>
          )}
        </CardContent>

        <CardFooter className="p-2.5 flex-col items-start border-t bg-muted/30 min-h-[58px]">
          <h3
            className="font-semibold text-sm truncate w-full"
            title={game.title}
          >
            {game.title}
          </h3>
          {game.platformName && (
            <div className="mt-1 w-full">
              <Badge
                variant="secondary"
                className="h-5 p-1 text-xs font-normal"
              >
                <img
                  src={`/proxy/logos/${game.platformName}.png`}
                  alt={game.platformName}
                  className="w-3.5 h-3.5 object-contain mr-1"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
                <span className="truncate">{game.platformName}</span>
              </Badge>
            </div>
          )}
        </CardFooter>
      </Link>

      {/* Top-Right Action Buttons */}
      <div className="absolute top-1.5 right-1.5 flex gap-1">
        {/* Favorite Indicator (non-clickable, always visible if favorited) */}
        {showFavoriteIndicator && isFavorited && !isFavoritePage && (
          // <div className="h-7 w-7 flex items-center justify-center bg-primary/90 backdrop-blur-sm rounded-md">
          //   <Heart size={14} fill="currentColor" className="text-primary" />
          // </div>
          <Heart size={14} fill="currentColor" className="text-primary" />
        )}

        {/* Remove from Favorites Button (Favorites page only) */}
        {showRemoveButton && isFavoritePage && (
          <RemoveFavoriteButton
            gameId={game.id}
            size="sm"
            className="h-7 w-7 p-0 transition-opacity"
          />
        )}

        {/* Add to Favorites Button (other pages, when not favorited) */}
        {showFavoriteButton && !isFavoritePage && !isFavorited && (
          <FavoriteButton
            gameId={game.id}
            isFavorited={false}
            size="sm"
            className="h-7 w-7 p-0"
            showOnHoverOnly={true}
          />
        )}

        {/* Add to Playlist Button */}
        {showAddToPlaylistButton && (
          <Button
            size="sm"
            variant="secondary"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!isAuthenticated) {
                toast.error("Please log in to add games to playlists");
                return;
              }
              setIsPlaylistModalOpen(true);
            }}
            className="h-7 w-7 p-0 backdrop-blur-sm transition-opacity"
            title="Add to Playlist"
            aria-label="Add to Playlist"
          >
            <ListPlus size={14} />
          </Button>
        )}
      </div>

      {/* Bottom-Right Play Button - BIGGER AND REPOSITIONED */}
      {isPlayable && (
        <Button
          size="default"
          variant="default"
          asChild
          className="absolute bottom-2 right-2 h-10 w-10 p-0 backdrop-blur-sm transition-opacity shadow-lg"
          title="Play Game"
        >
          <Link
            to={`/games/${game.id}/play`}
            onClick={(e) => e.stopPropagation()}
            aria-label="Play Game"
          >
            <Play size={20} fill="currentColor" />
          </Link>
        </Button>
      )}

      {/* Add to Playlist Modal */}
      <AddToPlaylistModal
        isOpen={isPlaylistModalOpen}
        onClose={() => setIsPlaylistModalOpen(false)}
        gameId={game.id}
        gameTitle={game.title}
      />
    </Card>
  );
}
