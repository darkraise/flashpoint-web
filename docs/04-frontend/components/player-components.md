# Player Components

This document describes the game player components used to render Flash and
HTML5 games.

## Component Overview

The player architecture consists of two main components:

1. **GamePlayer** - Universal game player wrapper
2. **RufflePlayer** - Flash emulator component

## GamePlayer

Universal game player component that handles Flash (Ruffle) and HTML5 games.

### Location

`D:\Repositories\Personal\flashpoint-web\frontend\src\components\player\GamePlayer.tsx`

### Props

```typescript
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
```

### Features

1. **Multi-Platform Support**
   - Flash games via Ruffle emulator
   - HTML5 games via iframe
   - Fallback for unsupported platforms

2. **Fullscreen Mode**
   - Toggle fullscreen view
   - ESC key to exit fullscreen
   - Responsive controls

3. **Player Controls**
   - Platform indicator
   - Fullscreen toggle button
   - Keyboard shortcuts

4. **Error Handling**
   - Missing content detection
   - Platform compatibility checks
   - Iframe load error handling

### Usage

```typescript
import { GamePlayer } from '@/components/player/GamePlayer';

function GamePlayerView() {
  const { data: game } = useGame(gameId);
  const { data: launchData } = useGameLaunchData(gameId);

  return (
    <GamePlayer
      title={game.title}
      platform={game.platformName}
      contentUrl={launchData.contentUrl}
      launchCommand={launchData.launchCommand}
      canPlayInBrowser={launchData.canPlayInBrowser}
      allowFullscreen={true}
      showControls={true}
      height="calc(100vh - 220px)"
    />
  );
}
```

### Implementation Details

#### Platform Detection

```typescript
if (!canPlayInBrowser) {
  const isWebPlatform = platform === 'Flash' || platform === 'HTML5';
  const reason = isWebPlatform && !launchCommand
    ? 'This game is missing content data and cannot be played.'
    : `The ${platform} platform requires the Flashpoint Launcher.`;

  return (
    <div className="flex items-center justify-center">
      <AlertCircle />
      <h3>Cannot Play in Browser</h3>
      <p>{reason}</p>
    </div>
  );
}
```

#### Flash Game Rendering

```typescript
{platform === 'Flash' && contentUrl ? (
  <RufflePlayer
    swfUrl={contentUrl}
    width="100%"
    height="100%"
    className="w-full h-full"
    onLoadError={(error) => {
      console.error('Ruffle load error:', error);
    }}
    onLoadSuccess={() => {
      console.log('Ruffle loaded successfully');
    }}
  />
) : /* ... */}
```

#### HTML5 Game Rendering

```typescript
{platform === 'HTML5' && contentUrl ? (
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
) : /* ... */}
```

#### Fullscreen Toggle

```typescript
const toggleFullscreen = () => {
  const newFullscreenState = !isFullscreen;
  setIsFullscreen(newFullscreenState);
  onFullscreenChange?.(newFullscreenState);
};

// Sync with prop changes
useEffect(() => {
  setIsFullscreen(initialFullscreen);
}, [initialFullscreen]);
```

#### ESC Key Handler

```typescript
useEffect(() => {
  const handleEscKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && isFullscreen) {
      event.preventDefault();
      setIsFullscreen(false);
      onFullscreenChange?.(false);
    }
  };

  if (isFullscreen) {
    window.addEventListener('keydown', handleEscKey);
    return () => window.removeEventListener('keydown', handleEscKey);
  }
}, [isFullscreen, onFullscreenChange]);
```

### Fullscreen Styling

```typescript
const containerClasses = isFullscreen
  ? 'fixed inset-0 z-50 bg-black'
  : className;

<div
  style={{
    height: isFullscreen
      ? showControls ? 'calc(100vh - 64px)' : '100vh'
      : height,
    minHeight: isFullscreen ? 'auto' : '600px'
  }}
>
```

### Player Controls UI

```typescript
{showControls && (
  <div className="flex items-center justify-between bg-card/90 backdrop-blur-sm px-4 py-3">
    <div className="flex items-center gap-3">
      <Play size={18} className="text-primary" />
      <div>
        <span className="text-sm font-medium">
          {platform === 'Flash' ? 'Flash Player (Ruffle)' : platform}
        </span>
        <span className="text-xs text-muted-foreground">
          {isFullscreen ? 'Press ESC to exit fullscreen' : 'Click maximize for fullscreen'}
        </span>
      </div>
    </div>
    {allowFullscreen && (
      <button onClick={toggleFullscreen}>
        {isFullscreen ? <Minimize2 /> : <Maximize2 />}
      </button>
    )}
  </div>
)}
```

