import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useState, useMemo, useEffect, useCallback } from 'react';
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
import {
  getBreadcrumbContextFromPath,
  getSectionFromPath,
  DEFAULT_BREADCRUMB_CONTEXT,
} from '@/lib/sectionRoutes';

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

  const { data: game, isLoading: gameLoading, error: gameError } = useGame(id ?? '');
  const {
    data: launchData,
    isLoading: launchLoading,
    error: launchError,
  } = useGameLaunchData(id ?? '');

  usePlaySession(game?.id || null, game?.title || null);

  // Auto-enter fullscreen for HTML5 games
  useEffect(() => {
    if (launchData?.platform === 'HTML5' && launchData?.canPlayInBrowser) {
      setIsFullscreen(true);
    }
  }, [launchData?.platform, launchData?.canPlayInBrowser]);

  // Listen for F11 to toggle fullscreen mode (prevent browser fullscreen)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'F11') {
        event.preventDefault();
        setIsFullscreen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const playerProps = useMemo(
    () => ({
      title: game?.title ?? '',
      platform: launchData?.platform ?? '',
      contentUrl: launchData?.contentUrl,
      launchCommand: launchData?.launchCommand,
      canPlayInBrowser: launchData?.canPlayInBrowser ?? false,
      logoUrl: game ? getGameLogoUrl(game.id) : undefined,
      developer: game?.developer,
      onBack: handleBack,
    }),
    [
      game?.title,
      game?.id,
      game?.developer,
      launchData?.platform,
      launchData?.contentUrl,
      launchData?.launchCommand,
      launchData?.canPlayInBrowser,
      handleBack,
    ]
  );

  // Derive breadcrumb context from URL when no state is available
  const urlBreadcrumbContext = getBreadcrumbContextFromPath(location.pathname);
  const currentSection = getSectionFromPath(location.pathname);

  const breadcrumbItems = useMemo((): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = [];

    if (playerContext?.shareToken && playerContext.sharedPlaylistTitle) {
      items.push({
        label: playerContext.sharedPlaylistTitle,
        href: playerContext.sharedPlaylistHref ?? '#',
      });
    } else if (playerContext?.breadcrumbContext) {
      // Add parent context if present (e.g., Flashpoint Playlists > Playlist Name)
      if (playerContext.breadcrumbContext.parent) {
        items.push({
          label: playerContext.breadcrumbContext.parent.label,
          href: playerContext.breadcrumbContext.parent.href,
          icon: playerContext.breadcrumbContext.parent.icon,
        });
      }
      items.push({
        label: playerContext.breadcrumbContext.label,
        href: playerContext.breadcrumbContext.href,
        icon: playerContext.breadcrumbContext.icon,
      });
    } else if (urlBreadcrumbContext) {
      // Derive from URL when no state (direct URL access)
      items.push({
        label: urlBreadcrumbContext.label,
        href: urlBreadcrumbContext.href,
        icon: urlBreadcrumbContext.icon,
      });
    } else {
      items.push({
        label: DEFAULT_BREADCRUMB_CONTEXT.label,
        href: DEFAULT_BREADCRUMB_CONTEXT.href,
        icon: DEFAULT_BREADCRUMB_CONTEXT.icon,
      });
    }

    // Build game detail URL: use section route if available, otherwise state/legacy
    const gameDetailHref =
      playerContext?.gameDetailHref ??
      (currentSection
        ? `${currentSection.prefix}/${id}`
        : buildSharedGameUrl(`/games/${id}`, shareToken));
    items.push({
      label: playerContext?.gameTitle ?? game?.title ?? 'Game',
      href: gameDetailHref,
    });

    items.push({ label: 'Play', active: true });

    return items;
  }, [id, game?.title, shareToken, playerContext, urlBreadcrumbContext, currentSection]);

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
      <div className={isFullscreen ? 'fixed inset-0 z-50 bg-black' : 'max-w-7xl mx-auto space-y-6'}>
        {!isFullscreen ? <Breadcrumbs items={breadcrumbItems} /> : null}

        <div
          className={
            isFullscreen
              ? 'w-full h-full'
              : 'bg-card rounded-lg overflow-hidden shadow-xl border border-border'
          }
        >
          {/* Game Player Container - ALWAYS VISIBLE, persists in both modes */}
          <div className={isFullscreen ? 'w-full h-screen' : 'aspect-video bg-black'}>
            {launchData?.downloading ? (
              <div className="flex items-center justify-center h-full bg-black gap-3">
                <Loader2 size={24} className="text-primary animate-spin" />
                <span className="text-white text-lg">Downloading...</span>
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

          {!isFullscreen ? (
            <div className="px-6 py-6 space-y-6">
              <GameInfoGrid game={game} launchData={launchData} />

              {game.originalDescription ? (
                <div>
                  <h2 className="text-lg font-semibold mb-2">Description</h2>
                  <p className="leading-relaxed">{game.originalDescription}</p>
                </div>
              ) : null}

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
