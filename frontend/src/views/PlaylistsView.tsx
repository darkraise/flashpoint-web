import { useState, useMemo } from 'react';
import { usePlaylists, FAVORITES_PLAYLIST_ID } from '@/hooks/usePlaylists';
import { Link } from 'react-router-dom';
import { List, Globe } from 'lucide-react';
import { BrowseCommunityPlaylistsModal } from '@/components/playlist/BrowseCommunityPlaylistsModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

export function PlaylistsView() {
  const { data: allPlaylists, isLoading, error } = usePlaylists();
  const [isBrowseModalOpen, setIsBrowseModalOpen] = useState(false);

  // Filter out the Favorites playlist
  const playlists = useMemo(() => {
    if (!allPlaylists) return [];
    return allPlaylists.filter(playlist => playlist.id !== FAVORITES_PLAYLIST_ID);
  }, [allPlaylists]);

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="mt-4 text-muted-foreground">Loading playlists...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-400">
        Error loading playlists
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Flashpoint Playlists</h1>
        <Button
          onClick={() => setIsBrowseModalOpen(true)}
          variant="secondary"
          className="gap-2"
        >
          <Globe size={20} />
          Browse Community Playlists
        </Button>
      </div>

      {playlists.length === 0 ? (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-muted rounded-full mb-4">
            <List size={48} className="text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">No Flashpoint Playlists</h2>
          <p className="text-muted-foreground mb-6">
            No official Flashpoint playlists found. Check your Flashpoint installation or browse community playlists.
          </p>
          <Button
            onClick={() => setIsBrowseModalOpen(true)}
            variant="secondary"
            className="gap-2 mx-auto"
          >
            <Globe size={20} />
            Browse Community Playlists
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {playlists.map((playlist) => (
            <Link
              key={playlist.id}
              to={`/flashpoint-playlists/${playlist.id}`}
            >
              <Card className="p-4 hover:ring-2 hover:ring-primary/40 hover:shadow-lg transition-all relative">
                <Badge
                  variant="secondary"
                  className="absolute top-2 right-2 text-xs"
                >
                  Flashpoint
                </Badge>
                <div className="flex items-start gap-3">
                  <div className="bg-accent p-2 rounded">
                    <List size={24} />
                  </div>
                  <div className="flex-1 min-w-0 pr-20">
                    <h3 className="font-semibold mb-1">{playlist.title}</h3>
                    {playlist.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {playlist.description}
                      </p>
                    )}
                    {playlist.gameIds && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {playlist.gameIds.length} games
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <BrowseCommunityPlaylistsModal
        isOpen={isBrowseModalOpen}
        onClose={() => setIsBrowseModalOpen(false)}
      />
    </div>
    </ErrorBoundary>
  );
}
