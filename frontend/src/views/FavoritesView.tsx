import { useMemo, useState } from 'react';
import { GameGrid } from '@/components/library/GameGrid';
import { GameList } from '@/components/library/GameList';
import { CardSizeControl } from '@/components/common/CardSizeControl';
import { useUIStore } from '@/store/ui';
import { useFavoriteGames } from '@/hooks/useFavorites';
import { Heart, ArrowDownAZ, Calendar } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export function FavoritesView() {
  const viewMode = useUIStore((state) => state.viewMode);
  const [sortBy, setSortBy] = useState<'title' | 'dateAdded'>('dateAdded');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const {
    data: games = [],
    isLoading,
    error,
  } = useFavoriteGames(undefined, undefined, sortBy, sortOrder);

  const handleSortChange = (value: string) => {
    const [newSortBy, newSortOrder] = value.split('-') as ['title' | 'dateAdded', 'asc' | 'desc'];
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
  };

  const currentSortValue = `${sortBy}-${sortOrder}`;

  // All games in this view are favorites by definition
  const favoriteGameIds = useMemo(() => new Set(games.map((game) => game.id)), [games]);

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
        Error loading favorites: {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 border border-primary rounded-lg">
            <Heart size={32} className="text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Favorites</h1>
            <p className="text-muted-foreground mt-1">
              {games.length} {games.length === 1 ? 'game' : 'games'} in your favorites
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {games.length > 0 ? (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Label htmlFor="sort-select" className="text-sm whitespace-nowrap hidden sm:inline">
                Sort by:
              </Label>
              <Select value={currentSortValue} onValueChange={handleSortChange}>
                <SelectTrigger id="sort-select" className="w-full sm:w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dateAdded-desc">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} />
                      <span>Date Added (Newest)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="dateAdded-asc">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} />
                      <span>Date Added (Oldest)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="title-asc">
                    <div className="flex items-center gap-2">
                      <ArrowDownAZ size={14} />
                      <span>Title (A-Z)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="title-desc">
                    <div className="flex items-center gap-2">
                      <ArrowDownAZ size={14} className="rotate-180" />
                      <span>Title (Z-A)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <CardSizeControl />
        </div>
      </div>

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
              favoriteGameIds={favoriteGameIds}
              isFavoritePage={true}
              breadcrumbContext={{ label: 'Favorites', href: '/favorites' }}
            />
          ) : (
            <GameList
              games={games}
              favoriteGameIds={favoriteGameIds}
              isFavoritePage={true}
              breadcrumbContext={{ label: 'Favorites', href: '/favorites' }}
            />
          )}
        </>
      )}
    </div>
  );
}
