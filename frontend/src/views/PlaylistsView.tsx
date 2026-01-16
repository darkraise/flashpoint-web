import { useState, useMemo } from 'react';
import { usePlaylists, FAVORITES_PLAYLIST_ID } from '@/hooks/usePlaylists';
import { Link } from 'react-router-dom';
import { List, Plus, Globe } from 'lucide-react';
import { CreatePlaylistModal } from '@/components/playlist/CreatePlaylistModal';
import { BrowseCommunityPlaylistsModal } from '@/components/playlist/BrowseCommunityPlaylistsModal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export function PlaylistsView() {
  const { data: allPlaylists, isLoading, error } = usePlaylists();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
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
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Playlists</h1>
        <div className="flex gap-3">
          <Button
            onClick={() => setIsBrowseModalOpen(true)}
            variant="secondary"
            className="gap-2"
          >
            <Globe size={20} />
            Browse Community Playlists
          </Button>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="gap-2"
          >
            <Plus size={20} />
            Create Playlist
          </Button>
        </div>
      </div>

      {playlists.length === 0 ? (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-muted rounded-full mb-4">
            <List size={48} className="text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">No Playlists Yet</h2>
          <p className="text-muted-foreground mb-6">
            Create your first playlist to organize your favorite games
          </p>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="gap-2 mx-auto"
          >
            <Plus size={20} />
            Create Your First Playlist
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {playlists.map((playlist) => (
            <Link
              key={playlist.id}
              to={`/playlists/${playlist.id}`}
            >
              <Card className="p-4 hover:ring-2 hover:ring-primary/40 hover:shadow-lg transition-all">
                <div className="flex items-start gap-3">
                  <div className="bg-accent p-2 rounded">
                    <List size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
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

      <CreatePlaylistModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      <BrowseCommunityPlaylistsModal
        isOpen={isBrowseModalOpen}
        onClose={() => setIsBrowseModalOpen(false)}
      />
    </div>
  );
}
