import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useGame } from '@/hooks/useGames';
import { useDownload } from '@/hooks/useDownload';
import { ArrowLeft, Play, ImageIcon, Loader2, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function GameDetailView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: game, isLoading, error, refetch } = useGame(id!);
  const { progress, isDownloading, startDownload } = useDownload(id!);
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [logoError, setLogoError] = useState(false);
  const [logoLoading, setLogoLoading] = useState(true);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [shouldAutoPlay, setShouldAutoPlay] = useState(false);

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
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        <p className="mt-4 text-gray-400">Loading game...</p>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400">Error loading game</p>
        <button
          onClick={() => navigate(-1)}
          className="text-primary-500 hover:underline mt-4 inline-block"
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
        className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-200 transition-colors"
      >
        <ArrowLeft size={20} />
        Back
      </button>

      <div className="bg-gray-800 rounded-lg p-6 space-y-6">
        {/* Logo and Title Section - At the top */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1">
            {/* Game Logo */}
            {logoUrl && !logoError && (
              <div className="flex-shrink-0 w-32 h-32 bg-gray-700 rounded-lg overflow-hidden flex items-center justify-center p-2 relative">
                {logoLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-800/50 backdrop-blur-sm">
                    <Loader2 size={24} className="text-gray-400 animate-spin" />
                  </div>
                )}
                <img
                  src={logoUrl}
                  alt={`${game.title} logo`}
                  className="w-full h-full object-contain relative z-10"
                  onLoad={() => setLogoLoading(false)}
                  onError={() => {
                    setLogoError(true);
                    setLogoLoading(false);
                  }}
                />
              </div>
            )}

            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{game.title}</h1>
              {game.alternateTitles && (
                <p className="text-gray-400 text-sm">Also known as: {game.alternateTitles}</p>
              )}
            </div>
          </div>

          {/* Play Button Logic */}
          <div className="text-center space-y-2">
            {(game.platformName === 'Flash' || game.platformName === 'HTML5') ? (
              <>
                {isDownloading ? (
                  <button
                    disabled
                    className="flex items-center gap-2 px-6 py-3 bg-primary-600 rounded-lg font-semibold cursor-wait"
                  >
                    <Loader2 size={20} className="animate-spin" />
                    Preparing Game...
                  </button>
                ) : needsDataDownload ? (
                  <button
                    onClick={handleStartDownload}
                    className="flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 rounded-lg font-semibold transition-colors"
                  >
                    <Play size={20} />
                    Play
                  </button>
                ) : (
                  <Link
                    to={`/games/${game.id}/play`}
                    className="flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 rounded-lg font-semibold transition-colors"
                  >
                    <Play size={20} />
                    Play
                  </Link>
                )}

                {/* Availability Indicator */}
                {!needsDataDownload && !isDownloading && (
                  <div className="flex items-center justify-center gap-1 text-green-500">
                    <CheckCircle2 size={16} />
                    <span className="text-sm font-medium">Available</span>
                  </div>
                )}

                {/* Error Display */}
                {downloadError && (
                  <p className="text-xs text-red-400">{downloadError}</p>
                )}
              </>
            ) : (
              <>
                <button
                  disabled
                  className="flex items-center gap-2 px-6 py-3 bg-gray-700 text-gray-400 rounded-lg font-semibold cursor-not-allowed"
                  title="This game requires the Flashpoint Launcher"
                >
                  <Play size={20} />
                  Play
                </button>
                <p className="text-xs text-gray-500">Requires Flashpoint Launcher</p>
              </>
            )}
          </div>
        </div>

        {/* Game Screenshot */}
        {screenshotUrl && (
          <div className="aspect-video bg-gray-700 rounded-lg overflow-hidden flex items-center justify-center relative">
            {imageLoading && !imageError && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800/50 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 size={48} className="text-gray-400 animate-spin" />
                  <span className="text-sm text-gray-400">Loading screenshot...</span>
                </div>
              </div>
            )}
            {!imageError ? (
              <img
                src={screenshotUrl}
                alt={`${game.title} screenshot`}
                className="w-full h-full object-contain relative z-10"
                onLoad={() => setImageLoading(false)}
                onError={() => {
                  setImageError(true);
                  setImageLoading(false);
                }}
              />
            ) : (
              <div className="flex flex-col items-center text-gray-500">
                <ImageIcon size={64} className="mb-2 opacity-50" />
                <span className="text-sm">Screenshot not available</span>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-y border-gray-700">
          <div>
            <dt className="text-sm text-gray-400 mb-1">Developer</dt>
            <dd className="font-medium">{game.developer || 'Unknown'}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-400 mb-1">Publisher</dt>
            <dd className="font-medium">{game.publisher || 'Unknown'}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-400 mb-1">Platform</dt>
            <dd><Badge variant="platform">{game.platformName}</Badge></dd>
          </div>
          <div>
            <dt className="text-sm text-gray-400 mb-1">Library</dt>
            <dd className="font-medium capitalize">{game.library}</dd>
          </div>
        </div>

        {game.originalDescription && (
          <div>
            <h2 className="text-lg font-semibold mb-2">Description</h2>
            <p className="text-gray-300 leading-relaxed">{game.originalDescription}</p>
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
          <div className="bg-gray-900/50 rounded p-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-1">Notes</h3>
            <p className="text-sm text-gray-300">{game.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
