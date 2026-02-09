import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { AlertCircle, Loader2, Download } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import {
  Breadcrumbs,
  type PlayerBreadcrumbContext,
  type BreadcrumbItem,
} from '@/components/common/Breadcrumbs';
import { buildSharedGameUrl } from '@/hooks/useSharedPlaylistAccess';
import { useGame, useGameLaunchData } from '@/hooks/useGames';
import { GamePlayer } from '@/components/player';
import { Badge } from '@/components/ui/badge';
import { usePlaySession } from '@/hooks/usePlayTracking';
import { GameInfoGrid } from '@/components/game/GameInfoGrid';
import { getGameLogoUrl } from '@/utils/gameUtils';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

export function GamePlayerView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const shareToken = searchParams.get('shareToken');
  const playerContext = location.state?.playerBreadcrumbContext as
    | PlayerBreadcrumbContext
    | undefined;

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [logoLoading, setLogoLoading] = useState(true);

  const { data: game, isLoading: gameLoading, error: gameError } = useGame(id ?? '');
  const {
    data: launchData,
    isLoading: launchLoading,
    error: launchError,
  } = useGameLaunchData(id ?? '');

  // Track play session for authenticated users
  usePlaySession(game?.id || null, game?.title || null);

  // Auto-enter fullscreen for HTML5 games
  useEffect(() => {
    if (launchData?.platform === 'HTML5' && launchData?.canPlayInBrowser) {
      setIsFullscreen(true);
    }
  }, [launchData?.platform, launchData?.canPlayInBrowser]);

  // Reset logo loading states when game changes
  useEffect(() => {
    setLogoLoading(true);
    setLogoError(false);
  }, [id]);

  // Memoize player props to prevent unnecessary re-renders
  const playerProps = useMemo(
    () => ({
      title: game?.title ?? '',
      platform: launchData?.platform ?? '',
      contentUrl: launchData?.contentUrl,
      launchCommand: launchData?.launchCommand,
      canPlayInBrowser: launchData?.canPlayInBrowser ?? false,
    }),
    [
      game?.title,
      launchData?.platform,
      launchData?.contentUrl,
      launchData?.launchCommand,
      launchData?.canPlayInBrowser,
    ]
  );

  // Build breadcrumb items for navigation bar
  const breadcrumbItems = useMemo((): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = [];

    // Upstream context
    if (playerContext?.shareToken && playerContext.sharedPlaylistTitle) {
      items.push({
        label: playerContext.sharedPlaylistTitle,
        href: playerContext.sharedPlaylistHref ?? '#',
      });
    } else if (playerContext?.breadcrumbContext) {
      items.push({
        label: playerContext.breadcrumbContext.label,
        href: playerContext.breadcrumbContext.href,
      });
    } else {
      items.push({ label: 'Browse', href: '/browse' });
    }

    // Game detail link
    const gameDetailHref =
      playerContext?.gameDetailHref ?? buildSharedGameUrl(`/games/${id}`, shareToken);
    items.push({
      label: playerContext?.gameTitle ?? game?.title ?? 'Game',
      href: gameDetailHref,
    });

    // Play (active)
    items.push({ label: 'Play', active: true });

    return items;
  }, [id, game?.title, shareToken, playerContext]);

  if (gameLoading || launchLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading game...</p>
        </div>
      </div>
    );
  }

  if (gameError || launchError || !game || !launchData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md p-6">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Failed to Load Game</h2>
          <p className="text-muted-foreground mb-6">
            {gameError?.message || launchError?.message || 'Game not found'}
          </p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-primary hover:bg-primary/90 rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Render a single persistent structure with CSS-based layout changes
  // This prevents the game from unmounting/remounting when toggling fullscreen
  return (
    <ErrorBoundary>
      <div className={isFullscreen ? 'fixed inset-0 z-50 bg-black' : 'max-w-6xl mx-auto space-y-6'}>
        {/* Breadcrumb navigation - only shown in normal mode */}
        {!isFullscreen ? (
          <Breadcrumbs
            items={breadcrumbItems}
            homeLabel={shareToken ? 'Shared' : 'Home'}
            homeHref={shareToken ? '#' : '/'}
          />
        ) : null}

        {/* Game Player Card - adjusts styling based on fullscreen */}
        <div
          className={
            isFullscreen
              ? 'w-full h-full'
              : 'bg-card rounded-lg overflow-hidden shadow-xl border border-border'
          }
        >
          {/* Game Header - only shown in normal mode */}
          {!isFullscreen ? (
            <div className="px-6 py-4 border-b border-border">
              <div className="flex items-start gap-4">
                {/* Game Logo */}
                {getGameLogoUrl(game.id) && !logoError ? (
                  <div className="flex-shrink-0 w-16 h-16 bg-muted rounded-lg overflow-hidden flex items-center justify-center p-1.5 relative">
                    {logoLoading ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-muted/50 backdrop-blur-sm">
                        <Loader2 size={16} className="text-muted-foreground animate-spin" />
                      </div>
                    ) : null}
                    <img
                      src={getGameLogoUrl(game.id)}
                      alt={`${game.title} logo`}
                      className="w-full h-full object-contain relative z-10"
                      onLoad={() => setLogoLoading(false)}
                      onError={() => {
                        setLogoError(true);
                        setLogoLoading(false);
                      }}
                    />
                  </div>
                ) : null}

                <div className="flex-1">
                  <h1 className="text-2xl font-bold mb-1">{game.title}</h1>
                  {game.developer ? (
                    <p className="text-muted-foreground text-sm">by {game.developer}</p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {/* Game Player Container - ALWAYS VISIBLE, persists in both modes */}
          <div className={isFullscreen ? 'w-full h-screen' : 'aspect-video bg-black'}>
            {launchData?.downloading ? (
              <div className="flex items-center justify-center h-full bg-black">
                <div className="text-center max-w-sm">
                  <Download size={48} className="text-blue-500 mx-auto mb-4 animate-bounce" />
                  <h3 className="text-xl font-bold mb-2 text-white">Downloading Game Data...</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    The game files are being downloaded. This page will update automatically when
                    ready.
                  </p>
                  <Loader2 size={20} className="text-blue-400 mx-auto animate-spin" />
                </div>
              </div>
            ) : (
              <GamePlayer
                key={`game-player-${id}`}
                {...playerProps}
                allowFullscreen={true}
                initialFullscreen={isFullscreen}
                onFullscreenChange={setIsFullscreen}
                showControls={true}
                height={isFullscreen ? '100vh' : 'aspect-video'}
                className="w-full h-full"
              />
            )}
          </div>

          {/* Game Info Below Player - only shown in normal mode */}
          {!isFullscreen ? (
            <div className="px-6 py-6 space-y-6">
              {/* Game Info Grid */}
              <GameInfoGrid game={game} launchData={launchData} />

              {/* Description */}
              {game.originalDescription ? (
                <div>
                  <h2 className="text-lg font-semibold mb-2">Description</h2>
                  <p className="leading-relaxed">{game.originalDescription}</p>
                </div>
              ) : null}

              {/* Tags */}
              {game.tagsStr ? (
                <div>
                  <h2 className="text-lg font-semibold mb-2">Tags</h2>
                  <div className="flex flex-wrap gap-2">
                    {game.tagsStr.split(';').map((tag) => (
                      <Badge key={tag.trim()} variant="tag">
                        {tag.trim()}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Notes */}
              {game.notes ? (
                <div className="bg-muted/50 rounded p-4">
                  <h3 className="text-sm font-semibold text-muted-foreground mb-1">Notes</h3>
                  <p className="text-sm">{game.notes}</p>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </ErrorBoundary>
  );
}
