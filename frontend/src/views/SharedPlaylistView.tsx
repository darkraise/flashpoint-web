import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { sharedPlaylistsApi } from '@/lib/api/sharedPlaylists';
import { useCloneSharedPlaylist } from '@/hooks/useUserPlaylists';
import { useAuthStore } from '@/store/auth';
import { useSharedAccessToken } from '@/hooks/useSharedAccessToken';
import { GameGrid } from '@/components/library/GameGrid';
import { GameList } from '@/components/library/GameList';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ViewOptions } from '@/components/common/ViewOptions';
import { PlaylistIcon } from '@/components/playlist/PlaylistIcon';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { useUIStore } from '@/store/ui';
import { Info, Copy, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { getErrorMessage } from '@/types/api-error';

export function SharedPlaylistView() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const navigate = useNavigate();
  const viewMode = useUIStore((state) => state.viewMode);
  const { isAuthenticated } = useAuthStore();
  const [isCloning, setIsCloning] = useState(false);

  const clonePlaylist = useCloneSharedPlaylist();
  const { generateToken, hasValidToken, isGenerating } = useSharedAccessToken();

  // Generate shared access token on mount (for anonymous users)
  useEffect(() => {
    if (shareToken && !isAuthenticated && !hasValidToken) {
      generateToken(shareToken).catch(console.error);
    }
  }, [shareToken, isAuthenticated, hasValidToken, generateToken]);

  // Fetch shared playlist metadata
  const {
    data: playlist,
    isLoading: isLoadingPlaylist,
    error: playlistError,
  } = useQuery({
    queryKey: ['sharedPlaylist', shareToken],
    queryFn: () => sharedPlaylistsApi.getByToken(shareToken!),
    enabled: !!shareToken,
    retry: false,
  });

  // Fetch shared playlist games
  const { data: games = [], isLoading: isLoadingGames } = useQuery({
    queryKey: ['sharedPlaylistGames', shareToken],
    queryFn: () => sharedPlaylistsApi.getGames(shareToken!),
    enabled: !!shareToken && !!playlist,
    retry: false,
  });

  const isLoading = isLoadingPlaylist || isLoadingGames || isGenerating;

  const handleClone = async () => {
    if (!shareToken) return;

    setIsCloning(true);
    try {
      const newPlaylist = await clonePlaylist.mutateAsync({
        shareToken,
      });
      toast.success('Playlist cloned successfully');
      navigate(`/playlists/${newPlaylist.id}`);
    } catch (error) {
      toast.error(getErrorMessage(error) || 'Failed to clone playlist');
    } finally {
      setIsCloning(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="mt-4 text-muted-foreground">Loading shared playlist...</p>
      </div>
    );
  }

  if (playlistError || !playlist) {
    return (
      <div className="max-w-3xl mx-auto py-12">
        <Alert variant="destructive">
          <AlertDescription>
            {getErrorMessage(playlistError) ||
              'This playlist is not available. It may have been removed or the link has expired.'}
          </AlertDescription>
        </Alert>
        <div className="text-center mt-6">
          <Link to="/" className="text-primary hover:underline">
            Go to home page
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Breadcrumbs Navigation */}
      <Breadcrumbs
        items={[{ label: playlist.title, active: true }]}
        homeLabel="Shared"
        homeHref="#"
      />

      {/* Info Banner */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between gap-4">
          <span>
            This is a shared playlist.
            {isAuthenticated ? (
              <> You can clone it to your account below.</>
            ) : (
              <>
                {' '}
                <Link to="/login" className="text-primary hover:underline font-medium">
                  Sign in
                </Link>{' '}
                to create your own playlists.
              </>
            )}
          </span>
          <Button variant="outline" size="sm" onClick={handleCopyLink} className="flex-shrink-0">
            <Copy className="h-4 w-4 mr-2" />
            Copy Link
          </Button>
        </AlertDescription>
      </Alert>

      {/* Back Button (if authenticated) */}
      {isAuthenticated ? (
        <Link
          to="/playlists"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={20} />
          Back to my playlists
        </Link>
      ) : null}

      {/* Playlist Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex gap-4">
          {/* Playlist Icon */}
          {playlist.icon ? (
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
          ) : null}

          {/* Playlist Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{playlist.title}</h1>
              <Badge variant="secondary">Shared</Badge>
            </div>
            {playlist.description ? (
              <p className="text-muted-foreground">{playlist.description}</p>
            ) : null}
            <div className="flex items-center gap-4 mt-2">
              <p className="text-sm text-muted-foreground">
                {playlist.gameCount} {playlist.gameCount === 1 ? 'game' : 'games'}
              </p>
              {playlist.ownerUsername ? (
                <p className="text-sm text-muted-foreground">
                  Created by <span className="font-medium">{playlist.ownerUsername}</span>
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <ViewOptions />
          {isAuthenticated ? (
            <Button onClick={handleClone} disabled={isCloning || clonePlaylist.isPending}>
              {isCloning || clonePlaylist.isPending ? 'Cloning...' : 'Clone to My Playlists'}
            </Button>
          ) : null}
        </div>
      </div>

      {/* Games Display */}
      {games.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground">This playlist is empty</p>
        </div>
      ) : (
        <>
          {viewMode === 'grid' ? (
            <GameGrid games={games} shareToken={shareToken} />
          ) : (
            <GameList games={games} shareToken={shareToken} />
          )}
        </>
      )}
    </div>
  );
}
