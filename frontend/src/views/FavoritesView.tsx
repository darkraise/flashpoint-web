import { useState, useMemo } from 'react';
import { GameGrid } from '@/components/library/GameGrid';
import { GameList } from '@/components/library/GameList';
import { CardSizeControl } from '@/components/common/CardSizeControl';
import { AddToPlaylistModal } from '@/components/playlist/AddToPlaylistModal';
import { useUIStore } from '@/store/ui';
import { useFavoritesPlaylist, useRemoveFromFavorites } from '@/hooks/usePlaylists';
import { useDialog } from '@/contexts/DialogContext';
import { Heart } from 'lucide-react';

export function FavoritesView() {
  const viewMode = useUIStore((state) => state.viewMode);
  const [isAddToPlaylistModalOpen, setIsAddToPlaylistModalOpen] = useState(false);
  const [selectedGameIds, setSelectedGameIds] = useState<string[]>([]);
  const { showConfirm, showToast } = useDialog();

  const { data: favoritesPlaylist, isLoading, error } = useFavoritesPlaylist();
  const removeFromFavorites = useRemoveFromFavorites();

  // Create a Set of all favorited game IDs
  const favoritedGameIds = useMemo(() => {
    if (!favoritesPlaylist?.games) return new Set<string>();
    return new Set(favoritesPlaylist.games.map(game => game.id));
  }, [favoritesPlaylist]);

  const handleAddToPlaylist = (gameId: string) => {
    setSelectedGameIds([gameId]);
    setIsAddToPlaylistModalOpen(true);
  };

  const handleToggleFavorite = async (gameId: string) => {
    // Show confirmation dialog before removing
    const gameName = favoritesPlaylist?.games?.find(g => g.id === gameId)?.title || 'this game';
    const confirmed = await showConfirm({
      title: 'Remove from Favorites',
      message: `Are you sure you want to remove "${gameName}" from your favorites?`,
      confirmText: 'Remove',
      cancelText: 'Cancel',
      variant: 'danger'
    });

    if (!confirmed) {
      return;
    }

    try {
      await removeFromFavorites.mutateAsync(gameId);
      showToast('Game removed from favorites', 'success');
    } catch (error) {
      console.error('Failed to remove from favorites:', error);
      showToast('Failed to remove from favorites. Please try again.', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="mt-4 text-muted-foreground">Loading favorites...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 text-red-300">
        Error loading favorites: {error.message}
      </div>
    );
  }

  const games = favoritesPlaylist?.games || [];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-rose-500 rounded-lg">
            <Heart size={32} fill="currentColor" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Favorites</h1>
            <p className="text-muted-foreground mt-1">
              {games.length} {games.length === 1 ? 'game' : 'games'} in your favorites
            </p>
          </div>
        </div>

        {/* View Mode Controls */}
        <div className="flex items-center gap-2">
          <CardSizeControl />
        </div>
      </div>

      {/* Games Display */}
      {games.length === 0 ? (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-muted rounded-full mb-4">
            <Heart size={48} className="text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">No Favorites Yet</h2>
          <p className="text-muted-foreground mb-6">
            Start adding games to your favorites by clicking the heart icon on any game
          </p>
        </div>
      ) : (
        <>
          {viewMode === 'grid' ? (
            <GameGrid
              games={games}
              onAddToPlaylist={handleAddToPlaylist}
              onToggleFavorite={handleToggleFavorite}
              favoritedGameIds={favoritedGameIds}
              showFavoriteOnHoverOnly={true}
            />
          ) : (
            <GameList
              games={games}
              onAddToPlaylist={handleAddToPlaylist}
              onToggleFavorite={handleToggleFavorite}
              favoritedGameIds={favoritedGameIds}
              showFavoriteOnHoverOnly={true}
            />
          )}
        </>
      )}

      <AddToPlaylistModal
        isOpen={isAddToPlaylistModalOpen}
        onClose={() => {
          setIsAddToPlaylistModalOpen(false);
          setSelectedGameIds([]);
        }}
        gameIds={selectedGameIds}
      />
    </div>
  );
}
