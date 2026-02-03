# Game Playing

## Overview

Game playing enables users to play Flash and HTML5 games directly in their web
browser. Flash games use the Ruffle WebAssembly emulator, while HTML5 games run
natively. The player supports fullscreen mode, loading indicators, and error
handling.

## Architecture

**Backend Components:**

- Game Service: Provides game data and launch configuration
- Game-Service Proxy: Serves game files (ports 22500/22501)
- HTTP Proxy Server: Handles Flash content delivery
- GameZip Server: Mounts and serves files from ZIP archives

**Frontend Components:**

- `GamePlayer`: Main player component (reusable)
- `RufflePlayer`: Ruffle Flash emulator wrapper
- `GamePlayerView`: Full-page player route
- `GameDetailView`: Game details with embedded player
- `GamePlayerDialog`: Modal player overlay

## Supported Platforms

- **Flash Games:** Played using Ruffle emulator (WebAssembly)
- **HTML5 Games:** Played natively in iframe
- **Animations:** Flash animations (library: "theatre")

## Game Launch Process

**Step 1: Fetch Launch Data**

```
GET /api/games/:id/launch
```

Backend:

1. Fetch game from flashpoint.sqlite
2. Check if game has data on disk
3. Auto-mount ZIP file if needed
4. Extract launch command from game metadata
5. Construct content URL via game-service proxy
6. Return launch configuration

**Step 2: Initialize Player**

- Check if game can play in browser (canPlayInBrowser)
- Select appropriate player (Ruffle vs iframe)
- Mount player component

**Step 3: Load Content**

- **Flash:** Ruffle loads SWF from proxy URL
- **HTML5:** Iframe loads game page from proxy URL
- Game service proxies requests to local files or CDN

**Step 4: Track Session**

- POST /api/play/start with gameId
- Backend creates play session record
- Returns sessionId

**Step 5: Play**

- User interacts with game
- All game assets served through proxy

**Step 6: End Session**

- User closes player or navigates away
- POST /api/play/end with sessionId
- Backend calculates duration and updates stats

## API Endpoints

#### GET /api/games/:id/launch

Get game launch configuration.

**Response:**

```json
{
  "gameId": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Super Mario Flash",
  "platform": "Flash",
  "launchCommand": "http://uploads.ungrounded.net/396000/396724_DAplayer_V6.swf",
  "contentUrl": "http://localhost:22500/http://uploads.ungrounded.net/396000/396724_DAplayer_V6.swf",
  "applicationPath": ":http: :message:",
  "playMode": "Single Player",
  "canPlayInBrowser": true
}
```

**For games without content:**

```json
{
  "gameId": "...",
  "title": "Some Windows Game",
  "platform": "Windows",
  "launchCommand": "game.exe",
  "contentUrl": "",
  "canPlayInBrowser": false
}
```

## Ruffle Integration

Ruffle is a Flash Player emulator written in Rust and compiled to WebAssembly.

**Installation:**

- Installed from npm package `@ruffle-rs/ruffle`
- Files copied to `frontend/public/ruffle/` during postinstall
- Includes: ruffle.js, ruffle_web.wasm, ruffle_web.js

**RufflePlayer Component:**

```typescript
interface RufflePlayerProps {
  swfUrl: string; // URL to SWF file
  width?: string; // Player width
  height?: string; // Player height
  className?: string; // CSS classes
  scaleMode?: ScaleMode; // Scaling behavior
  onLoadError?: (error: Error) => void;
  onLoadSuccess?: () => void;
}

type ScaleMode = 'exactfit' | 'noborder' | 'showall' | 'noscale';
```

**Ruffle Configuration:**

```typescript
const ruffleConfig = {
  autoplay: 'auto',
  backgroundColor: '#000000',
  letterbox: 'fullscreen',
  warnOnUnsupportedContent: true,
  logLevel: 'warn',
  showSwfDownload: false,
};
```

## HTML5 Game Loading

HTML5 games load in a sandboxed iframe:

```typescript
<iframe
  src={contentUrl}
  className="w-full h-full border-0"
  title={gameTitle}
  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-pointer-lock allow-top-navigation-by-user-activation"
  allow="fullscreen; autoplay; clipboard-read; clipboard-write"
/>
```

**Sandbox Permissions:**

