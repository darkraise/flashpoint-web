import { useEffect, useRef, useState } from 'react';
import { logger } from '@/lib/logger';
import type { RufflePlayer as RufflePlayerType } from '@ruffle-rs/ruffle';

declare global {
  interface Window {
    RufflePlayer?: {
      newest(): { createPlayer(): RufflePlayerType } | null;
    };
  }
}

export interface RufflePlayerProps {
  swfUrl: string;
  width?: string | number;
  height?: string | number;
  className?: string;
  scaleMode?: 'exactfit' | 'noborder' | 'showall' | 'noscale';
  onLoadError?: (error: Error) => void;
  onLoadSuccess?: () => void;
}

export function RufflePlayer({
  swfUrl,
  width = '100%',
  height = '100%',
  className = '',
  scaleMode = 'showall',
  onLoadError,
  onLoadSuccess,
}: RufflePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rufflePlayerRef = useRef<RufflePlayerType | null>(null);
  const isInitializingRef = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const onLoadErrorRef = useRef(onLoadError);
  const onLoadSuccessRef = useRef(onLoadSuccess);

  useEffect(() => {
    onLoadErrorRef.current = onLoadError;
    onLoadSuccessRef.current = onLoadSuccess;
  }, [onLoadError, onLoadSuccess]);

  useEffect(() => {
    let mounted = true;
    let player: RufflePlayerType | null = null;

    const initRuffle = async () => {
      if (!containerRef.current || isInitializingRef.current) {
        logger.debug('[Ruffle] Already initializing or no container, skipping');
        return;
      }

      isInitializingRef.current = true;

      try {
        setIsLoading(true);
        setError(null);

        // Delay to ensure previous Ruffle instance is fully destroyed before creating new one.
        // Ruffle's cleanup is asynchronous and there's no completion callback or readiness API.
        // This prevents race conditions where a new player is created before the old one finishes cleanup.
        logger.debug('[Ruffle] Waiting for any previous cleanup to complete...');
        await new Promise((resolve) => setTimeout(resolve, 100));

        if (!mounted) {
          isInitializingRef.current = false;
          return;
        }

        if (rufflePlayerRef.current) {
          try {
            logger.debug('[Ruffle] Cleaning up existing player instance');
            const oldPlayer = rufflePlayerRef.current;
            rufflePlayerRef.current = null;

            if (typeof oldPlayer.destroy === 'function') {
              oldPlayer.destroy();
            } else {
              oldPlayer.remove();
            }

            // Additional delay for Ruffle's internal state cleanup to complete.
            // Ruffle manages internal registries and workers that require async cleanup.
            // Without this delay, creating a new player too quickly can cause conflicts.
            logger.debug('[Ruffle] Waiting for cleanup to complete...');
            await new Promise((resolve) => setTimeout(resolve, 200));
          } catch (err) {
            logger.warn('[Ruffle] Error cleaning up existing player:', err);
          }
        }

        if (!mounted) {
          isInitializingRef.current = false;
          return;
        }

        if (!window.RufflePlayer) {
          const existingScript = document.querySelector('script[src="/ruffle/ruffle.js"]');

          if (!existingScript) {
            const script = document.createElement('script');
            script.src = '/ruffle/ruffle.js';

            await new Promise<void>((resolve, reject) => {
              script.onload = () => resolve();
              script.onerror = () => reject(new Error('Failed to load Ruffle script'));
              document.head.appendChild(script);
            });
          }
        }

        if (!mounted) return;

        // Wait for Ruffle to initialize after script load.
        // RufflePlayer registers itself asynchronously on window after script execution.
        // This delay ensures the global API is fully available before attempting to use it.
        await new Promise((resolve) => setTimeout(resolve, 200));

        const RufflePlayer = window.RufflePlayer;

        if (!RufflePlayer) {
          throw new Error(
            'RufflePlayer not found. The Ruffle library may not have loaded correctly.'
          );
        }

        const ruffle = RufflePlayer.newest();

        if (!ruffle) {
          throw new Error('Could not initialize Ruffle player.');
        }

        player = ruffle.createPlayer();

        if (!player) {
          throw new Error('Could not create Ruffle player instance.');
        }

        rufflePlayerRef.current = player;

        player.config = {
          autoplay: 'auto',
          backgroundColor: '#000000',
          letterbox: 'on',
          unmuteOverlay: 'visible',
          contextMenu: true,
          showSwfDownload: false,
          upgradeToHttps: window.location.protocol === 'https:',
          warnOnUnsupportedContent: true,
          logLevel: 'error',
          publicPath: '/ruffle/',
          scale: scaleMode,
          forceScale: true,
          quality: 'high',
          allowScriptAccess: 'sameDomain',
          salign: '',
          wmode: 'opaque',
        };

        player.style.width = '100%';
        player.style.height = '100%';
        player.style.display = 'block';
        player.style.overflow = 'hidden';

        if (!mounted || !containerRef.current) {
          logger.debug('[Ruffle] Component unmounted during initialization, aborting');
          if (player) {
            try {
              player.remove();
            } catch (err) {
              logger.error('[Ruffle] Error removing player during abort:', err);
            }
          }
          isInitializingRef.current = false;
          return;
        }

        while (containerRef.current.firstChild) {
          containerRef.current.removeChild(containerRef.current.firstChild);
        }
        containerRef.current.appendChild(player);

        if (!mounted) {
          logger.debug('[Ruffle] Component unmounted before load, aborting');
          if (player) {
            try {
              player.remove();
            } catch (err) {
              logger.error('[Ruffle] Error removing player during abort:', err);
            }
          }
          isInitializingRef.current = false;
          return;
        }

        logger.debug('[Ruffle] Loading SWF:', swfUrl);
        await player.load(swfUrl);

        if (mounted) {
          setIsLoading(false);
          onLoadSuccessRef.current?.();
          logger.debug('[Ruffle] SWF loaded successfully');
        }
      } catch (err) {
        logger.error('[Ruffle] Error loading SWF:', err);

        if (mounted) {
          const errorMsg = err instanceof Error ? err.message : 'Failed to load Flash content';
          setError(errorMsg);
          setIsLoading(false);
          onLoadErrorRef.current?.(err instanceof Error ? err : new Error(errorMsg));
        }
      } finally {
        isInitializingRef.current = false;
      }
    };

    initRuffle();

    return () => {
      logger.debug('[Ruffle] Cleanup: Component unmounting');
      mounted = false;
      isInitializingRef.current = false;

      const playerToCleanup = player || rufflePlayerRef.current;
      if (playerToCleanup) {
        try {
          logger.debug('[Ruffle] Cleanup: Removing player instance');
          if (typeof playerToCleanup.destroy === 'function') {
            playerToCleanup.destroy();
          } else {
            playerToCleanup.remove();
          }
        } catch (err) {
          logger.error('[Ruffle] Error removing player:', err);
        }
      }
      rufflePlayerRef.current = null;

      if (containerRef.current) {
        try {
          while (containerRef.current.firstChild) {
            containerRef.current.removeChild(containerRef.current.firstChild);
          }
        } catch (err) {
          logger.error('[Ruffle] Error clearing container:', err);
        }
      }
    };
  }, [swfUrl, scaleMode]);

  return (
    <div className={`ruffle-player-container relative h-full overflow-hidden ${className}`}>
      <div
        ref={containerRef}
        style={{
          width: typeof width === 'number' ? `${width}px` : width,
          height: typeof height === 'number' ? `${height}px` : height,
          position: 'relative',
          overflow: 'hidden',
        }}
        className="ruffle-player-wrapper"
      />

      {isLoading ? (
        <div
          className="absolute inset-0 flex items-center justify-center bg-background/90 z-10"
          role="status"
          aria-label="Loading Flash game"
        >
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-foreground">Loading Flash game...</p>
            <p className="text-xs text-muted-foreground mt-2">Powered by Ruffle</p>
          </div>
        </div>
      ) : null}

      {error ? (
        <div
          className="absolute inset-0 flex items-center justify-center bg-background/95 z-10"
          role="alert"
        >
          <div className="text-center max-w-md p-6">
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <h3 className="text-xl font-bold text-foreground mb-2">Failed to Load Game</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <div className="bg-muted rounded p-3 mb-4">
              <p className="text-sm text-muted-foreground text-left">
                <strong>URL:</strong> {swfUrl}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              This game may require additional files or may not be compatible with Ruffle yet.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
