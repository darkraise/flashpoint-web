import { useEffect, useRef, useState } from "react";
import { logger } from "@/lib/logger";
import type { RufflePlayer as RufflePlayerType } from "@ruffle-rs/ruffle";

export interface RufflePlayerProps {
  swfUrl: string;
  width?: string | number;
  height?: string | number;
  className?: string;
  scaleMode?: "exactfit" | "noborder" | "showall" | "noscale";
  onLoadError?: (error: Error) => void;
  onLoadSuccess?: () => void;
}

export function RufflePlayer({
  swfUrl,
  width = "100%",
  height = "100%",
  className = "",
  scaleMode = "showall",
  onLoadError,
  onLoadSuccess,
}: RufflePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rufflePlayerRef = useRef<RufflePlayerType | null>(null);
  const isInitializingRef = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Store callbacks in refs to avoid re-running effect when they change
  const onLoadErrorRef = useRef(onLoadError);
  const onLoadSuccessRef = useRef(onLoadSuccess);

  // Update refs when callbacks change
  useEffect(() => {
    onLoadErrorRef.current = onLoadError;
    onLoadSuccessRef.current = onLoadSuccess;
  }, [onLoadError, onLoadSuccess]);

  useEffect(() => {
    let mounted = true;
    let player: RufflePlayerType | null = null;

    const initRuffle = async () => {
      if (!containerRef.current || isInitializingRef.current) {
        logger.debug("[Ruffle] Already initializing or no container, skipping");
        return;
      }

      isInitializingRef.current = true;

      try {
        setIsLoading(true);
        setError(null);

        // Give Ruffle time to clean up from previous instance (especially after navigation)
        // This ensures Ruffle's internal registry is fully cleared
        logger.debug("[Ruffle] Waiting for any previous cleanup to complete...");
        await new Promise((resolve) => setTimeout(resolve, 100));

        if (!mounted) {
          isInitializingRef.current = false;
          return;
        }

        // Clean up any existing player before creating a new one
        if (rufflePlayerRef.current) {
          try {
            logger.debug("[Ruffle] Cleaning up existing player instance");
            // Try to destroy the player more thoroughly
            const oldPlayer = rufflePlayerRef.current;
            rufflePlayerRef.current = null;

            // Call destroy if available, otherwise remove
            if (typeof oldPlayer.destroy === "function") {
              oldPlayer.destroy();
            } else {
              oldPlayer.remove();
            }

            // Give Ruffle additional time to clean up internal state
            logger.debug("[Ruffle] Waiting for cleanup to complete...");
            await new Promise((resolve) => setTimeout(resolve, 200));
          } catch (err) {
            logger.warn("[Ruffle] Error cleaning up existing player:", err);
          }
        }

        if (!mounted) {
          isInitializingRef.current = false;
          return;
        }

        // Load Ruffle script from self-hosted location (only if not already loaded)
        if (!(window as any).RufflePlayer) {
          const existingScript = document.querySelector(
            'script[src="/ruffle/ruffle.js"]',
          );

          if (!existingScript) {
            const script = document.createElement("script");
            script.src = "/ruffle/ruffle.js";

            // Wait for script to load
            await new Promise<void>((resolve, reject) => {
              script.onload = () => resolve();
              script.onerror = () =>
                reject(new Error("Failed to load Ruffle script"));
              document.head.appendChild(script);
            });
          }
        }

        if (!mounted) return;

        // Wait for Ruffle to initialize
        await new Promise((resolve) => setTimeout(resolve, 200));

        // Access Ruffle from window
        const RufflePlayer = (window as any).RufflePlayer;

        if (!RufflePlayer) {
          throw new Error(
            "RufflePlayer not found. The Ruffle library may not have loaded correctly.",
          );
        }

        // Get the newest version
        const ruffle = RufflePlayer.newest();

        if (!ruffle) {
          throw new Error("Could not initialize Ruffle player.");
        }

        // Create player instance
        player = ruffle.createPlayer();

        if (!player) {
          throw new Error("Could not create Ruffle player instance.");
        }

        // Store reference
        rufflePlayerRef.current = player;

        // Configure player for better scaling
        player.config = {
          autoplay: "auto",
          backgroundColor: "#000000",
          letterbox: "on", // Add letterboxing to properly frame content
          unmuteOverlay: "visible",
          contextMenu: true,
          showSwfDownload: false,
          upgradeToHttps: window.location.protocol === "https:",
          warnOnUnsupportedContent: true,
          logLevel: "error",
          publicPath: "/ruffle/",
          scale: scaleMode, // Use scale mode from props (from system settings)
          forceScale: true, // Prevent SWF from changing scale mode at runtime
          quality: "high",
          allowScriptAccess: "sameDomain",
          salign: "", // Default alignment (center)
          wmode: "opaque", // Opaque mode to prevent transparency issues
        };


        // Set explicit size to fill container with overflow clipping
        player.style.width = "100%";
        player.style.height = "100%";
        player.style.display = "block";
        player.style.overflow = "hidden"; // Clip any content extending beyond player bounds

        // Add player to container (only if still mounted and container exists)
        if (!mounted || !containerRef.current) {
          logger.debug(
            "[Ruffle] Component unmounted during initialization, aborting",
          );
          if (player) {
            try {
              player.remove();
            } catch (err) {
              logger.error(
                "[Ruffle] Error removing player during abort:",
                err,
              );
            }
          }
          isInitializingRef.current = false;
          return;
        }

        // Remove existing children properly instead of using innerHTML
        while (containerRef.current.firstChild) {
          containerRef.current.removeChild(containerRef.current.firstChild);
        }
        containerRef.current.appendChild(player);

        // Load SWF (check mounted again before async operation)
        if (!mounted) {
          logger.debug("[Ruffle] Component unmounted before load, aborting");
          if (player) {
            try {
              player.remove();
            } catch (err) {
              logger.error(
                "[Ruffle] Error removing player during abort:",
                err,
              );
            }
          }
          isInitializingRef.current = false;
          return;
        }

        logger.debug("[Ruffle] Loading SWF:", swfUrl);
        await player.load(swfUrl);

        if (mounted) {
          setIsLoading(false);
          onLoadSuccessRef.current?.();
          logger.debug("[Ruffle] SWF loaded successfully");
        }
      } catch (err) {
        logger.error("[Ruffle] Error loading SWF:", err);

        if (mounted) {
          const errorMsg =
            err instanceof Error ? err.message : "Failed to load Flash content";
          setError(errorMsg);
          setIsLoading(false);
          onLoadErrorRef.current?.(
            err instanceof Error ? err : new Error(errorMsg),
          );
        }
      } finally {
        isInitializingRef.current = false;
      }
    };

    initRuffle();

    // Cleanup
    return () => {
      logger.debug("[Ruffle] Cleanup: Component unmounting");
      mounted = false;
      isInitializingRef.current = false;

      // Clean up the player instance
      const playerToCleanup = player || rufflePlayerRef.current;
      if (playerToCleanup) {
        try {
          logger.debug("[Ruffle] Cleanup: Removing player instance");
          // Try destroy first if available, otherwise remove
          if (typeof playerToCleanup.destroy === "function") {
            playerToCleanup.destroy();
          } else {
            playerToCleanup.remove();
          }
        } catch (err) {
          logger.error("[Ruffle] Error removing player:", err);
        }
      }
      rufflePlayerRef.current = null;

      // Clear the container to ensure no stale DOM elements remain
      if (containerRef.current) {
        try {
          while (containerRef.current.firstChild) {
            containerRef.current.removeChild(containerRef.current.firstChild);
          }
        } catch (err) {
          logger.error("[Ruffle] Error clearing container:", err);
        }
      }
    };
  }, [swfUrl]); // Only depend on swfUrl - callbacks are stable or for logging only

  // Update scale mode when it changes (requires reloading the SWF)
  useEffect(() => {
    if (rufflePlayerRef.current && scaleMode) {
      const player = rufflePlayerRef.current;
      if (player.config) {
        player.config.scale = scaleMode;
        player.config.forceScale = true;
        logger.debug("[Ruffle] Scale mode updated to:", scaleMode);
        // Note: Scale mode changes may require reloading the SWF to take effect
      }
    }
  }, [scaleMode]);

  return (
    <div
      className={`ruffle-player-container relative h-full overflow-hidden ${className}`}
    >
      <div
        ref={containerRef}
        style={{
          width: typeof width === "number" ? `${width}px` : width,
          height: typeof height === "number" ? `${height}px` : height,
          position: "relative",
          overflow: "hidden", // Clip any content that extends beyond container bounds
        }}
        className="ruffle-player-wrapper"
      />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75 z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
            <p className="text-white">Loading Flash game...</p>
            <p className="text-xs text-gray-400 mt-2">Powered by Ruffle</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-90 z-10">
          <div className="text-center max-w-md p-6">
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <h3 className="text-xl font-bold text-white mb-2">
              Failed to Load Game
            </h3>
            <p className="text-gray-300 mb-4">{error}</p>
            <div className="bg-gray-800 rounded p-3 mb-4">
              <p className="text-sm text-gray-400 text-left">
                <strong>URL:</strong> {swfUrl}
              </p>
            </div>
            <p className="text-sm text-gray-400">
              This game may require additional files or may not be compatible
              with Ruffle yet.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
