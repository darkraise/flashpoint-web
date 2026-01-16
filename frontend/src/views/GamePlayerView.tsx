import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { useGame, useGameLaunchData } from '@/hooks/useGames';
import { GamePlayer } from '@/components/player';
import { Badge } from '@/components/ui/badge';
import { usePlaySession } from '@/hooks/usePlayTracking';

export function GamePlayerView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { data: game, isLoading: gameLoading, error: gameError } = useGame(id!);
  const { data: launchData, isLoading: launchLoading, error: launchError } = useGameLaunchData(id!);

  // Track play session for authenticated users
  usePlaySession(
    game?.id || null,
    game?.title || null
  );

  // Auto-enter fullscreen for HTML5 games
  useEffect(() => {
    if (launchData?.platform === 'HTML5' && launchData?.canPlayInBrowser) {
      setIsFullscreen(true);
    }
  }, [launchData?.platform, launchData?.canPlayInBrowser]);

  // Memoize player props to prevent unnecessary re-renders
  const playerProps = useMemo(() => ({
    title: game?.title || '',
    platform: launchData?.platform || '',
    contentUrl: launchData?.contentUrl,
    launchCommand: launchData?.launchCommand,
    canPlayInBrowser: launchData?.canPlayInBrowser || false,
  }), [game?.title, launchData?.platform, launchData?.contentUrl, launchData?.launchCommand, launchData?.canPlayInBrowser]);

  if (gameLoading || launchLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading game...</p>
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
          <p className="text-gray-400 mb-6">
            {gameError?.message || launchError?.message || 'Game not found'}
          </p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 rounded-lg"
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
    <div className={isFullscreen ? 'fixed inset-0 z-50 bg-black' : 'max-w-6xl mx-auto space-y-6'}>
      {/* Back button - only shown in normal mode */}
      {!isFullscreen && (
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-200 transition-colors"
        >
          <ArrowLeft size={20} />
          Back
        </button>
      )}

      {/* Game Player Card - adjusts styling based on fullscreen */}
      <div className={isFullscreen ? 'w-full h-full' : 'bg-gray-800 rounded-lg overflow-hidden shadow-xl'}>
        {/* Game Header - only shown in normal mode */}
        {!isFullscreen && (
          <div className="px-6 py-4 border-b border-gray-700">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold mb-1">{game.title}</h1>
                {game.developer && (
                  <p className="text-gray-400 text-sm">by {game.developer}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="platform">{launchData.platform}</Badge>
              </div>
            </div>
          </div>
        )}

        {/* Game Player Container - ALWAYS VISIBLE, persists in both modes */}
        <div className={isFullscreen ? 'w-full h-screen' : 'aspect-video bg-black'}>
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
        </div>

        {/* Game Info Below Player - only shown in normal mode */}
        {!isFullscreen && (
          <div className="px-6 py-6 space-y-6">
            {/* Quick Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-y border-gray-700">
              <div>
                <dt className="text-sm text-gray-400 mb-1">Developer</dt>
                <dd className="font-medium text-sm">{game.developer || 'Unknown'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-400 mb-1">Publisher</dt>
                <dd className="font-medium text-sm">{game.publisher || 'Unknown'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-400 mb-1">Play Mode</dt>
                <dd className="font-medium text-sm">{launchData.playMode || 'Single Player'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-400 mb-1">Released</dt>
                <dd className="font-medium text-sm">{game.releaseDate || 'Unknown'}</dd>
              </div>
            </div>

            {/* Description */}
            {game.originalDescription && (
              <div>
                <h2 className="text-lg font-semibold mb-2">Description</h2>
                <p className="text-gray-300 leading-relaxed">{game.originalDescription}</p>
              </div>
            )}

            {/* Tags */}
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

            {/* Notes */}
            {game.notes && (
              <div className="bg-gray-900/50 rounded p-4">
                <h3 className="text-sm font-semibold text-gray-400 mb-1">Notes</h3>
                <p className="text-sm text-gray-300">{game.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