### HTML5 Sandbox Attributes

For security and functionality:

```
sandbox="
  allow-scripts               - Allow JavaScript
  allow-same-origin          - Allow same-origin access
  allow-forms                - Allow form submission
  allow-popups               - Allow popups
  allow-modals               - Allow modal dialogs
  allow-pointer-lock         - Allow pointer lock (for games)
  allow-top-navigation-by-user-activation  - Allow navigation (user-initiated only)
"

allow="
  fullscreen;                - Allow fullscreen API
  autoplay;                  - Allow autoplay
  clipboard-read;            - Allow clipboard read
  clipboard-write;           - Allow clipboard write
"
```

## RufflePlayer

Flash emulator component using Ruffle WebAssembly.

### Location

`D:\Repositories\Personal\flashpoint-web\frontend\src\components\player\RufflePlayer.tsx`

### Props

```typescript
export interface RufflePlayerProps {
  swfUrl: string;
  width?: string | number;
  height?: string | number;
  className?: string;
  onLoadError?: (error: Error) => void;
  onLoadSuccess?: () => void;
}
```

### Features

1. **Ruffle Integration**
   - Self-hosted Ruffle from `/ruffle/ruffle.js`
   - Automatic script loading
   - WebAssembly-based Flash emulation

2. **Lifecycle Management**
   - Proper cleanup on unmount
   - Navigation safety (no stale instances)
   - Multiple instance prevention

3. **Configuration**
   - Scale mode: `showAll` (maintain aspect ratio)
   - Letterboxing enabled
   - Context menu enabled
   - Error logging

4. **Loading States**
   - Loading spinner during initialization
   - Error display on failure
   - Success callbacks

### Implementation Details

#### Ruffle Initialization

```typescript
useEffect(() => {
  let mounted = true;
  let player: any = null;

  const initRuffle = async () => {
    if (!containerRef.current || isInitializingRef.current) {
      return;
    }

    isInitializingRef.current = true;

    try {
      // Wait for any previous cleanup
      await new Promise((resolve) => setTimeout(resolve, 100));

      if (!mounted) return;

      // Clean up existing player
      if (rufflePlayerRef.current) {
        const oldPlayer = rufflePlayerRef.current;
        rufflePlayerRef.current = null;

        if (typeof oldPlayer.destroy === 'function') {
          oldPlayer.destroy();
        } else {
          oldPlayer.remove();
        }

        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      // Load Ruffle script if not already loaded
      if (!(window as any).RufflePlayer) {
        const existingScript = document.querySelector(
          'script[src="/ruffle/ruffle.js"]'
        );

        if (!existingScript) {
          const script = document.createElement('script');
          script.src = '/ruffle/ruffle.js';

          await new Promise<void>((resolve, reject) => {
            script.onload = () => resolve();
            script.onerror = () =>
              reject(new Error('Failed to load Ruffle script'));
            document.head.appendChild(script);
          });
        }
      }

      // Wait for Ruffle to initialize
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Create player
      const RufflePlayer = (window as any).RufflePlayer;
      const ruffle = RufflePlayer.newest();
      player = ruffle.createPlayer();

      rufflePlayerRef.current = player;

      // Configure player
      player.config = {
        autoplay: 'auto',
        backgroundColor: '#000000',
        letterbox: 'on',
        unmuteOverlay: 'visible',
        contextMenu: true,
        scale: 'showAll',
        forceScale: true,
        quality: 'high',
        // ... more config
      };

      // Set size
      player.style.width = '100%';
      player.style.height = '100%';
      player.style.overflow = 'hidden';

      // Add to container
      containerRef.current.appendChild(player);

      // Load SWF
      await player.load(swfUrl);

      if (mounted) {
        setIsLoading(false);
        onLoadSuccessRef.current?.();
      }
    } catch (err) {
      if (mounted) {
        setError(err.message);
        setIsLoading(false);
        onLoadErrorRef.current?.(err);
      }
    } finally {
      isInitializingRef.current = false;
    }
  };

  initRuffle();

  // Cleanup
  return () => {
    mounted = false;
    isInitializingRef.current = false;

    const playerToCleanup = player || rufflePlayerRef.current;
    if (playerToCleanup) {
      if (typeof playerToCleanup.destroy === 'function') {
        playerToCleanup.destroy();
      } else {
        playerToCleanup.remove();
      }
    }
    rufflePlayerRef.current = null;

    // Clear container
    if (containerRef.current) {
      while (containerRef.current.firstChild) {
        containerRef.current.removeChild(containerRef.current.firstChild);
      }
    }
  };
}, [swfUrl]);
```

