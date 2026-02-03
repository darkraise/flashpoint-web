import { ListPlus } from 'lucide-react';
import { logger } from '@/lib/logger';
import { useCreatePlaylist } from '@/hooks/usePlaylists';
import { useDialog } from '@/contexts/DialogContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from '@/components/ui/dialog';

const playlistSchema = z.object({
  title: z.string().min(1, 'Title is required').trim(),
  description: z.string().optional(),
  author: z.string().optional(),
  library: z.string(),
});

type PlaylistFormValues = z.infer<typeof playlistSchema>;

interface CreatePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreatePlaylistModal({ isOpen, onClose }: CreatePlaylistModalProps) {
  const createPlaylist = useCreatePlaylist();
  const { showToast } = useDialog();

  const form = useForm<PlaylistFormValues>({
    resolver: zodResolver(playlistSchema),
    defaultValues: {
      title: '',
      description: '',
      author: '',
      library: 'arcade',
    },
  });

  const onSubmit = async (values: PlaylistFormValues) => {
    try {
      await createPlaylist.mutateAsync({
        title: values.title,
        description: values.description?.trim() || undefined,
        author: values.author?.trim() || undefined,
        library: values.library,
      });

      // Reset form
      form.reset();

      showToast('Playlist created successfully', 'success');
      onClose();
    } catch (error) {
      logger.error('Failed to create playlist:', error);
      showToast('Failed to create playlist. Please try again.', 'error');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <ListPlus size={24} className="text-primary-400" />
            <DialogTitle>Create Playlist</DialogTitle>
          </div>
          <DialogDescription>
            Create a new playlist to organize your favorite games.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Playlist Title *</FormLabel>
                    <FormControl>
                      <Input placeholder="My Awesome Playlist" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="A collection of my favorite games..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="author"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Author</FormLabel>
                    <FormControl>
                      <Input placeholder="Your name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="library"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Library</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select library" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="arcade">Arcade</SelectItem>
                        <SelectItem value="theatre">Theatre</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="secondary" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createPlaylist.isPending}>
                  {createPlaylist.isPending ? 'Creating...' : 'Create Playlist'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
