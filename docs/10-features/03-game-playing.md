# Game Playing

## Overview

Game playing enables users to play Flash and HTML5 games directly in their web
browser. Flash games use the Ruffle WebAssembly emulator, while HTML5 games run
natively. The player supports fullscreen mode, loading indicators, and error
handling.

## Architecture

**Backend Components:**

- Game Service: Provides game data and launch configuration
- Game Content Routes: Serves game files via `/game-proxy/*` and `/game-zip/*`
- HTTP Proxy Server: Handles Flash content delivery
- GameZip Server: Mounts and serves files from ZIP archives

**Frontend Components:**

- `GamePlayer`: Main player component (reusable)
- `RufflePlayer`: Ruffle Flash emulator wrapper
- `GamePlayerView`: Full-page player route with breadcrumb navigation
- `GameDetailView`: Game details with embedded player and breadcrumb navigation
- `GamePlayerDialog`: Modal player overlay
- `Breadcrumbs`: Navigation bar with back button and context trail

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
3. If ZIP not present locally, start background download from gameDataSources
4. Mount ZIP file (awaits mount completion)
5. Extract launch command from game metadata
6. Construct content URL via game-service proxy
7. Return launch configuration with `downloading` status

**Step 2: Check Download Status**

Frontend receives response with `downloading: true` if game ZIP is being downloaded:

```typescript
// GamePlayerView uses conditional polling
const { data: launchData } = useGameLaunchData(id!);

// Polls every 2 seconds if downloading, stops when complete
useQuery({
  queryKey: ['game', id, 'launch'],
  queryFn: () => gamesApi.getGameLaunchData(id),
  refetchInterval: (query) => query.state.data?.downloading ? 2000 : false,
});
```

- If `downloading: true` - show download progress UI
- If `downloading: false` - proceed to player initialization

**Step 3: Initialize Player**

- Check if game can play in browser (canPlayInBrowser)
- Select appropriate player (Ruffle vs iframe)
- Mount player component

**Step 4: Load Content**

- **Flash:** Ruffle loads SWF from proxy URL
- **HTML5:** Iframe loads game page from proxy URL
- Game service proxies requests to local files or CDN

**Step 5: Track Session**

- POST /api/play/start with gameId
- Backend creates play session record
- Returns sessionId

**Step 6: Play**

- User interacts with game
- All game assets served through proxy

**Step 7: End Session**

- User closes player or navigates away
- POST /api/play/end with sessionId
- Backend calculates duration and updates stats

## API Endpoints

#### GET /api/games/:id/launch

Get game launch configuration.

**Response (ready to play):**

```json
{
  "gameId": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Super Mario Flash",
  "platform": "Flash",
  "launchCommand": "http://uploads.ungrounded.net/396000/396724_DAplayer_V6.swf",
  "contentUrl": "http://localhost:3100/game-proxy/http://uploads.ungrounded.net/396000/396724_DAplayer_V6.swf",
  "applicationPath": ":http: :message:",
  "playMode": "Single Player",
  "canPlayInBrowser": true,
  "downloading": false
}
```

**Response (downloading):**

```json
{
  "gameId": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Super Mario Flash",
  "platform": "Flash",
  "launchCommand": "...",
  "contentUrl": "...",
  "canPlayInBrowser": true,
  "downloading": true
}
```

When `downloading: true`, frontend should:
1. Show download progress UI to user
2. Poll this endpoint every 2 seconds
3. Proceed to player when `downloading` becomes false

**For games without content:**

```json
{
  "gameId": "...",
  "title": "Some Windows Game",
  "platform": "Windows",
  "launchCommand": "game.exe",
  "contentUrl": "",
  "canPlayInBrowser": false,
  "downloading": false
}
```

## Flash Game Content URL Resolution

Flash games may have launch commands pointing to HTML wrapper pages instead of
direct `.swf` files. The frontend automatically detects and resolves these:

**SWF Extraction from HTML Wrappers:**

The `useResolvedContentUrl` hook in `GamePlayer.tsx` handles HTML wrapper
resolution for Flash games:

