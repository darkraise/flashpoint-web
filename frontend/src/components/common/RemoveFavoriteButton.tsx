import { HeartOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToggleFavorite } from "@/hooks/useFavorites";
import { toast } from "sonner";
import { getErrorMessage } from "@/types/api-error";

interface RemoveFavoriteButtonProps {
  gameId: string;
  size?: "sm" | "default" | "lg" | "icon";
  className?: string;
  showLabel?: boolean;
}

export function RemoveFavoriteButton({
  gameId,
  size = "sm",
  className = "",
  showLabel = false
}: RemoveFavoriteButtonProps) {
  const toggleFavorite = useToggleFavorite();

  const handleRemove = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    toggleFavorite.mutate(gameId, {
      onSuccess: () => {
        toast.success("Removed from favorites");
      },
      onError: (error: unknown) => {
        toast.error(getErrorMessage(error) || "Failed to remove favorite");
      }
    });
  };

  return (
    <Button
      size={size}
      variant="destructive"
      onClick={handleRemove}
      disabled={toggleFavorite.isPending}
      className={`backdrop-blur-sm ${className}`}
      title="Remove from Favorites"
      aria-label="Remove from Favorites"
    >
      <HeartOff
        size={size === "sm" ? 14 : 16}
        className={toggleFavorite.isPending ? "animate-pulse" : ""}
        aria-hidden="true"
      />
      {showLabel && <span className="ml-2">Remove</span>}
    </Button>
  );
}
