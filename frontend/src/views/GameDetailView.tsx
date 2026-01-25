import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { useGame } from '@/hooks/useGames';
import { useDownload } from '@/hooks/useDownload';
import { useGameStats } from '@/hooks/usePlayTracking';
import { ArrowLeft, Play, ImageIcon, Loader2, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { GameInfoGrid } from '@/components/game/GameInfoGrid';
import { useDateTimeFormat } from '@/hooks/useDateTimeFormat';

// Helper function to format duration in seconds
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function GameDetailView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: game, isLoading, error, refetch } = useGame(id!);
  const { progress, isDownloading, startDownload } = useDownload(id!);
  const { data: gameStatsData } = useGameStats();
  const { formatDate } = useDateTimeFormat();
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [logoError, setLogoError] = useState(false);
  const [logoLoading, setLogoLoading] = useState(true);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [shouldAutoPlay, setShouldAutoPlay] = useState(false);

  // Helper function to format relative time
  const formatRelativeTime = (dateString: string): string => {
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

    // Format as date if older than a week
    return formatDate(dateString);
  };

  // Find this game's play stats
  const currentGameStats = useMemo(() => {
    if (!gameStatsData?.data || !id) return null;
    return gameStatsData.data.find(stats => stats.gameId === id);
  }, [gameStatsData, id]);

  // Reset loading states when game changes
  useEffect(() => {
    setImageLoading(true);
    setImageError(false);
    setLogoLoading(true);
    setLogoError(false);
    setDownloadError(null);
    setShouldAutoPlay(false);
  }, [id]);

  // Handle download completion
  useEffect(() => {
    if (progress?.status === 'complete') {
      // Refetch game data to update activeDataOnDisk
      refetch();
    }
    if (progress?.status === 'error') {
      setDownloadError(progress.error || 'Download failed');
      setShouldAutoPlay(false);
    }
  }, [progress, refetch]);

  // Auto-play after download completes and game data is refetched
  useEffect(() => {
    if (shouldAutoPlay && game && game.presentOnDisk !== 0 && !isDownloading) {
      // Game is now available, auto-navigate to play page
      setShouldAutoPlay(false);
      navigate(`/games/${game.id}/play`);
    }
  }, [shouldAutoPlay, game, isDownloading, navigate]);

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
        <p className="text-red-400">Error loading game</p>
        <button
          onClick={() => navigate(-1)}
          className="text-primary hover:underline mt-4 inline-block"
        >
          Go Back
        </button>
      </div>
    );
  }

  const screenshotUrl = game.screenshotPath ? `/proxy/images/${game.screenshotPath}` : null;
  const logoUrl = game.logoPath ? `/proxy/images/${game.logoPath}` : null;

  // Check if game requires data download (use presentOnDisk like Flashpoint Launcher)
  // presentOnDisk: null = no data needed, 0 = needs download, 1 = downloaded
  const needsDataDownload = game.presentOnDisk === 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Go back to previous page"
      >
        <ArrowLeft size={20} />
        Back
      </button>

      <div className="bg-card rounded-lg p-6 space-y-6 border border-border shadow-md">
        {/* Logo and Title Section - At the top */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1">
            {/* Game Logo */}
            {logoUrl && !logoError && (
              <div className="flex-shrink-0 w-20 h-20 bg-muted rounded-lg overflow-hidden flex items-center justify-center p-2 relative">
                {logoLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted/50 backdrop-blur-sm">
                    <Loader2 size={20} className="text-muted-foreground animate-spin" />
                  </div>
                )}
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
            )}

            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 break-words">{game.title}</h1>
              {game.alternateTitles && (
                <p className="text-muted-foreground text-sm break-words">Also known as: {game.alternateTitles}</p>
              )}

              {/* Play Statistics - Under title */}
              {(currentGameStats?.lastPlayedAt || currentGameStats?.totalPlaytimeSeconds) && (
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  {currentGameStats?.lastPlayedAt && (
                    <div className="flex items-center gap-1.5">
                      <Clock size={14} />
                      <span>Last played {formatRelativeTime(currentGameStats.lastPlayedAt)}</span>
                    </div>
                  )}
                  {currentGameStats?.totalPlaytimeSeconds && (
                    <div className="flex items-center gap-1.5">
                      <span>•</span>
                      <span>{formatDuration(currentGameStats.totalPlaytimeSeconds)} played</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Play Button Logic */}
          <div className="text-center space-y-2 flex-shrink-0">
            {(game.platformName === 'Flash' || game.platformName === 'HTML5') ? (
              <>
                {isDownloading ? (
                  <button
                    disabled
                    className="inline-flex items-center justify-center p-4 sm:p-5 md:p-6 bg-primary text-white rounded-xl shadow-lg cursor-wait opacity-75 transition-all w-full sm:w-auto"
                    title="Preparing game..."
                  >
                    <Loader2 size={28} className="sm:w-8 sm:h-8 animate-spin" />
                  </button>
                ) : needsDataDownload ? (
                  <button
                    onClick={handleStartDownload}
                    className="group inline-flex items-center justify-center p-4 sm:p-5 md:p-6 bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg hover:shadow-xl hover:shadow-primary/20 transition-all hover:scale-105 active:scale-95 ring-2 ring-primary/20 hover:ring-primary/40 w-full sm:w-auto"
                    title="Play Game"
                  >
                    <Play size={28} className="sm:w-8 sm:h-8 transition-transform group-hover:scale-110" fill="currentColor" />
                  </button>
                ) : (
                  <Link
                    to={`/games/${game.id}/play`}
                    className="group inline-flex items-center justify-center p-4 sm:p-5 md:p-6 bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg hover:shadow-xl hover:shadow-primary/20 transition-all hover:scale-105 active:scale-95 ring-2 ring-primary/20 hover:ring-primary/40 w-full sm:w-auto"
                    title="Play Game"
                  >
                    <Play size={28} className="sm:w-8 sm:h-8 transition-transform group-hover:scale-110" fill="currentColor" />
                  </Link>
                )}

                {/* Error Display */}
                {downloadError && (
                  <p className="text-sm text-red-500 font-medium">{downloadError}</p>
                )}
              </>
            ) : (
              <>
                <button
                  disabled
                  className="inline-flex items-center justify-center p-4 sm:p-5 md:p-6 bg-muted text-muted-foreground rounded-xl shadow-md cursor-not-allowed opacity-60 w-full sm:w-auto"
                  title="This game requires the Flashpoint Launcher"
                >
                  <Play size={28} className="sm:w-8 sm:h-8" />
                </button>
                <p className="text-xs sm:text-sm text-muted-foreground font-medium">Requires Flashpoint Launcher</p>
              </>
            )}
          </div>
        </div>

        {/* Game Screenshot */}
        {screenshotUrl && (
          <div className="aspect-video bg-muted rounded-lg overflow-hidden flex items-center justify-center relative">
            {imageLoading && !imageError && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/50 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 size={48} className="text-muted-foreground animate-spin" />
                  <span className="text-sm text-muted-foreground">Loading screenshot...</span>
                </div>
              </div>
            )}
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
        )}

        <GameInfoGrid game={game} />

        {game.originalDescription && (
          <div>
            <h2 className="text-lg font-semibold mb-2">Description</h2>
            <p className="leading-relaxed">{game.originalDescription}</p>
          </div>
        )}

        {game.tagsStr && (
          <div>
            <h2 className="text-lg font-semibold mb-2">Tags</h2>
            <div className="flex flex-wrap gap-2">
              {game.tagsStr.split(';').map((tag, i) => (
                <Badge key={i} variant="tag">{tag.trim()}</Badge>
              ))}
            </div>
          </div>
        )}

        {game.notes && (
          <div className="bg-muted/50 rounded p-4">
            <h3 className="text-sm font-semibold text-muted-foreground mb-1">Notes</h3>
            <p className="text-sm">{game.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