1. Detects when Flash game has HTML content URL
2. Fetches the HTML wrapper page
3. Extracts SWF reference using 9 regex patterns:
   - Embed tags (`<embed src="game.swf">`)
   - Object tags (`<object data="game.swf">`)
   - Param tags (`<param name="movie" value="game.swf">`)
   - SWFObject v1 (`swf = new SWFObject("game.swf")`)
   - SWFObject v2 (`swf.addVariable("..."`)`)
   - Adobe AC_FL_RunContent
   - Generic SWF references in quotes
   - Relative and absolute path handling

4. Passes resolved SWF URL to Ruffle player

**Example:**

```
Original launch command: "Game.html"
→ Fetch HTML wrapper page
→ Extract: <embed src="Game.swf">
→ Resolved URL: "/game-proxy/Game.swf"
→ Pass to Ruffle
```

This allows playing Flash games even when Flashpoint provides HTML wrapper pages.

**Flash SWF Filter:**

Only Flash games with `.swf` launchCommands appear in browse/search results.
Games with HTML wrappers or other content are excluded from the "Flash" platform
filter but can still be played via direct URL if you know their game ID.

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

## Game Content Serving

**Game Proxy Routes:**

Integrated into the backend, registered on routes `/game-proxy/*` and `/game-zip/*`:

- Routes are registered before auth middleware for public game content access
- Uses permissive CORS `*` to allow cross-domain game embedding
- Serves legacy web content via HTTP proxy
- Fallback chain:
  1. Local htdocs folder
  2. Game data directory
  3. ZIP archives
  4. External CDN
  5. Local cache for downloaded content

**Example Request Flow:**

```
Browser: GET http://localhost:3100/game-proxy/http://uploads.ungrounded.net/396000/396724_DAplayer_V6.swf
Backend Proxy: Check local htdocs, game data, mounted ZIPs, fetch from CDN if needed
Response: File with correct MIME type
```

**ZIP Management:**

- Mounts ZIP files from Data/Games/
- Streams files without extraction via `/game-zip/*` routes
- Uses node-stream-zip for efficiency
- 199+ file types supported
- Automatic cleanup of unmounted ZIPs

## Navigation & Breadcrumbs

**Breadcrumb Navigation Bar:**

The application uses a unified navigation bar component that combines:

- Back button (ArrowLeft icon)
- Vertical divider
- Contextual breadcrumb trail

**Game Detail Page:**

- Shows: `Home > [Context] > Game Title`
- Context depends on entry point (Browse, Search, Playlist, etc.)
- Play button passes `PlayerBreadcrumbContext` via React Router navigation state

**Game Player Page:**

- Shows: `Home > [Context] > Game Title > Play`
- Reads context from navigation state (passed from game detail page)
- Fallback for direct URL access: `Browse > Game Title > Play`
- Hidden in fullscreen mode
- Context examples:
  - From browse: `Home > Browse > Game Title > Play`
  - From playlist: `Home > Playlists > Playlist Name > Game Title > Play`
  - From shared access: `Shared > Playlist Title > Game Title > Play`
  - Direct URL: `Browse > Game Title > Play`

**Context Flow:**

```typescript
// GameDetailView passes context to player
navigate(`/games/${game.id}/play`, {
  state: {
    fromPlaylist: playlistId,
    playlistName: playlistName,
    breadcrumbContext: { path, label },
  },
});

// GamePlayerView reads context
const location = useLocation<{ breadcrumbContext?: PlayerBreadcrumbContext }>();
const context = location.state?.breadcrumbContext;
```

**PlayerBreadcrumbContext Type:**

```typescript
interface PlayerBreadcrumbContext {
  path: string; // URL path (e.g., "/playlists/123")
  label: string; // Display label (e.g., "My Favorites")
}
```

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

**Fullscreen Behavior:**

- Breadcrumb navigation bar is hidden in fullscreen mode
- ESC key exits fullscreen
- Player expands to fill viewport

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
