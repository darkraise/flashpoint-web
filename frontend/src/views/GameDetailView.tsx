import { useParams, Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useGame } from '@/hooks/useGames';
import { useDownload } from '@/hooks/useDownload';
import { useGameStats } from '@/hooks/usePlayTracking';
import { useSharedAccessToken } from '@/hooks/useSharedAccessToken';
import { sharedPlaylistsApi } from '@/lib/api/sharedPlaylists';
import { useAuthStore } from '@/store/auth';
import { Play, ImageIcon, Loader2, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { GameInfoGrid } from '@/components/game/GameInfoGrid';
import { useDateTimeFormat } from '@/hooks/useDateTimeFormat';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { buildSharedGameUrl } from '@/hooks/useSharedPlaylistAccess';
import { BreadcrumbContext } from '@/components/common/Breadcrumbs';
import { getGameLogoUrl, getGameScreenshotUrl } from '@/utils/gameUtils';
import { logger } from '@/lib/logger';
import { formatDuration } from '@/lib/cron-utils';

export function GameDetailView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const shareToken = searchParams.get('shareToken');
  const { isAuthenticated } = useAuthStore();
  const { generateToken, hasValidToken, isGenerating } = useSharedAccessToken();

  const breadcrumbContext = location.state?.breadcrumbContext as BreadcrumbContext | undefined;

  useEffect(() => {
    if (shareToken && !isAuthenticated && !hasValidToken) {
      generateToken(shareToken).catch(logger.error);
    }
  }, [shareToken, isAuthenticated, hasValidToken, generateToken]);

  const canFetchGame = !shareToken || isAuthenticated || hasValidToken;

  const {
    data: game,
    isLoading: isLoadingGame,
    error,
    refetch,
  } = useGame(id ?? '', { enabled: canFetchGame });

  const { data: sharedPlaylist } = useQuery({
    queryKey: ['sharedPlaylist', shareToken],
    queryFn: () => sharedPlaylistsApi.getByToken(shareToken ?? ''),
    enabled: !!shareToken,
    retry: false,
  });

  const isLoading = isLoadingGame || isGenerating;
  const { progress, isDownloading, startDownload } = useDownload(id ?? '');
  const { data: gameStatsData } = useGameStats();
  const { formatDate } = useDateTimeFormat();
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [logoError, setLogoError] = useState(false);
  const [logoLoading, setLogoLoading] = useState(true);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [shouldAutoPlay, setShouldAutoPlay] = useState(false);

  const formatRelativeTime = useCallback(
    (dateString: string): string => {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
      if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
      if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;

      return formatDate(dateString);
    },
    [formatDate]
  );

  const currentGameStats = useMemo(() => {
    if (!gameStatsData?.data || !id) return null;
    return gameStatsData.data.find((stats) => stats.gameId === id);
  }, [gameStatsData, id]);

  useEffect(() => {
    setImageLoading(true);
    setImageError(false);
    setLogoLoading(true);
    setLogoError(false);
    setDownloadError(null);
    setShouldAutoPlay(false);
  }, [id]);

  const isRefetchingAfterDownload = useRef(false);
  useEffect(() => {
    if (progress?.status === 'complete' && !isRefetchingAfterDownload.current) {
      isRefetchingAfterDownload.current = true;
      refetch().finally(() => {
        isRefetchingAfterDownload.current = false;
      });
    }
    if (progress?.status === 'error') {
      setDownloadError(progress.error || 'Download failed');
      setShouldAutoPlay(false);
    }
  }, [progress, refetch]);

  useEffect(() => {
    if (
      shouldAutoPlay &&
      game &&
      game.presentOnDisk !== 0 &&
      !isDownloading &&
      !isRefetchingAfterDownload.current
    ) {
      setShouldAutoPlay(false);
      navigate(buildSharedGameUrl(`/games/${game.id}/play`, shareToken), {
        state: {
          playerBreadcrumbContext: {
            breadcrumbContext,
            gameTitle: game.title,
            gameDetailHref: buildSharedGameUrl(`/games/${game.id}`, shareToken),
            shareToken: shareToken ?? null,
            sharedPlaylistTitle: sharedPlaylist?.title ?? null,
            sharedPlaylistHref: shareToken ? `/playlists/shared/${shareToken}` : null,
          },
        },
      });
    }
  }, [
    shouldAutoPlay,
    game,
    isDownloading,
    navigate,
    shareToken,
    breadcrumbContext,
    sharedPlaylist,
  ]);

  const handleStartDownload = async () => {
    try {
      setDownloadError(null);
      setShouldAutoPlay(true);
      await startDownload();
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : 'Failed to start download');
      setShouldAutoPlay(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="mt-4 text-muted-foreground">Loading game...</p>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Error loading game</p>
        <button
          onClick={() => navigate(-1)}
          className="text-primary hover:underline mt-4 inline-block"
        >
          Go Back
        </button>
      </div>
    );
  }

  const screenshotUrl = getGameScreenshotUrl(game.id) || null;
  const logoUrl = getGameLogoUrl(game.id) || null;

  // presentOnDisk: null = no data needed, 0 = needs download, 1 = downloaded
  const needsDataDownload = game.presentOnDisk === 0;

  const breadcrumbItems =
    shareToken && sharedPlaylist
      ? [
          { label: sharedPlaylist.title, href: `/playlists/shared/${shareToken}` },
          { label: game.title, active: true },
        ]
      : shareToken
        ? [{ label: game.title, active: true }]
        : breadcrumbContext
          ? [
              { label: breadcrumbContext.label, href: breadcrumbContext.href },
              { label: game.title, active: true },
            ]
          : [
              { label: 'Browse', href: '/browse' },
              { label: game.title, active: true },
            ];

  return (
    <ErrorBoundary>
      <div className="max-w-6xl mx-auto space-y-6">
        <Breadcrumbs
          items={breadcrumbItems}
          homeLabel={shareToken ? 'Shared' : 'Home'}
          homeHref={shareToken ? '#' : '/'}
        />

        <div className="bg-card rounded-lg p-6 space-y-6 border border-border shadow-md">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 flex-1">
              {logoUrl && !logoError ? (
                <div className="flex-shrink-0 w-20 h-20 bg-muted rounded-lg overflow-hidden flex items-center justify-center p-2 relative">
                  {logoLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted/50 backdrop-blur-sm">
                      <Loader2 size={20} className="text-muted-foreground animate-spin" />
                    </div>
                  ) : null}
                  <img
                    src={logoUrl}
                    alt={`${game.title} logo`}
                    width="80"
                    height="80"
                    className="w-full h-full object-contain relative z-10"
                    onLoad={() => setLogoLoading(false)}
                    onError={() => {
                      setLogoError(true);
                      setLogoLoading(false);
                    }}
                  />
                </div>
              ) : null}

              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 break-words">
                  {game.title}
                </h1>
                {game.alternateTitles ? (
                  <p className="text-muted-foreground text-sm break-words">
                    Also known as: {game.alternateTitles}
                  </p>
                ) : null}

                {currentGameStats?.lastPlayedAt || currentGameStats?.totalPlaytimeSeconds ? (
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    {currentGameStats?.lastPlayedAt ? (
                      <div className="flex items-center gap-1.5">
                        <Clock size={14} />
                        <span>Last played {formatRelativeTime(currentGameStats.lastPlayedAt)}</span>
                      </div>
                    ) : null}
                    {currentGameStats?.totalPlaytimeSeconds ? (
                      <div className="flex items-center gap-1.5">
                        <span>•</span>
                        <span>{formatDuration(currentGameStats.totalPlaytimeSeconds)} played</span>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="text-center space-y-2 flex-shrink-0">
              {game.platformName === 'Flash' || game.platformName === 'HTML5' ? (
                <>
                  {isDownloading ? (
                    <button
                      disabled
                      className="inline-flex items-center justify-center p-4 sm:p-5 md:p-6 bg-primary text-white rounded-xl shadow-lg cursor-wait opacity-75 transition-all w-full sm:w-auto"
                      title="Preparing game..."
                    >
                      <Loader2 className="w-7 h-7 sm:w-8 sm:h-8 animate-spin" />
                    </button>
                  ) : needsDataDownload ? (
                    <button
                      onClick={handleStartDownload}
                      className="group inline-flex items-center justify-center p-4 sm:p-5 md:p-6 bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg hover:shadow-xl hover:shadow-primary/20 transition-all hover:scale-105 active:scale-95 ring-2 ring-primary/20 hover:ring-primary/40 w-full sm:w-auto"
                      title="Play Game"
                    >
                      <Play
                        size={28}
                        className="sm:w-8 sm:h-8 transition-transform group-hover:scale-110"
                        fill="currentColor"
                      />
                    </button>
                  ) : (
                    <Link
                      to={buildSharedGameUrl(`/games/${game.id}/play`, shareToken)}
                      state={{
                        playerBreadcrumbContext: {
                          breadcrumbContext,
                          gameTitle: game.title,
                          gameDetailHref: buildSharedGameUrl(`/games/${game.id}`, shareToken),
                          shareToken: shareToken ?? null,
                          sharedPlaylistTitle: sharedPlaylist?.title ?? null,
                          sharedPlaylistHref: shareToken ? `/playlists/shared/${shareToken}` : null,
                        },
                      }}
                      className="group inline-flex items-center justify-center p-4 sm:p-5 md:p-6 bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg hover:shadow-xl hover:shadow-primary/20 transition-all hover:scale-105 active:scale-95 ring-2 ring-primary/20 hover:ring-primary/40 w-full sm:w-auto"
                      title="Play Game"
                    >
                      <Play
                        size={28}
                        className="sm:w-8 sm:h-8 transition-transform group-hover:scale-110"
                        fill="currentColor"
                      />
                    </Link>
                  )}

                  {downloadError ? (
                    <p className="text-sm text-destructive font-medium">{downloadError}</p>
                  ) : null}
                </>
              ) : (
                <Badge
                  variant="secondary"
                  className="px-4 py-2 text-sm sm:text-base font-medium flex items-center gap-2"
                >
                  <Play size={16} className="sm:w-5 sm:h-5" />
                  Play on Flashpoint Launcher
                </Badge>
              )}
            </div>
          </div>

          {screenshotUrl ? (
            <div className="aspect-video bg-muted rounded-lg overflow-hidden flex items-center justify-center relative">
              {imageLoading && !imageError ? (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/50 backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 size={48} className="text-muted-foreground animate-spin" />
                    <span className="text-sm text-muted-foreground">Loading screenshot...</span>
                  </div>
                </div>
              ) : null}
              {!imageError ? (
                <img
                  src={screenshotUrl}
                  alt={`${game.title} screenshot`}
                  width="1280"
                  height="720"
                  className="w-full h-full object-contain relative z-10"
                  onLoad={() => setImageLoading(false)}
                  onError={() => {
                    setImageError(true);
                    setImageLoading(false);
                  }}
                />
              ) : (
                <div className="flex flex-col items-center text-muted-foreground">
                  <ImageIcon size={64} className="mb-2 opacity-50" />
                  <span className="text-sm">Screenshot not available</span>
                </div>
              )}
            </div>
          ) : null}

          <GameInfoGrid game={game} />

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
      </div>
    </ErrorBoundary>
  );
}
