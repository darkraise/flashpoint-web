import { useState, useEffect } from 'react';
import { Play, AlertCircle, Maximize2, Minimize2 } from 'lucide-react';
import { RufflePlayer } from './RufflePlayer';

export interface GamePlayerProps {
  /** Game title for display */
  title: string;
  /** Platform (Flash, HTML5, etc.) */
  platform: string;
  /** Content URL for the game */
  contentUrl?: string;
  /** Launch command (if any) */
  launchCommand?: string;
  /** Whether the game can be played in browser */
  canPlayInBrowser: boolean;
  /** Optional fullscreen mode */
  allowFullscreen?: boolean;
  /** Whether fullscreen is initially enabled */
  initialFullscreen?: boolean;
  /** Callback when fullscreen state changes */
  onFullscreenChange?: (isFullscreen: boolean) => void;
  /** Custom class name for the container */
  className?: string;
  /** Show player controls */
  showControls?: boolean;
  /** Container height (CSS value) */
  height?: string;
}

/**
 * Reusable game player component that can render Flash (Ruffle) or HTML5 games.
 * Can be embedded in pages or dialogs.
 */
export function GamePlayer({
  title,
  platform,
  contentUrl,
  launchCommand,
  canPlayInBrowser,
  allowFullscreen = true,
  initialFullscreen = false,
  onFullscreenChange,
  className = '',
  showControls = true,
  height = 'calc(100vh - 220px)',
}: GamePlayerProps) {
  const [isFullscreen, setIsFullscreen] = useState(initialFullscreen);
  const [iframeError, setIframeError] = useState<string | null>(null);

  // Default scale mode for Ruffle player (hardcoded)
  const defaultScaleMode = 'showall';

  const toggleFullscreen = () => {
    const newFullscreenState = !isFullscreen;
    setIsFullscreen(newFullscreenState);
    onFullscreenChange?.(newFullscreenState);
  };

  // Sync internal fullscreen state with prop changes (for auto-fullscreen)
  useEffect(() => {
    setIsFullscreen(initialFullscreen);
  }, [initialFullscreen]);

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullscreen) {
        event.preventDefault(); // Prevent default ESC behavior
        setIsFullscreen(false);
        onFullscreenChange?.(false);
      }
    };

    if (isFullscreen) {
      window.addEventListener('keydown', handleEscKey);
      return () => window.removeEventListener('keydown', handleEscKey);
    }
  }, [isFullscreen, onFullscreenChange]);

  // Debug logging for game content
  if (contentUrl) {
    console.log(`[GamePlayer] Loading ${platform} game:`, {
      title,
      platform,
      contentUrl,
      canPlayInBrowser,
    });
  }

  if (!canPlayInBrowser) {
    const isWebPlatform = platform === 'Flash' || platform === 'HTML5';

    // Determine the reason why the game cannot be played
    let reason: string;
    let details: string;

    if (isWebPlatform && !launchCommand) {
      // Missing content data
      reason = 'This game is missing content data and cannot be played.';
      details = 'This game entry is incomplete. Try launching it from the Flashpoint Launcher instead.';
    } else {
      // Not a web platform
      reason = `The ${platform} platform requires the Flashpoint Launcher.`;
      details = 'Only Flash and HTML5 games with valid content can be played in the browser.';
    }

    return (
      <div className={`flex items-center justify-center bg-card border border-border rounded-lg p-8 ${className}`}>
        <div className="text-center">
          <AlertCircle size={48} className="text-yellow-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">Cannot Play in Browser</h3>
          <p className="text-muted-foreground mb-4">{reason}</p>
          <div className="bg-muted rounded p-4">
            <p className="text-sm">
              <span className="font-semibold">Platform:</span> {platform}
            </p>
            <p className="text-sm mt-2">{details}</p>
          </div>
        </div>
      </div>
    );
  }

  const containerClasses = isFullscreen
    ? 'fixed inset-0 z-50 bg-black'
    : className;

  // Special handling for aspect-video containers - use flex layout
  const isAspectVideo = height === 'aspect-video';

  return (
    <div className={`${containerClasses} ${isAspectVideo ? 'flex flex-col' : ''}`}>
      {/* Player Controls */}
      {showControls && (
        <div className="flex items-center justify-between bg-card/90 backdrop-blur-sm px-4 py-3 flex-shrink-0 border-b border-border">
          <div className="flex items-center gap-3">
            <Play size={18} className="text-primary" />
            <div>
              <span className="text-sm font-medium block">
                {platform === 'Flash' ? 'Flash Player (Ruffle)' : platform}
              </span>
              <span className="text-xs text-muted-foreground">
                {isFullscreen ? 'Press ESC to exit fullscreen' : 'Click maximize for fullscreen'}
              </span>
            </div>
          </div>
          {allowFullscreen && (
            <button
              onClick={toggleFullscreen}
              className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
              title={isFullscreen ? 'Exit Fullscreen (ESC)' : 'Enter Fullscreen'}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 size={18} />
                  <span className="text-sm hidden sm:inline">Exit Fullscreen</span>
                </>
              ) : (
                <>
                  <Maximize2 size={18} />
                  <span className="text-sm hidden sm:inline">Fullscreen</span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Game Player Container */}
      <div
        className={`bg-black relative ${isAspectVideo ? 'flex-1 min-h-0' : ''}`}
        style={isAspectVideo ? {} : {
          height: isFullscreen
            ? showControls ? 'calc(100vh - 64px)' : '100vh'
            : height,
          minHeight: isFullscreen ? 'auto' : '600px'
        }}
      >
        {platform === 'Flash' && contentUrl ? (
          <RufflePlayer
            swfUrl={contentUrl}
            width="100%"
            height="100%"
            className="w-full h-full"
            scaleMode={defaultScaleMode}
            onLoadError={(error) => {
              console.error('Ruffle load error:', error);
            }}
            onLoadSuccess={() => {
              console.log('Ruffle loaded successfully');
            }}
          />
        ) : platform === 'HTML5' && contentUrl ? (
          <>
            <iframe
              src={contentUrl}
              className="w-full h-full border-0"
              title={title}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-pointer-lock allow-top-navigation-by-user-activation"
              allow="fullscreen; autoplay; clipboard-read; clipboard-write"
              onLoad={() => {
                console.log('[HTML5 Game] Loaded successfully:', contentUrl);
                setIframeError(null);
              }}
              onError={(e) => {
                console.error('[HTML5 Game] Load error:', e);
                setIframeError('Failed to load HTML5 game');
              }}
            />
            {iframeError && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/90 z-10">
                <div className="text-center max-w-md p-6">
                  <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">Failed to Load Game</h3>
                  <p className="mb-4">{iframeError}</p>
                  <div className="bg-card rounded p-3 mb-4 border border-border">
                    <p className="text-sm text-muted-foreground text-left">
                      <strong>URL:</strong> {contentUrl}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Check the browser console for more details.
                  </p>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <AlertCircle size={48} className="text-yellow-500 mx-auto mb-4" />
              <p>No content URL available for this game</p>
              <p className="text-sm text-muted-foreground mt-2">
                Launch command: {launchCommand || 'N/A'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
