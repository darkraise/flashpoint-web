import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToggleFavorite } from "@/hooks/useFavorites";
import { useAuthStore } from "@/store/auth";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { toast } from "sonner";

interface FavoriteButtonProps {
  gameId: string;
  isFavorited: boolean; // Required: parent must provide this from useFavoriteGameIds()
  size?: "sm" | "default" | "lg" | "icon";
  variant?: "default" | "secondary" | "ghost" | "outline" | "destructive";
  className?: string;
  showOnHoverOnly?: boolean;
  showLabel?: boolean;
}

export function FavoriteButton({
  gameId,
  isFavorited,
  size = "sm",
  variant,
  className = "",
  showOnHoverOnly = false,
  showLabel = false
}: FavoriteButtonProps) {
  const { isAuthenticated } = useAuthStore();
  const { enableFavorites } = useFeatureFlags();
  const toggleFavorite = useToggleFavorite();

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast.error("Please log in to add favorites");
      return;
    }

    toggleFavorite.mutate(gameId, {
      onSuccess: (newIsFavorited) => {
        toast.success(
          newIsFavorited
            ? "Added to favorites"
            : "Removed from favorites"
        );
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.error?.message || "Failed to toggle favorite");
      }
    });
  };

  if (!isAuthenticated || !enableFavorites) {
    return null;
  }

  const buttonVariant = variant || (isFavorited ? "default" : "secondary");
  const opacityClass = showOnHoverOnly
    ? "opacity-0 group-hover:opacity-100"
    : isFavorited
      ? "opacity-100"
      : "opacity-0 group-hover:opacity-100";

  return (
    <Button
      size={size}
      variant={buttonVariant}
      onClick={handleToggle}
      disabled={toggleFavorite.isPending}
      className={`backdrop-blur-sm transition-opacity ${opacityClass} ${className}`}
      title={isFavorited ? "Remove from Favorites" : "Add to Favorites"}
      aria-label={isFavorited ? "Remove from Favorites" : "Add to Favorites"}
    >
      <Heart
        size={size === "sm" ? 14 : 16}
        fill={isFavorited ? "currentColor" : "none"}
        className={toggleFavorite.isPending ? "animate-pulse" : ""}
        aria-hidden="true"
      />
      {showLabel && (
        <span className="ml-2">
          {isFavorited ? "Favorited" : "Favorite"}
        </span>
      )}
    </Button>
  );
}
