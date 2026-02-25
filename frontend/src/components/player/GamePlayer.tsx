import { useState, useEffect, useRef, useMemo } from 'react';
import { logger } from '@/lib/logger';
import { AlertCircle, Maximize2, Minimize2, Loader2, ArrowLeft } from 'lucide-react';
import { RufflePlayer } from './RufflePlayer';
import { PlayerErrorBoundary } from './PlayerErrorBoundary';
import { PlatformIcon } from '@/components/ui/platform-icon';

export interface GamePlayerProps {
  title: string;
  platform: string;
  contentUrl?: string;
  launchCommand?: string;
  canPlayInBrowser: boolean;
  allowFullscreen?: boolean;
  initialFullscreen?: boolean;
  onFullscreenChange?: (isFullscreen: boolean) => void;
  className?: string;
  showControls?: boolean;
  /** CSS value (e.g. "calc(100vh - 220px)" or "aspect-video") */
  height?: string;
  /** Game logo URL for the banner */
  logoUrl?: string;
  /** Developer name for the banner */
  developer?: string;
  /** Callback for back button (shown in fullscreen mode) */
  onBack?: () => void;
}

/**
 * Internal game player component that can render Flash (Ruffle) or HTML5 games.
 * Can be embedded in pages or dialogs.
 *
 * Note: Use the default export (wrapped with PlayerErrorBoundary) instead of this component directly.
 */
