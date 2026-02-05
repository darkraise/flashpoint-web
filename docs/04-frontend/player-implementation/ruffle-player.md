# Ruffle Player Implementation

Comprehensive documentation for the Ruffle Flash emulator component.

## Overview

Ruffle is a Flash Player emulator written in Rust and compiled to WebAssembly.
It allows Flash (.swf) content to run in modern browsers without plugins.

**Location:** `frontend/src/components/player/RufflePlayer.tsx`

## Architecture

```
RufflePlayer Component
├── Script Loading (ruffle.js from /public/ruffle/)
├── Player Initialization (RufflePlayer.newest())
├── Configuration (scale, quality, etc.)
├── Cleanup Strategy (destroy on unmount)
└── UI States (loading, error, success)
```

## Installation

Ruffle files are copied from npm package during installation:

```json
// package.json
{
  "scripts": {
    "postinstall": "node copy-ruffle.js"
  },
  "dependencies": {
    "ruffle-mirror": "^0.1.0"
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

## Component Props

```typescript
export interface RufflePlayerProps {
  swfUrl: string; // URL to .swf file
  width?: string | number; // Player width (default: '100%')
  height?: string | number; // Player height (default: '100%')
  className?: string; // Additional CSS classes
  onLoadError?: (error: Error) => void; // Error callback
  onLoadSuccess?: () => void; // Success callback
}
```

## Ruffle Configuration

```typescript
player.config = {
  autoplay: 'auto', // Auto-start playback
  backgroundColor: '#000000', // Black background
  letterbox: 'on', // Add letterboxing for aspect ratio
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

## Scale Modes

Ruffle supports multiple scale modes:

### showAll (Default)

- Shows entire content
- Maintains aspect ratio
- Adds letterboxing if needed
- **Best for most games**

### noscale

- No scaling
- 1:1 pixel mapping
- May cut off content

### exactfit

- Scales to fill container
- Ignores aspect ratio
- May distort content

### noborder

- Scales to fill container
- Maintains aspect ratio
- Crops content if needed

## Cleanup Strategy

The component implements a robust cleanup strategy to prevent memory leaks:

### 1. Mount Flag

```typescript
let mounted = true;

useEffect(() => {
  // ... initialization

  return () => {
    mounted = false;
    // ... cleanup
  };
}, [swfUrl]);
```

### 2. Initialization Lock

```typescript
const isInitializingRef = useRef(false);

if (isInitializingRef.current) {
  console.log('[Ruffle] Already initializing, skipping');
  return;
}

isInitializingRef.current = true;
```

### 3. Delay Before Initialization

```typescript
// Wait for any previous cleanup to complete
await new Promise((resolve) => setTimeout(resolve, 100));

if (!mounted) return;
```

### 4. Cleanup Existing Player

```typescript
if (rufflePlayerRef.current) {
  const oldPlayer = rufflePlayerRef.current;
  rufflePlayerRef.current = null;

  if (typeof oldPlayer.destroy === 'function') {
    oldPlayer.destroy();
  } else {
    oldPlayer.remove();
  }

  // Wait for Ruffle's internal cleanup
  await new Promise((resolve) => setTimeout(resolve, 200));
}
```

### 5. Unmount Cleanup

```typescript
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
```

## Loading States

### Loading UI

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

### Error UI

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

## Usage Example

```typescript
import { RufflePlayer } from '@/components/player/RufflePlayer';

function FlashGame() {
  return (
    <RufflePlayer
      swfUrl="/proxy/games/example-game.swf"
      width="100%"
      height="600px"
      onLoadSuccess={() => {
        console.log('Game loaded successfully');
      }}
      onLoadError={(error) => {
        console.error('Failed to load game:', error);
      }}
    />
  );
}
```

## Common Issues

### Issue: Game doesn't scale properly

**Solution:** Use `scale: 'showAll'` and `forceScale: true`

### Issue: Multiple player instances

**Solution:** Component includes cleanup delays and initialization locks

### Issue: Memory leaks on navigation

**Solution:** Component destroys player and clears container on unmount

### Issue: Black screen on load

**Solution:** Check browser console for errors, ensure SWF URL is correct

## Browser Console Logging

The component includes extensive logging for debugging:

```
[Ruffle] Waiting for any previous cleanup to complete...
[Ruffle] Cleaning up existing player instance
[Ruffle] Waiting for cleanup to complete...
[Ruffle] Loading SWF: /proxy/games/example.swf
[Ruffle] SWF loaded successfully
[Ruffle] Cleanup: Component unmounting
[Ruffle] Cleanup: Removing player instance
```

## Performance Considerations

- **Initial Load:** WebAssembly compilation on first load
- **Memory:** Depends on SWF complexity (typically 50-200MB)
- **CPU:** Real-time emulation requires modern CPU
- **Compatibility:** Some ActionScript 3 features may not be supported

## Ruffle Limitations

Not all Flash content is supported:

- Some ActionScript 3 features are incomplete
- 3D content may have issues
- Video playback may be limited
- Some external API calls won't work

Check [Ruffle Compatibility](https://ruffle.rs/#compatibility) for details.

## Further Reading

- [Ruffle Official Website](https://ruffle.rs/)
- [Ruffle GitHub](https://github.com/ruffle-rs/ruffle)
- [GamePlayer Component](../components/player-components.md)