- allow-scripts, allow-same-origin, allow-forms
- allow-popups, allow-modals, allow-pointer-lock
- allow-top-navigation-by-user-activation

## Game Service Proxy

**HTTP Proxy Server (Port 22500):**

- Serves legacy web content
- Fallback chain:
  1. Local htdocs folder
  2. Game data directory
  3. ZIP archives
  4. External CDN
  5. Local cache for downloaded content

**Example Request Flow:**

```
Browser: GET http://localhost:22500/http://uploads.ungrounded.net/396000/396724_DAplayer_V6.swf
Proxy: Check local htdocs, game data, mounted ZIPs, fetch from CDN if needed
Response: File with correct MIME type
```

**GameZip Server (Port 22501):**

- Mounts ZIP files from Data/Games/
- Streams files without extraction
- Uses node-stream-zip for efficiency
- 199+ file types supported

## Fullscreen Implementation

```typescript
const toggleFullscreen = () => {
  setIsFullscreen(!isFullscreen);
};

useEffect(() => {
  const handleEscKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && isFullscreen) {
      e.preventDefault();
      setIsFullscreen(false);
    }
  };

  if (isFullscreen) {
    window.addEventListener('keydown', handleEscKey);
    return () => window.removeEventListener('keydown', handleEscKey);
  }
}, [isFullscreen]);
```

## Ruffle Scale Modes

| Mode              | Behavior                                 | Use Case               |
| ----------------- | ---------------------------------------- | ---------------------- |
| showall (default) | Maintains aspect ratio with letterboxing | Most games             |
| exactfit          | Stretches to fill container              | Full-screen games      |
| noborder          | Maintains aspect ratio, crops if needed  | No letterboxing needed |
| noscale           | Original game dimensions                 | Pixel-perfect games    |

## Common Use Cases

### 1. Play Flash Game

```tsx
const navigate = useNavigate();
navigate(`/games/${gameId}/play`);

// GamePlayerView loads, fetches launch data, initializes Ruffle, starts session
```

### 2. Play HTML5 Game

```tsx
// Same flow as Flash, uses iframe instead of Ruffle
```

### 3. Fullscreen Mode

```tsx
toggleFullscreen();
// Player expands to fill screen, ESC to exit
```

### 4. Handle Unplayable Game

```tsx
if (!launchData.canPlayInBrowser) {
  // Show error message
  // Display platform requirements
  // Suggest using Flashpoint Launcher
}
```

### 5. Track Play Session

```typescript
const { startSession, endSession } = usePlayTracking();

useEffect(() => {
  let sessionId: string;

  const initSession = async () => {
    sessionId = await startSession(gameId, gameTitle);
  };

  initSession();

  return () => {
    if (sessionId) endSession(sessionId);
  };
}, [gameId, gameTitle]);
```

## Error Handling

**Flash Load Errors:**

```typescript
onLoadError={(error) => {
  console.error('Ruffle error:', error);
  // Show error message
  // Suggest alternatives
}}
```

**HTML5 Load Errors:**

```typescript
<iframe
  onError={() => {
    setIframeError('Failed to load HTML5 game');
  }}
/>
```

**No Content Available:**

- Display alert with launch command
- Show message "Cannot play in browser"

## Best Practices

1. Always track play sessions for analytics
2. Show loading states while game initializes
3. Handle errors gracefully with user-friendly messages
4. Use fullscreen wisely - provide ESC hint
5. Optimize for mobile - touch controls, responsive sizing
6. Cache Ruffle files in public directory
7. Monitor performance - track load times
8. Test with various games - different SWF versions

## Troubleshooting

**Ruffle not loading:**

- Verify ruffle.js is in public/ruffle/
- Check browser console for errors
- Ensure WebAssembly is supported
- Update Ruffle to latest version

**Black screen on Flash games:**

- Check contentUrl is correct
- Verify game file exists in htdocs or ZIPs
- Inspect network requests for 404s
- Check CORS headers from proxy

**HTML5 games not loading:**

- Verify iframe sandbox permissions
- Check for mixed content warnings
- Inspect browser console for errors
- Test content URL directly

**Fullscreen not working:**

- Verify fullscreen button handler
- Check CSS z-index conflicts
- Ensure ESC key listener attached
- Test browser fullscreen API support