function GamePlayerInternal({
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
  logoUrl,
  developer,
  onBack,
}: GamePlayerProps) {
  const [isFullscreen, setIsFullscreen] = useState(initialFullscreen);
  const [iframeError, setIframeError] = useState<string | null>(null);
  const [logoLoading, setLogoLoading] = useState(true);
  const [logoError, setLogoError] = useState(false);

  const defaultScaleMode = 'showall';

  const toggleFullscreen = () => {
    const newFullscreenState = !isFullscreen;
    setIsFullscreen(newFullscreenState);
    onFullscreenChange?.(newFullscreenState);
  };

  const prevInitialFullscreenRef = useRef(initialFullscreen);
  useEffect(() => {
    if (prevInitialFullscreenRef.current !== initialFullscreen) {
      setIsFullscreen(initialFullscreen);
      prevInitialFullscreenRef.current = initialFullscreen;
    }
  }, [initialFullscreen]);

  const onFullscreenChangeRef = useRef(onFullscreenChange);
  useEffect(() => {
    onFullscreenChangeRef.current = onFullscreenChange;
  }, [onFullscreenChange]);

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullscreen) {
        event.preventDefault();
        setIsFullscreen(false);
        onFullscreenChangeRef.current?.(false);
      }
    };

    if (isFullscreen) {
      window.addEventListener('keydown', handleEscKey);
      return () => window.removeEventListener('keydown', handleEscKey);
    }
  }, [isFullscreen]);

  useEffect(() => {
    if (contentUrl) {
      logger.debug(`[GamePlayer] Loading ${platform} game:`, {
        contentUrl,
        scaleMode: defaultScaleMode,
      });
    }
  }, [contentUrl, platform]);

  if (!canPlayInBrowser) {
    const isWebPlatform = platform === 'Flash' || platform === 'HTML5';

    let reason: string;
    let details: string;

    if (isWebPlatform && !launchCommand) {
      reason = 'This game is missing content data and cannot be played.';
      details =
        'This game entry is incomplete. Try launching it from the Flashpoint Launcher instead.';
    } else {
      reason = `The ${platform} platform requires the Flashpoint Launcher.`;
      details = 'Only Flash and HTML5 games with valid content can be played in the browser.';
    }

    return (
      <div
        className={`flex items-center justify-center bg-card border border-border rounded-lg p-8 ${className}`}
      >
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

  const containerClasses = isFullscreen ? 'fixed inset-0 z-50 bg-black' : className;

  const isAspectVideo = height === 'aspect-video';

  // Determine Flash content type: direct SWF vs HTML wrapper
  // HTML wrappers (index.html, .html, .htm) need iframe, not Ruffle
  const flashContentType = useMemo(() => {
    if (platform !== 'Flash' || !contentUrl) return null;

    const urlPath = contentUrl.toLowerCase();
    const isSwfUrl = urlPath.includes('.swf');
    const isHtmlWrapper =
      urlPath.includes('.html') || urlPath.includes('.htm') || urlPath.endsWith('/');

    if (isSwfUrl && !isHtmlWrapper) {
      return 'swf' as const;
    }
    return 'html-wrapper' as const;
  }, [platform, contentUrl]);

  return (
    <div className={`${containerClasses} ${isAspectVideo ? 'flex flex-col' : ''}`}>
      {showControls ? (
        <div
          className={`flex items-center justify-between bg-card/90 backdrop-blur-sm flex-shrink-0 border-b border-border ${
            isFullscreen ? 'px-4 py-3' : 'px-6 py-4'
          }`}
        >
          <div className={`flex items-center ${isFullscreen ? 'gap-3' : 'gap-4'}`}>
            {/* Back button - only in fullscreen mode */}
            {isFullscreen && onBack ? (
              <button
                onClick={onBack}
                className="p-2 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors flex-shrink-0"
                title="Back"
                aria-label="Go back"
              >
                <ArrowLeft size={18} />
              </button>
            ) : null}

            {/* Game Logo */}
            {logoUrl && !logoError ? (
              <div
                className={`flex-shrink-0 bg-muted rounded-lg overflow-hidden flex items-center justify-center relative ${
                  isFullscreen ? 'w-10 h-10 p-1' : 'w-14 h-14 p-1.5'
                }`}
              >
                {logoLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
                    <Loader2
                      size={isFullscreen ? 14 : 16}
                      className="text-muted-foreground animate-spin"
                    />
                  </div>
                ) : null}
                <img
                  src={logoUrl}
                  alt={`${title} logo`}
                  className="w-full h-full object-contain relative z-10"
                  onLoad={() => setLogoLoading(false)}
                  onError={() => {
                    setLogoError(true);
                    setLogoLoading(false);
                  }}
                />
              </div>
            ) : null}

            {/* Game Info */}
            <div className="flex-1 min-w-0">
              <h1 className={`font-semibold truncate ${isFullscreen ? 'text-sm' : 'text-lg'}`}>
                {title}
              </h1>
              <div
                className={`flex items-center gap-2 text-muted-foreground ${
                  isFullscreen ? 'text-xs' : 'text-sm'
                }`}
              >
                {developer ? (
                  <>
                    <span className="truncate">by {developer}</span>
                    <span>•</span>
                  </>
                ) : null}
                <PlatformIcon platformName={platform} size={isFullscreen ? 14 : 16} />
                {isFullscreen ? <span className="hidden sm:inline">• Press ESC to exit</span> : null}
              </div>
            </div>
          </div>

          {allowFullscreen ? (
            <button
              onClick={toggleFullscreen}
              className="flex items-center gap-2 px-3 py-2 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors flex-shrink-0"
              title={isFullscreen ? 'Exit Fullscreen (ESC)' : 'Enter Fullscreen'}
              aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 size={18} />
                  <span className="text-sm hidden sm:inline">Exit</span>
                </>
              ) : (
                <>
                  <Maximize2 size={18} />
                  <span className="text-sm hidden sm:inline">Fullscreen</span>
                </>
              )}
            </button>
          ) : null}
        </div>
      ) : null}

      <div
        className={`bg-black relative ${isAspectVideo ? 'flex-1 min-h-0' : ''}`}
        style={
          isAspectVideo
            ? {}
            : {
                height: isFullscreen ? (showControls ? 'calc(100vh - 64px)' : '100vh') : height,
                minHeight: isFullscreen ? 'auto' : '600px',
              }
        }
      >
        {/* Flash SWF - use Ruffle emulator */}
        {flashContentType === 'swf' && contentUrl ? (
          <RufflePlayer
            swfUrl={contentUrl}
            width="100%"
            height="100%"
            className="w-full h-full"
            scaleMode={defaultScaleMode}
            onLoadError={(error) => {
              logger.error('Ruffle load error:', error);
            }}
            onLoadSuccess={() => {
              logger.debug('Ruffle loaded successfully');
            }}
          />
        ) : /* Flash HTML wrapper - use iframe */ flashContentType === 'html-wrapper' &&
          contentUrl ? (
          <>
            <iframe
              src={contentUrl}
              className="w-full h-full border-0"
              title={title}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-pointer-lock allow-top-navigation-by-user-activation"
              allow="fullscreen; autoplay; clipboard-read; clipboard-write"
              onLoad={() => {
                logger.debug('[Flash HTML Wrapper] Loaded successfully:', contentUrl);
                setIframeError(null);
              }}
              onError={(e) => {
                logger.error('[Flash HTML Wrapper] Load error:', e);
                setIframeError('Failed to load Flash game');
              }}
            />
            {iframeError ? (
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
            ) : null}
          </>
        ) : /* HTML5 game - use iframe */ platform === 'HTML5' && contentUrl ? (
          <>
            <iframe
              src={contentUrl}
              className="w-full h-full border-0"
              title={title}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-pointer-lock allow-top-navigation-by-user-activation"
              allow="fullscreen; autoplay; clipboard-read; clipboard-write"
              onLoad={() => {
                logger.debug('[HTML5 Game] Loaded successfully:', contentUrl);
                setIframeError(null);
              }}
              onError={(e) => {
                logger.error('[HTML5 Game] Load error:', e);
                setIframeError('Failed to load HTML5 game');
              }}
            />
            {iframeError ? (
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
            ) : null}
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

/**
 * Game player component wrapped with error boundary for crash protection.
 * This prevents errors in the Ruffle emulator or game content from taking down the entire app.
 *
 * @example
 * ```tsx
 * <GamePlayer
 *   title="My Flash Game"
 *   platform="Flash"
 *   contentUrl="/game.swf"
 *   canPlayInBrowser={true}
 * />
 * ```
 */
export function GamePlayer(props: GamePlayerProps) {
  return (
    <PlayerErrorBoundary>
      <GamePlayerInternal {...props} />
    </PlayerErrorBoundary>
  );
}
