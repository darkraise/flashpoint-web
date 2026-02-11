import { useState, useMemo } from 'react';
import { usePlaylists, FAVORITES_PLAYLIST_ID, useDeletePlaylist } from '@/hooks/usePlaylists';
import { Link } from 'react-router-dom';
import { List, Globe, Trash2, MoreVertical } from 'lucide-react';
import { BrowseCommunityPlaylistsModal } from '@/components/playlist/BrowseCommunityPlaylistsModal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import type { Playlist } from '@/types/game';

export function PlaylistsView() {
  const { data: allPlaylists, isLoading, error } = usePlaylists();
  const deletePlaylist = useDeletePlaylist();
  const [isBrowseModalOpen, setIsBrowseModalOpen] = useState(false);
  const [playlistToDelete, setPlaylistToDelete] = useState<Playlist | null>(null);

  const playlists = useMemo(() => {
    if (!allPlaylists) return [];
    return allPlaylists.filter((playlist) => playlist.id !== FAVORITES_PLAYLIST_ID);
  }, [allPlaylists]);

  const handleDeleteClick = (e: React.MouseEvent, playlist: Playlist) => {
    e.preventDefault();
    e.stopPropagation();
    setPlaylistToDelete(playlist);
  };

  const handleConfirmDelete = async () => {
    if (!playlistToDelete) return;

    try {
      await deletePlaylist.mutateAsync(playlistToDelete.id);
      toast.success('Playlist deleted successfully');
      setPlaylistToDelete(null);
    } catch {
      toast.error('Failed to delete playlist');
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="mt-4 text-muted-foreground">Loading playlists...</p>
      </div>
    );
  }

  if (error) {
    return <div className="text-center py-12 text-destructive">Error loading playlists</div>;
  }

  return (
    <ErrorBoundary>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Flashpoint Playlists</h1>
          <Button onClick={() => setIsBrowseModalOpen(true)} variant="secondary" className="gap-2">
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
              No official Flashpoint playlists found. Check your Flashpoint installation or browse
              community playlists.
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
              <Card
                key={playlist.id}
                className="p-4 hover:ring-2 hover:ring-primary/40 hover:shadow-lg transition-all group"
              >
                <div className="flex items-start gap-3">
                  <Link to={`/flashpoint-playlists/${playlist.id}`} className="flex-shrink-0">
                    <div className="bg-accent p-2 rounded">
                      <List size={24} />
                    </div>
                  </Link>
                  <Link to={`/flashpoint-playlists/${playlist.id}`} className="flex-1 min-w-0">
                    <h3 className="font-semibold mb-1">{playlist.title}</h3>
                    {playlist.description ? (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {playlist.description}
                      </p>
                    ) : null}
                    {playlist.gameIds ? (
                      <p className="text-xs text-muted-foreground mt-2">
                        {playlist.gameIds.length} games
                      </p>
                    ) : null}
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="More options"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical size={16} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => handleDeleteClick(e, playlist)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 size={16} className="mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>
            ))}
          </div>
        )}

        <BrowseCommunityPlaylistsModal
          isOpen={isBrowseModalOpen}
          onClose={() => setIsBrowseModalOpen(false)}
        />

        <AlertDialog open={!!playlistToDelete} onOpenChange={() => setPlaylistToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Playlist</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{playlistToDelete?.title}"? This action cannot be
                undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ErrorBoundary>
  );
}
