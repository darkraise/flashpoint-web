import { useState } from 'react';
import { Plus, ListVideo } from 'lucide-react';
import { useUserPlaylists, useAddGamesToUserPlaylist } from '@/hooks/useUserPlaylists';
import { useAuthStore } from '@/store/auth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogBody,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CreateUserPlaylistDialog } from './CreateUserPlaylistDialog';
import { UserPlaylist } from '@/types/playlist';
import { toast } from 'sonner';
import { getErrorMessage } from '@/types/api-error';

interface AddToPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameId: string;
  gameTitle?: string;
}

export function AddToPlaylistModal({
  isOpen,
  onClose,
  gameId,
  gameTitle,
}: AddToPlaylistModalProps) {
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [selectedPlaylists, setSelectedPlaylists] = useState<Set<number>>(new Set());

  const { isAuthenticated } = useAuthStore();
  const { data: playlists = [], isLoading } = useUserPlaylists(isOpen);
  const addGamesMutation = useAddGamesToUserPlaylist();

  const handleOpenChange = (open: boolean) => {
    if (open) {
      if (!isAuthenticated) {
        toast.error('Please log in to add games to playlists');
        onClose();
        return;
      }

      setSelectedPlaylists(new Set());
    }
    if (!open) {
      onClose();
    }
  };

  const togglePlaylist = (playlistId: number) => {
    const newSelected = new Set(selectedPlaylists);

    if (newSelected.has(playlistId)) {
      newSelected.delete(playlistId);
    } else {
      newSelected.add(playlistId);
    }

    setSelectedPlaylists(newSelected);
  };

  const handleSave = async () => {
    if (selectedPlaylists.size === 0) {
      toast.info('Please select at least one playlist');
      return;
    }

    try {
      const promises = Array.from(selectedPlaylists).map((playlistId) =>
        addGamesMutation.mutateAsync({ id: playlistId, gameIds: [gameId] })
      );

      await Promise.all(promises);

      toast.success(
        `Added to ${selectedPlaylists.size} playlist${selectedPlaylists.size > 1 ? 's' : ''}`
      );

      onClose();
    } catch (error) {
      toast.error(getErrorMessage(error) || 'Failed to add to playlists');
    }
  };

  const handleCreatePlaylistSuccess = (playlist: UserPlaylist) => {
    setIsCreatingPlaylist(false);
    const newSelected = new Set(selectedPlaylists);
    newSelected.add(playlist.id);
    setSelectedPlaylists(newSelected);

    toast.success('Playlist created');
  };

  return (
    <>
      <Dialog open={isOpen && !isCreatingPlaylist} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add to Playlist</DialogTitle>
            <DialogDescription>
              {gameTitle
                ? `Select playlists to add "${gameTitle}" to`
                : 'Select playlists for this game'}
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => setIsCreatingPlaylist(true)}
            >
              <Plus size={18} />
              Create New Playlist
            </Button>

            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading playlists...</div>
            ) : playlists.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ListVideo size={48} className="mx-auto mb-2 opacity-50" />
                <p>No playlists yet</p>
                <p className="text-sm">Create your first playlist to get started</p>
              </div>
            ) : (
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-2">
                  {playlists.map((playlist) => {
                    const isSelected = selectedPlaylists.has(playlist.id);

                    return (
                      <div
                        key={playlist.id}
                        className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent transition-colors cursor-pointer"
                        onClick={() => togglePlaylist(playlist.id)}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => togglePlaylist(playlist.id)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{playlist.title}</p>
                          {playlist.description ? (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {playlist.description}
                            </p>
                          ) : null}
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {playlist.gameCount} {playlist.gameCount === 1 ? 'game' : 'games'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={selectedPlaylists.size === 0 || addGamesMutation.isPending}
              >
                {addGamesMutation.isPending ? 'Adding...' : 'Add to Playlists'}
              </Button>
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>

      <CreateUserPlaylistDialog
        isOpen={isCreatingPlaylist}
        onClose={() => setIsCreatingPlaylist(false)}
        onSuccess={handleCreatePlaylistSuccess}
      />
    </>
  );
}
