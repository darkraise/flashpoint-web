import { useState, useMemo } from 'react';
import { Globe, Download, Loader2, Search } from 'lucide-react';
import { useCommunityPlaylists, useDownloadCommunityPlaylist } from '@/hooks/useCommunityPlaylists';
import { usePlaylists } from '@/hooks/usePlaylists';
import { useDialog } from '@/contexts/DialogContext';
import type { CommunityPlaylist } from '@/hooks/useCommunityPlaylists';
import { isApiError } from '@/types/api-error';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface BrowseCommunityPlaylistsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BrowseCommunityPlaylistsModal({
  isOpen,
  onClose,
}: BrowseCommunityPlaylistsModalProps) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadingUrl, setDownloadingUrl] = useState<string | null>(null);
  const [downloadedInSession, setDownloadedInSession] = useState<Set<string>>(new Set());

  const { data, isLoading, error, refetch } = useCommunityPlaylists();
  // Fetch all playlists for duplicate detection (use high limit)
  const { data: localPlaylistsData } = usePlaylists(1, 1000);
  const localPlaylists = localPlaylistsData?.data ?? [];
  const downloadMutation = useDownloadCommunityPlaylist();
  const { showToast } = useDialog();

  const downloadedTitles = useMemo(() => {
    const titles = new Set<string>();
    localPlaylists.forEach((playlist) => {
      titles.add(playlist.title.toLowerCase().trim());
    });
    downloadedInSession.forEach((title) => {
      titles.add(title.toLowerCase().trim());
    });
    return titles;
  }, [localPlaylists, downloadedInSession]);

  const filteredPlaylists = useMemo(() => {
    if (!data?.categories) return [];

    let allPlaylists: CommunityPlaylist[] = [];

    data.categories.forEach((category) => {
      allPlaylists.push(...category.playlists);
    });

    if (selectedCategory !== 'all') {
      allPlaylists = allPlaylists.filter((p) => p.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      allPlaylists = allPlaylists.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.author.toLowerCase().includes(query)
      );
    }

    allPlaylists = allPlaylists.filter((p) => !downloadedTitles.has(p.name.toLowerCase().trim()));

    return allPlaylists;
  }, [data, selectedCategory, searchQuery, downloadedTitles]);

  const categories = useMemo(() => {
    if (!data?.categories) return [];
    return data.categories.map((cat) => cat.name);
  }, [data]);

  const handleDownload = async (playlist: CommunityPlaylist) => {
    setDownloadingUrl(playlist.downloadUrl);
    try {
      await downloadMutation.mutateAsync(playlist.downloadUrl);

      setDownloadedInSession((prev) => new Set([...prev, playlist.name]));

      showToast(`"${playlist.name}" downloaded successfully!`, 'success');
    } catch (error) {
      if (isApiError(error) && error.response?.status === 409) {
        showToast('You already have this playlist', 'info');
        setDownloadedInSession((prev) => new Set([...prev, playlist.name]));
      } else {
        showToast('Failed to download playlist', 'error');
      }
    } finally {
      setDownloadingUrl(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent className="max-w-4xl flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Globe size={24} className="text-primary" />
            <DialogTitle>Browse Community Playlists</DialogTitle>
          </div>
          <DialogDescription>
            Discover and download playlists created by the Flashpoint community
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="flex flex-col">
          <div className="flex gap-3 mb-4">
            <div className="flex-1">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground z-10"
              />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search playlists..."
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <p className="text-muted-foreground">Loading community playlists...</p>
              </div>
            ) : null}

            {error ? (
              <div className="text-center py-12">
                <p className="text-destructive mb-4">Failed to load community playlists</p>
                <Button onClick={() => refetch()} variant="secondary">
                  Try Again
                </Button>
              </div>
            ) : null}

            {!isLoading && !error && filteredPlaylists.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {searchQuery || selectedCategory !== 'all'
                  ? 'No playlists match your search'
                  : 'No community playlists available'}
              </div>
            ) : null}

            {!isLoading && !error
              ? filteredPlaylists.map((playlist, index) => (
                  <div
                    key={`${playlist.downloadUrl}-${index}`}
                    className="bg-muted rounded-lg p-4 hover:bg-muted/80 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg mb-1">{playlist.name}</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          by {playlist.author} • {playlist.category}
                        </p>
                        {playlist.description ? (
                          <p className="text-sm text-foreground/80 line-clamp-2">
                            {playlist.description}
                          </p>
                        ) : null}
                      </div>
                      <Button
                        onClick={() => handleDownload(playlist)}
                        disabled={downloadingUrl === playlist.downloadUrl}
                        size="icon"
                        title="Download playlist"
                      >
                        {downloadingUrl === playlist.downloadUrl ? (
                          <Loader2 className="animate-spin" size={20} />
                        ) : (
                          <Download size={20} />
                        )}
                      </Button>
                    </div>
                  </div>
                ))
              : null}
          </div>

          {!isLoading && !error && filteredPlaylists.length > 0 ? (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground text-center">
                Showing {filteredPlaylists.length} playlist
                {filteredPlaylists.length !== 1 ? 's' : ''}
                {selectedCategory !== 'all' && ` in ${selectedCategory}`}
              </p>
            </div>
          ) : null}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
