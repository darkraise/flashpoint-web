import { useState, useMemo, useEffect } from 'react';
import { ListPlus, Check } from 'lucide-react';
import { usePlaylists, useAddGamesToPlaylist, FAVORITES_PLAYLIST_ID } from '@/hooks/usePlaylists';
import { useDialog } from '@/contexts/DialogContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

interface AddToPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameIds: string[];
}

export function AddToPlaylistModal({ isOpen, onClose, gameIds }: AddToPlaylistModalProps) {
  const [selectedPlaylists, setSelectedPlaylists] = useState<string[]>([]);
  const { data: allPlaylists, isLoading } = usePlaylists();
  const addGames = useAddGamesToPlaylist();
  const { showToast } = useDialog();

  // Reset selection when gameIds change
  useEffect(() => {
    setSelectedPlaylists([]);
  }, [gameIds]);

  // Filter out playlists that already contain all the selected games
  // Also filter out the Favorites playlist
  const availablePlaylists = useMemo(() => {
    if (!allPlaylists) return [];

    return allPlaylists.filter(playlist => {
      // Exclude Favorites playlist
      if (playlist.id === FAVORITES_PLAYLIST_ID) return false;

      // Get playlist's game IDs
      const playlistGameIds = new Set(playlist.gameIds || []);

      // For single game: exclude if playlist already contains it
      if (gameIds.length === 1) {
        return !playlistGameIds.has(gameIds[0]);
      }

      // For multiple games: exclude if playlist already contains ALL of them
      const allGamesInPlaylist = gameIds.every(gameId => playlistGameIds.has(gameId));
      return !allGamesInPlaylist;
    });
  }, [allPlaylists, gameIds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedPlaylists.length === 0) {
      showToast('Please select at least one playlist', 'info');
      return;
    }

    try {
      // Add games to all selected playlists
      for (const playlistId of selectedPlaylists) {
        await addGames.mutateAsync({
          playlistId,
          gameIds
        });
      }

      setSelectedPlaylists([]);
      onClose();

      showToast(`Successfully added ${gameIds.length} game(s) to ${selectedPlaylists.length} playlist(s)`, 'success');
    } catch (error) {
      console.error('Failed to add games to playlist:', error);
      showToast('Failed to add games to playlist. Please try again.', 'error');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <ListPlus size={24} className="text-primary-400" />
            <DialogTitle>Add to Playlist</DialogTitle>
          </div>
          <DialogDescription>
            Adding {gameIds.length} game{gameIds.length !== 1 ? 's' : ''} to playlist
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Select Playlist
            </label>

            {isLoading ? (
              <div className="text-center py-4 text-gray-400">Loading playlists...</div>
            ) : availablePlaylists.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {availablePlaylists.map((playlist) => {
                  const isSelected = selectedPlaylists.includes(playlist.id);

                  return (
                    <label
                      key={playlist.id}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-primary-600'
                          : 'bg-gray-700 hover:bg-gray-600'
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked: boolean) => {
                          if (checked) {
                            setSelectedPlaylists([...selectedPlaylists, playlist.id]);
                          } else {
                            setSelectedPlaylists(selectedPlaylists.filter(id => id !== playlist.id));
                          }
                        }}
                      />
                      <div className="flex-1 flex items-center justify-between">
                        <p className="font-medium">{playlist.title}</p>
                        <p className="text-xs text-gray-400">
                          {playlist.gameIds?.length || 0} games
                        </p>
                      </div>
                      {isSelected && (
                        <Check size={18} className="text-white flex-shrink-0" />
                      )}
                    </label>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <p>
                  {gameIds.length === 1
                    ? 'This game is already in all your playlists'
                    : 'These games are already in all your playlists'}
                </p>
                <p className="text-sm mt-1">Create a new playlist to add them</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={selectedPlaylists.length === 0 || addGames.isPending}
            >
              {addGames.isPending
                ? 'Adding...'
                : selectedPlaylists.length > 0
                  ? `Add to ${selectedPlaylists.length} Playlist${selectedPlaylists.length !== 1 ? 's' : ''}`
                  : 'Add to Playlist'
              }
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
