import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useGames } from '@/hooks/useGames';
import { GameGrid } from '@/components/library/GameGrid';
import { GameList } from '@/components/library/GameList';
import { GameGridSkeleton } from '@/components/library/GameGridSkeleton';
import { GameListSkeleton } from '@/components/library/GameListSkeleton';
import { FilterPanel } from '@/components/search/FilterPanel';
import { CardSizeControl } from '@/components/common/CardSizeControl';
import { AddToPlaylistModal } from '@/components/playlist/AddToPlaylistModal';
import { useUIStore } from '@/store/ui';
import { useAddToFavorites, useRemoveFromFavorites, useFavoritesPlaylist } from '@/hooks/usePlaylists';
import { useDialog } from '@/contexts/DialogContext';

export function AnimationsView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const viewMode = useUIStore((state) => state.viewMode);
  const [isAddToPlaylistModalOpen, setIsAddToPlaylistModalOpen] = useState(false);
  const [selectedGameIds, setSelectedGameIds] = useState<string[]>([]);
  const { showToast } = useDialog();

  const addToFavorites = useAddToFavorites();
  const removeFromFavorites = useRemoveFromFavorites();
  const { data: favoritesPlaylist } = useFavoritesPlaylist();

  // Create a Set of favorited game IDs for quick lookup
  const favoritedGameIds = useMemo(() => {
    if (!favoritesPlaylist?.games) return new Set<string>();
    return new Set(favoritesPlaylist.games.map(game => game.id));
  }, [favoritesPlaylist]);

  // Force library to 'theatre' for animations
  const filters = {
    search: searchParams.get('search') || undefined,
    platform: searchParams.get('platform') || undefined,
    library: 'theatre' as const, // Always theatre for animations
    tags: searchParams.get('tags') || undefined,
    yearFrom: searchParams.get('yearFrom') ? parseInt(searchParams.get('yearFrom')!, 10) : undefined,
    yearTo: searchParams.get('yearTo') ? parseInt(searchParams.get('yearTo')!, 10) : undefined,
    sortBy: searchParams.get('sortBy') || 'title',
    sortOrder: (searchParams.get('sortOrder') || 'asc') as 'asc' | 'desc',
    page: parseInt(searchParams.get('page') || '1', 10),
    limit: 50,
    webPlayableOnly: searchParams.get('webPlayableOnly') !== 'false' // Default to true unless explicitly set to false
  };

  // Compute dynamic page title based on active filters
  const pageTitle = useMemo(() => {
    const parts: string[] = [];

    // Search query takes priority
    if (filters.search) {
      return `Search Animations for "${filters.search}"`;
    }

    // Platform filter
    if (filters.platform) {
      parts.push(`${filters.platform} Animations`);
    }

    // Tags filter
    if (filters.tags) {
      const tagList = filters.tags.split(';').map(t => t.trim()).join(', ');
      if (parts.length > 0) {
        parts.push(`tagged ${tagList}`);
      } else {
        parts.push(`Animations tagged ${tagList}`);
      }
    }

    // Year range filter
    if (filters.yearFrom || filters.yearTo) {
      let yearText = '';
      if (filters.yearFrom && filters.yearTo) {
        yearText = `from ${filters.yearFrom}-${filters.yearTo}`;
      } else if (filters.yearFrom) {
        yearText = `from ${filters.yearFrom} onwards`;
      } else if (filters.yearTo) {
        yearText = `up to ${filters.yearTo}`;
      }

      if (parts.length > 0) {
        parts.push(yearText);
      } else {
        parts.push(`Animations ${yearText}`);
      }
    }

    // Default title
    return parts.length > 0 ? parts.join(' ') : 'Browse Animations';
  }, [filters.search, filters.platform, filters.tags, filters.yearFrom, filters.yearTo]);

  const { data, isLoading, error } = useGames(filters);

  const handlePageChange = (newPage: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', newPage.toString());
    setSearchParams(newParams);
  };

  const handleAddToPlaylist = (gameId: string) => {
    setSelectedGameIds([gameId]);
    setIsAddToPlaylistModalOpen(true);
  };

  const handleToggleFavorite = async (gameId: string) => {
    const isFavorited = favoritedGameIds.has(gameId);

    try {
      if (isFavorited) {
        await removeFromFavorites.mutateAsync(gameId);
      } else {
        await addToFavorites.mutateAsync(gameId);
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      showToast('Failed to update favorites. Please try again.', 'error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header with Title and View Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{pageTitle}</h1>
          {isLoading ? (
            <div className="h-5 bg-muted rounded w-32 mt-1 animate-pulse"></div>
          ) : data && (
            <p className="text-sm text-muted-foreground mt-1">
              Found {data.total.toLocaleString()} animations
            </p>
          )}
        </div>

        {/* View Mode Controls - Right Side */}
        <div className="flex items-center gap-2">
          <CardSizeControl />
        </div>
      </div>

      {/* Filter Panel - Separate Section */}
      <div className="bg-card rounded-lg p-4 border border-border relative">
        <FilterPanel filters={filters} />
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 text-red-300">
          Error loading animations: {error.message}
        </div>
      )}

      {isLoading ? (
        viewMode === 'grid' ? <GameGridSkeleton /> : <GameListSkeleton />
      ) : data ? (
        <>
          {viewMode === 'grid' ? (
            <GameGrid
              games={data.data}
              onAddToPlaylist={handleAddToPlaylist}
              onToggleFavorite={handleToggleFavorite}
              favoritedGameIds={favoritedGameIds}
            />
          ) : (
            <GameList
              games={data.data}
              onAddToPlaylist={handleAddToPlaylist}
              onToggleFavorite={handleToggleFavorite}
              favoritedGameIds={favoritedGameIds}
            />
          )}

          {data.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <button
                onClick={() => handlePageChange(data.page - 1)}
                disabled={data.page === 1}
                className="px-4 py-2 bg-secondary rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-secondary/80 transition-colors"
              >
                Previous
              </button>
              <span className="px-4 py-2 bg-muted rounded-lg">
                Page {data.page} of {data.totalPages}
              </span>
              <button
                onClick={() => handlePageChange(data.page + 1)}
                disabled={data.page >= data.totalPages}
                className="px-4 py-2 bg-secondary rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-secondary/80 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : null}

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
