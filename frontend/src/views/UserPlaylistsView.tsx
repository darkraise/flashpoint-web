import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlaylistCard } from '@/components/playlist/PlaylistCard';
import { CreateUserPlaylistDialog } from '@/components/playlist/CreateUserPlaylistDialog';
import { SharePlaylistDialog } from '@/components/playlist/SharePlaylistDialog';
import { PaginationWithInfo } from '@/components/ui/pagination';
import {
  useUserPlaylists,
  useUserPlaylistStats,
  useDeleteUserPlaylist,
} from '@/hooks/useUserPlaylists';
import { UserPlaylist } from '@/types/playlist';
import { ListVideo, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { AxiosError } from 'axios';
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

const PAGE_SIZE = 50;

export function UserPlaylistsView() {
  const [page, setPage] = useState(1);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<UserPlaylist | null>(null);
  const [deletingPlaylist, setDeletingPlaylist] = useState<UserPlaylist | null>(null);
  const [sharingPlaylist, setSharingPlaylist] = useState<UserPlaylist | null>(null);

  const { data, isLoading, error } = useUserPlaylists(page, PAGE_SIZE);
  const playlists = data?.data ?? [];
  const pagination = data?.pagination;
  const { data: stats } = useUserPlaylistStats();
  const deletePlaylist = useDeleteUserPlaylist();

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEdit = (playlist: UserPlaylist) => {
    setEditingPlaylist(playlist);
    setIsCreateDialogOpen(true);
  };

  const handleDelete = (playlist: UserPlaylist) => {
    setDeletingPlaylist(playlist);
  };

  const handleShare = (playlist: UserPlaylist) => {
    setSharingPlaylist(playlist);
  };

  const confirmDelete = async () => {
    if (!deletingPlaylist) return;

    try {
      await deletePlaylist.mutateAsync(deletingPlaylist.id);
      toast.success('Playlist deleted successfully');
      setDeletingPlaylist(null);
    } catch (error: unknown) {
      const axiosError = error instanceof AxiosError ? error : null;
      toast.error(axiosError?.response?.data?.error?.message || 'Failed to delete playlist');
    }
  };

  const handleCloseDialog = () => {
    setIsCreateDialogOpen(false);
    setEditingPlaylist(null);
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
    return (
      <div className="bg-destructive/10 border border-destructive rounded-lg p-4 text-destructive">
        Error loading playlists: {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 border border-primary rounded-lg">
            <ListVideo size={32} className="text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">My Playlists</h1>
            <p className="text-muted-foreground mt-1">
              {stats ? (
                <>
                  {stats.totalPlaylists} {stats.totalPlaylists === 1 ? 'playlist' : 'playlists'}{' '}
                  with {stats.totalGames} {stats.totalGames === 1 ? 'game' : 'games'}
                </>
              ) : (
                <>
                  {playlists.length} {playlists.length === 1 ? 'playlist' : 'playlists'}
                </>
              )}
            </p>
          </div>
        </div>

        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus size={18} className="mr-2" />
          Create Playlist
        </Button>
      </div>

      {playlists.length === 0 && !isLoading ? (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-muted rounded-full mb-4">
            <ListVideo size={48} className="text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">No Playlists Yet</h2>
          <p className="text-muted-foreground mb-6">
            Create your first playlist to organize your favorite games
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus size={18} className="mr-2" />
            Create Your First Playlist
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 py-2">
            {playlists.map((playlist) => (
              <PlaylistCard
                key={playlist.id}
                playlist={playlist}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onShare={handleShare}
              />
            ))}
          </div>

          {pagination && pagination.totalPages > 1 ? (
            <div className="mt-8">
              <PaginationWithInfo
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                pageSize={pagination.limit}
                totalItems={pagination.total}
                onPageChange={handlePageChange}
              />
            </div>
          ) : null}
        </>
      )}

      <CreateUserPlaylistDialog
        isOpen={isCreateDialogOpen}
        onClose={handleCloseDialog}
        playlist={editingPlaylist || undefined}
      />

      {sharingPlaylist ? (
        <SharePlaylistDialog
          isOpen={!!sharingPlaylist}
          onClose={() => setSharingPlaylist(null)}
          playlist={sharingPlaylist}
        />
      ) : null}

      <AlertDialog
        open={!!deletingPlaylist}
        onOpenChange={(open: boolean) => !open && setDeletingPlaylist(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Playlist</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingPlaylist?.title}"? This action cannot be
              undone. All games in this playlist will remain in your library.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePlaylist.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deletePlaylist.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deletePlaylist.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
