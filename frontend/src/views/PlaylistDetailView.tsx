import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePlaylist } from '@/hooks/usePlaylists';
import { useFavoriteGameIds } from '@/hooks/useFavorites';
import { ArrowLeft } from 'lucide-react';
import { GameGrid } from '@/components/library/GameGrid';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/auth';

export function PlaylistDetailView() {
  const { id } = useParams<{ id: string }>();
  const { data: playlist, isLoading, error } = usePlaylist(id!);
  const { isAuthenticated } = useAuthStore();

  // Fetch favorite game IDs for performance optimization
  const { data: favoriteGameIdsArray } = useFavoriteGameIds();
  const favoriteGameIds = useMemo(
    () => (favoriteGameIdsArray ? new Set(favoriteGameIdsArray) : undefined),
    [favoriteGameIdsArray]
  );

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        <p className="mt-4 text-gray-400">Loading playlist...</p>
      </div>
    );
  }

  if (error || !playlist) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400">Error loading playlist</p>
        <Link to="/flashpoint-playlists" className="text-primary-500 hover:underline mt-4 inline-block">
          Back to playlists
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <Link
        to="/flashpoint-playlists"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-200 transition-colors"
      >
        <ArrowLeft size={20} />
        Back to playlists
      </Link>

      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold">{playlist.title}</h1>
          <Badge variant="secondary">Flashpoint</Badge>
        </div>
        {playlist.description ? (
          <p className="text-muted-foreground">{playlist.description}</p>
        ) : null}
        {playlist.author ? (
          <p className="text-sm text-muted-foreground mt-1">By {playlist.author}</p>
        ) : null}
      </div>

      {playlist.games && playlist.games.length > 0 ? (
        <>
          <div className="text-sm text-gray-400">
            {playlist.games.length} {playlist.games.length === 1 ? 'game' : 'games'}
          </div>
          <GameGrid
            games={playlist.games}
            favoriteGameIds={isAuthenticated ? favoriteGameIds : undefined}
            breadcrumbContext={{ label: playlist.title, href: `/flashpoint-playlists/${id}` }}
          />
        </>
      ) : (
        <div className="text-center py-12 text-gray-400">
          No games in this playlist
        </div>
      )}
    </div>
  );
}