### Ruffle Configuration

```typescript
player.config = {
  autoplay: 'auto', // Auto-start playback
  backgroundColor: '#000000', // Black background
  letterbox: 'on', // Letterbox for aspect ratio
  unmuteOverlay: 'visible', // Show unmute button if needed
  contextMenu: true, // Enable right-click menu
  showSwfDownload: false, // Hide download option
  upgradeToHttps: window.location.protocol === 'https:',
  warnOnUnsupportedContent: true,
  logLevel: 'error', // Only log errors
  publicPath: '/ruffle/', // Path to Ruffle files
  scale: 'showAll', // Show all content, maintain aspect
  forceScale: true, // Prevent runtime scale changes
  quality: 'high', // High quality rendering
  allowScriptAccess: 'sameDomain',
  salign: '', // Center alignment
  wmode: 'opaque', // Opaque mode
};
```

### Scale Modes

Ruffle supports multiple scale modes (configured via `scale` option):

- **showAll** (Default) - Show entire content, maintain aspect ratio, add
  letterboxing if needed
- **noscale** - No scaling, 1:1 pixel mapping
- **exactfit** - Scale to fill container, ignore aspect ratio
- **noborder** - Scale to fill, maintain aspect, crop if needed

### Cleanup Strategy

The component implements a robust cleanup strategy to prevent memory leaks and
stale instances:

1. **Mount Flag** - Track if component is mounted
2. **Initialization Lock** - Prevent multiple simultaneous initializations
3. **Delay Before Init** - Wait 100ms to ensure previous cleanup completed
4. **Cleanup Existing Player** - Destroy old player before creating new one
5. **Delay After Cleanup** - Wait 200ms for Ruffle's internal cleanup
6. **Unmount Cleanup** - Destroy player and clear container on unmount

### Loading State UI

```typescript
{isLoading && (
  <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75 z-10">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
      <p className="text-white">Loading Flash game...</p>
      <p className="text-xs text-gray-400 mt-2">Powered by Ruffle</p>
    </div>
  </div>
)}
```

### Error State UI

```typescript
{error && (
  <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-90 z-10">
    <div className="text-center max-w-md p-6">
      <div className="text-red-500 text-5xl mb-4">⚠️</div>
      <h3 className="text-xl font-bold text-white mb-2">Failed to Load Game</h3>
      <p className="text-gray-300 mb-4">{error}</p>
      <div className="bg-gray-800 rounded p-3 mb-4">
        <p className="text-sm text-gray-400 text-left">
          <strong>URL:</strong> {swfUrl}
        </p>
      </div>
      <p className="text-sm text-gray-400">
        This game may require additional files or may not be compatible with Ruffle yet.
      </p>
    </div>
  </div>
)}
```

## Ruffle Installation

Ruffle files are copied from npm package during installation:

```json
// package.json
{
  "scripts": {
    "postinstall": "node copy-ruffle.js"
  }
}
```

```javascript
// copy-ruffle.js
const fs = require('fs-extra');
const path = require('path');

const source = path.join(__dirname, 'node_modules', 'ruffle-mirror');
const dest = path.join(__dirname, 'public', 'ruffle');

fs.copySync(source, dest);
console.log('✅ Ruffle files copied to public/ruffle/');
```

## Player Performance Considerations

### Flash Games (Ruffle)

- WebAssembly compilation on first load
- Memory usage depends on SWF complexity
- Cleanup is critical to prevent memory leaks
- Some games may have compatibility issues

### HTML5 Games

- iframe isolation (separate browsing context)
- Sandbox restrictions for security
- CORS may affect resource loading
- Less overhead than Flash emulation

## Debugging Players

### Console Logging

Both player components include extensive console logging:

```typescript
console.log('[GamePlayer] Loading ${platform} game:', {
  title,
  platform,
  contentUrl,
  canPlayInBrowser,
});
```

```typescript
console.log('[Ruffle] Loading SWF:', swfUrl);
console.log('[Ruffle] Cleanup: Component unmounting');
console.log('[Ruffle] Waiting for cleanup to complete...');
```

### Browser DevTools

- Check Network tab for SWF/asset loading
- Monitor Console for Ruffle errors
- Use Performance tab for memory leaks
- Inspect iframe content for HTML5 games

## Further Reading

- [GamePlayerView Documentation](../views-routing.md#gameplayerview)
- [Game Service Documentation](../../05-game-service/README.md)
- [Ruffle Documentation](https://ruffle.rs/demo/)
