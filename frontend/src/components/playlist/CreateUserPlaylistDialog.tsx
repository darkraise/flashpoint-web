import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useCreateUserPlaylist, useUpdateUserPlaylist } from '@/hooks/useUserPlaylists';
import { UserPlaylist } from '@/types/playlist';
import { IconSelector } from './IconSelector';
import type { PlaylistIconName } from '@/lib/playlistIcons';
import { toast } from 'sonner';
import { getErrorMessage } from '@/types/api-error';

interface CreateUserPlaylistDialogProps {
  isOpen: boolean;
  onClose: () => void;
  playlist?: UserPlaylist; // If provided, we're editing
  onSuccess?: (playlist: UserPlaylist) => void; // Called after successful create/update
}

export function CreateUserPlaylistDialog({
  isOpen,
  onClose,
  playlist,
  onSuccess,
}: CreateUserPlaylistDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState<PlaylistIconName | null>(null);

  const createPlaylist = useCreateUserPlaylist();
  const updatePlaylist = useUpdateUserPlaylist();

  const isEditing = !!playlist;

  // Populate form when editing
  useEffect(() => {
    if (playlist) {
      setTitle(playlist.title);
      setDescription(playlist.description || '');
      setIcon(playlist.icon || null);
    } else {
      setTitle('');
      setDescription('');
      setIcon(null);
    }
  }, [playlist, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Playlist title is required');
      return;
    }

    try {
      let result: UserPlaylist;

      if (isEditing && playlist) {
        result = await updatePlaylist.mutateAsync({
          id: playlist.id,
          data: {
            title: title.trim(),
            description: description.trim() || undefined,
            icon: icon || undefined,
          },
        });
        toast.success('Playlist updated successfully');
      } else {
        result = await createPlaylist.mutateAsync({
          title: title.trim(),
          description: description.trim() || undefined,
          icon: icon || undefined,
        });
        toast.success('Playlist created successfully');
      }

      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess(result);
      } else {
        onClose();
      }
    } catch (error) {
      toast.error(
        getErrorMessage(error) || `Failed to ${isEditing ? 'update' : 'create'} playlist`
      );
    }
  };

  const handleClose = () => {
    if (!createPlaylist.isPending && !updatePlaylist.isPending) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Playlist' : 'Create New Playlist'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update your playlist details below.'
              : 'Create a new playlist to organize your favorite games.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <DialogBody className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder="My Awesome Playlist"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={255}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="A collection of my favorite games..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <IconSelector
                value={icon}
                onChange={setIcon}
                label="Icon (Optional)"
                disabled={createPlaylist.isPending || updatePlaylist.isPending}
              />
              <p className="text-xs text-muted-foreground">
                Choose an icon to represent your playlist
              </p>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createPlaylist.isPending || updatePlaylist.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createPlaylist.isPending || updatePlaylist.isPending}>
              {createPlaylist.isPending || updatePlaylist.isPending
                ? isEditing
                  ? 'Updating...'
                  : 'Creating...'
                : isEditing
                  ? 'Update Playlist'
                  : 'Create Playlist'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
