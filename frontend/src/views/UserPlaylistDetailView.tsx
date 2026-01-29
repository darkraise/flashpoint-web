import { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  useUserPlaylist,
  useUserPlaylistGames,
  useDeleteUserPlaylist,
} from '@/hooks/useUserPlaylists';
import { useFavoriteGameIds } from '@/hooks/useFavorites';
import { ArrowLeft, Edit, Trash2, MoreVertical, Share2 } from 'lucide-react';
import { GameGrid } from '@/components/library/GameGrid';
import { GameList } from '@/components/library/GameList';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ViewOptions } from '@/components/common/ViewOptions';
import { CreateUserPlaylistDialog } from '@/components/playlist/CreateUserPlaylistDialog';
import { SharePlaylistDialog } from '@/components/playlist/SharePlaylistDialog';
import { PlaylistIcon } from '@/components/playlist/PlaylistIcon';
import { useUIStore } from '@/store/ui';
import { useAuthStore } from '@/store/auth';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

export function UserPlaylistDetailView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const viewMode = useUIStore((state) => state.viewMode);
  const { isAuthenticated } = useAuthStore();

  const playlistId = id ? parseInt(id, 10) : null;

  const { data: playlist, isLoading: isLoadingPlaylist, error: playlistError } = useUserPlaylist(playlistId);
  const { data: playlistGames = [], isLoading: isLoadingGames } = useUserPlaylistGames(playlistId);

  // Fetch favorite game IDs for performance optimization
  const { data: favoriteGameIdsArray } = useFavoriteGameIds();
  const favoriteGameIds = useMemo(
    () => (favoriteGameIdsArray ? new Set(favoriteGameIdsArray) : undefined),
    [favoriteGameIdsArray]
  );

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  const deletePlaylist = useDeleteUserPlaylist();

  const isLoading = isLoadingPlaylist || isLoadingGames;

  const handleDelete = async () => {
    if (!playlistId) return;

    try {
      await deletePlaylist.mutateAsync(playlistId);
      toast.success('Playlist deleted successfully');
      navigate('/playlists');
    } catch (error: any) {
      toast.error(
        error?.response?.data?.error?.message || 'Failed to delete playlist'
      );
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="mt-4 text-muted-foreground">Loading playlist...</p>
      </div>
    );
  }

  if (playlistError || !playlist) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Error loading playlist</p>
        <Link
          to="/playlists"
          className="text-primary hover:underline mt-4 inline-block"
        >
          Back to playlists
        </Link>
      </div>
    );
  }

  // playlistGames is already Game[] from the API
  const games = playlistGames;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Back Button */}
      <Link
        to="/playlists"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={20} />
        Back to playlists
      </Link>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex gap-4">
          {/* Playlist Icon */}
          {playlist.icon && (
            <div className="flex-shrink-0">
              <div className="p-4 bg-primary/20 rounded-xl border-2 border-primary/30">
                <PlaylistIcon
                  iconName={playlist.icon}
                  size={48}
                  className="text-primary"
                  aria-label={`${playlist.title} icon`}
                />
              </div>
            </div>
          )}

          {/* Playlist Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{playlist.title}</h1>
              {playlist.isPublic && (
                <Badge variant="secondary">Shared</Badge>
              )}
            </div>
            {playlist.description && (
              <p className="text-muted-foreground">{playlist.description}</p>
            )}
            <p className="text-sm text-muted-foreground mt-2">
              {playlist.gameCount} {playlist.gameCount === 1 ? 'game' : 'games'}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <ViewOptions />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreVertical size={18} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
                <Edit size={16} className="mr-2" />
                Edit Playlist
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsShareDialogOpen(true)}>
                <Share2 size={16} className="mr-2" />
                Share Playlist
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setIsDeleteDialogOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 size={16} className="mr-2" />
                Delete Playlist
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Games Display */}
      {games.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground">No games in this playlist yet</p>
          <p className="text-sm text-muted-foreground mt-2">
            Add games by clicking the "Add to Playlist" button on any game
          </p>
        </div>
      ) : (
        <>
          {viewMode === 'grid' ? (
            <GameGrid
              games={games}
              favoriteGameIds={isAuthenticated ? favoriteGameIds : undefined}
            />
          ) : (
            <GameList
              games={games}
              favoriteGameIds={isAuthenticated ? favoriteGameIds : undefined}
            />
          )}
        </>
      )}

      {/* Edit Dialog */}
      <CreateUserPlaylistDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        playlist={playlist}
      />

      {/* Share Dialog */}
      <SharePlaylistDialog
        isOpen={isShareDialogOpen}
        onClose={() => setIsShareDialogOpen(false)}
        playlist={playlist}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Playlist</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{playlist.title}"? This action cannot be
              undone. All games in this playlist will remain in your library.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePlaylist.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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
