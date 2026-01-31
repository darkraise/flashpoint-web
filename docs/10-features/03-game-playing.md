# Game Playing

## Overview

The game playing feature enables users to play Flash and HTML5 games directly in their web browser without requiring the Flashpoint Launcher. Flash games are powered by the Ruffle WebAssembly emulator, while HTML5 games run natively. The player supports fullscreen mode, game loading indicators, and error handling.

## User-Facing Functionality

### Supported Platforms
- **Flash Games:** Played using Ruffle emulator (WebAssembly)
- **HTML5 Games:** Played natively in iframe
- **Animations:** Flash animations (library: "theatre")

### Game Player Features

**Playback Controls:**
- Play button to launch game
- Fullscreen mode toggle
- ESC key to exit fullscreen
- Loading indicators
- Error messages for failed loads

**Display Modes:**
- Normal embedded mode
- Fullscreen mode (covers entire screen)
- Responsive sizing
- Aspect ratio preservation

**Player Information:**
- Platform indicator (Flash/HTML5)
- Game title displayed
- Fullscreen instructions
- Loading status

### User Flow

1. **Browse Games:** User finds a game via search/browse
2. **View Details:** Click game card to see full information
3. **Launch Player:** Click "Play" button
4. **Game Loads:** Player initializes (Ruffle for Flash, iframe for HTML5)
5. **Play Game:** Interact with game in browser
6. **Fullscreen (Optional):** Toggle fullscreen for immersive experience
7. **Exit:** Close player or navigate away

### Player Modes

**Embedded Player View:**
- Game details page with inline player
- Game information alongside player
- Related games shown below
- Metadata and tags visible

**Fullscreen Player View:**
- Dedicated player page
- Auto-fullscreen on load (optional)
- Minimal UI chrome
- ESC to exit back to details

**Dialog Player:**
- Modal overlay with player
- Can browse library while game runs
- Quick close functionality
- Background dimming

## Technical Implementation

### Architecture

**Backend Components:**
- Game Service: Provides game data and launch configuration
- Game-Service Proxy: Serves game files (separate service on ports 22500/22501)
- HTTP Proxy Server: Handles Flash content delivery
- GameZip Server: Mounts and serves files from ZIP archives

**Frontend Components:**
- `GamePlayer`: Main player component (reusable)
- `RufflePlayer`: Ruffle Flash emulator wrapper
- `GamePlayerView`: Full-page player route
- `GameDetailView`: Game details with embedded player
- `GamePlayerDialog`: Modal player overlay
- `usePlayTracking`: Hook for session tracking

### Game Launch Process

**Step 1: Fetch Launch Data**
```
GET /api/games/:id/launch
```

Backend:
1. Fetches game from flashpoint.sqlite
2. Checks if game has data on disk (presentOnDisk)
3. Auto-mounts ZIP file if needed (via gameDataService)
4. Extracts launch command from game metadata
5. Constructs content URL via game-service proxy
6. Returns launch configuration

**Step 2: Initialize Player**
- Frontend receives launch data
- Checks if game can play in browser (canPlayInBrowser)
- Selects appropriate player (Ruffle vs iframe)
- Mounts player component

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
- No direct access to Flashpoint files

**Step 6: End Session**
- User closes player or navigates away
- POST /api/play/end with sessionId
- Backend calculates duration and updates stats

### API Endpoints

#### GET /api/games/:id/launch
Get game launch configuration.

**Response (200 OK):**
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
  "applicationPath": "FPSoftware\\FlashpointSecurePlayer.exe",
  "playMode": "Single Player",
  "canPlayInBrowser": false  // Requires Flashpoint Launcher
}
```

**Errors:**
- 404: Game not found

### Ruffle Integration

Ruffle is a Flash Player emulator written in Rust and compiled to WebAssembly.

**Installation:**
```json
// package.json
{
  "dependencies": {
    "@ruffle-rs/ruffle": "latest"
  },
  "scripts": {
    "copy-ruffle": "copyfiles -f node_modules/@ruffle-rs/ruffle/ruffle.* public/ruffle"
  }
}
```

**Files Copied:**
- ruffle.js - Main Ruffle JavaScript API
- ruffle_web.wasm - WebAssembly binary
- ruffle_web.js - WASM loader

**RufflePlayer Component:**
```typescript
interface RufflePlayerProps {
  swfUrl: string;           // URL to SWF file
  width?: string;           // Player width
  height?: string;          // Player height
  className?: string;       // CSS classes
  scaleMode?: ScaleMode;    // Scaling behavior
  onLoadError?: (error: Error) => void;
  onLoadSuccess?: () => void;
}

type ScaleMode = 'exactfit' | 'noborder' | 'showall' | 'noscale';
```

**Ruffle Initialization:**
```typescript
useEffect(() => {
  const script = document.createElement('script');
  script.src = '/ruffle/ruffle.js';
  script.onload = () => {
    const ruffle = (window as any).RufflePlayer.newest();
    const player = ruffle.createPlayer();
    player.config = {
      autoplay: 'auto',
      backgroundColor: '#000000',
      letterbox: 'fullscreen',
      warnOnUnsupportedContent: true,
      logLevel: 'warn',
      showSwfDownload: false,
    };
    containerRef.current.appendChild(player);
    player.load(swfUrl);
  };
  document.head.appendChild(script);
}, [swfUrl]);
```

### HTML5 Game Loading

HTML5 games load in a sandboxed iframe:

**Iframe Configuration:**
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
- `allow-scripts` - JavaScript execution
- `allow-same-origin` - Same-origin requests
- `allow-forms` - Form submission
- `allow-popups` - Window.open()
- `allow-modals` - Alert/confirm dialogs
- `allow-pointer-lock` - Mouse lock for games
- `allow-top-navigation-by-user-activation` - User-initiated navigation

**Feature Policies:**
- `fullscreen` - Fullscreen API
- `autoplay` - Audio/video autoplay
- `clipboard-read/write` - Clipboard access

### Game Service Proxy

The game-service runs separately on ports 22500 (HTTP proxy) and 22501 (GameZip server):

**HTTP Proxy Server (Port 22500):**
- Serves legacy web content
- Fallback chain:
  1. Local htdocs folder (`D:/Flashpoint/Legacy/htdocs`)
  2. Game data directory
  3. ZIP archives (via zip-manager)
  4. External CDN (infinity.flashpointarchive.org)
  5. Local cache for downloaded content

**Example Request Flow:**
```
Browser Request:
  GET http://localhost:22500/http://uploads.ungrounded.net/396000/396724_DAplayer_V6.swf

Proxy Logic:
  1. Check local htdocs: D:/Flashpoint/Legacy/htdocs/uploads.ungrounded.net/396000/396724_DAplayer_V6.swf
  2. If not found, check game data
  3. If not found, check mounted ZIPs
  4. If not found, fetch from http://uploads.ungrounded.net/396000/396724_DAplayer_V6.swf
  5. Cache response locally
  6. Return file with correct MIME type
```

**GameZip Server (Port 22501):**
- Mounts ZIP files from `Data/Games/`
- Streams files without extraction
- Uses node-stream-zip for efficiency
- Auto-mounts based on game data

**MIME Type Detection:**
- 199+ file types supported
- SWF files: `application/x-shockwave-flash`
- HTML files: `text/html`
- JavaScript: `application/javascript`
- Images: `image/jpeg`, `image/png`, etc.

### Fullscreen Implementation

**Fullscreen Toggle:**
```typescript
const [isFullscreen, setIsFullscreen] = useState(false);

const toggleFullscreen = () => {
  setIsFullscreen(!isFullscreen);
  onFullscreenChange?.(!isFullscreen);
};

// ESC key handler
useEffect(() => {
  const handleEscKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && isFullscreen) {
      e.preventDefault();
      setIsFullscreen(false);
      onFullscreenChange?.(false);
    }
  };

  if (isFullscreen) {
    window.addEventListener('keydown', handleEscKey);
    return () => window.removeEventListener('keydown', handleEscKey);
  }
}, [isFullscreen]);
```

**Fullscreen Styles:**
```typescript
const containerClasses = isFullscreen
  ? 'fixed inset-0 z-50 bg-black'
  : 'relative';

const playerHeight = isFullscreen
  ? showControls ? 'calc(100vh - 64px)' : '100vh'
  : 'calc(100vh - 220px)';
```

## UI Components

### GamePlayer
**Location:** `frontend/src/components/player/GamePlayer.tsx`

**Props:**
```typescript
interface GamePlayerProps {
  title: string;                    // Game title
  platform: string;                 // Platform (Flash/HTML5)
  contentUrl?: string;              // URL to game content
  launchCommand?: string;           // Launch command (for info)
  canPlayInBrowser: boolean;        // Whether game is playable
  allowFullscreen?: boolean;        // Enable fullscreen button
  initialFullscreen?: boolean;      // Start in fullscreen
  onFullscreenChange?: (isFullscreen: boolean) => void;
  className?: string;               // Custom CSS
  showControls?: boolean;           // Show player controls
  height?: string;                  // Player height (CSS)
}
```

**Usage:**
```tsx
<GamePlayer
  title={game.title}
  platform={game.platform}
  contentUrl={launchData.contentUrl}
  canPlayInBrowser={launchData.canPlayInBrowser}
  allowFullscreen={true}
  showControls={true}
  height="calc(100vh - 220px)"
/>
```

### RufflePlayer
**Location:** `frontend/src/components/player/RufflePlayer.tsx`

**Props:**
```typescript
interface RufflePlayerProps {
  swfUrl: string;                   // URL to SWF file
  width?: string;                   // Default: '100%'
  height?: string;                  // Default: '100%'
  className?: string;
  scaleMode?: 'exactfit' | 'noborder' | 'showall' | 'noscale';
  onLoadError?: (error: Error) => void;
  onLoadSuccess?: () => void;
}
```

### GamePlayerView
**Location:** `frontend/src/views/GamePlayerView.tsx`

**Features:**
- Full-page player view
- Auto-fullscreen option
- Back navigation
- Play session tracking
- Error handling

### GameDetailView
**Location:** `frontend/src/views/GameDetailView.tsx`

**Features:**
- Game information display
- Embedded player
- Related games
- Metadata and tags
- Add to playlist
- Favorite button

## Common Use Cases

### 1. Play Flash Game
```tsx
// User clicks "Play" on a Flash game card
const navigate = useNavigate();
navigate(`/games/${gameId}/play`);

// GamePlayerView loads
// Fetches launch data
// Initializes Ruffle player
// Starts play session
```

### 2. Play HTML5 Game
```tsx
// Same flow as Flash
// Player uses iframe instead of Ruffle
// Sandboxed execution
// Session tracking
```

### 3. Fullscreen Mode
```tsx
// User clicks fullscreen button
toggleFullscreen();

// Player expands to fill screen
// Controls remain visible (optional)
// ESC key to exit
```

### 4. Handle Unplayable Game
```tsx
// Game requires Flashpoint Launcher (e.g., Windows game)
if (!launchData.canPlayInBrowser) {
  // Show error message
  // Display platform requirements
  // Suggest using Flashpoint Launcher
}
```

### 5. Track Play Session
```tsx
const { startSession, endSession } = usePlayTracking();

// On game load
useEffect(() => {
  const sessionId = await startSession(gameId, gameTitle);

  return () => {
    // On unmount
    endSession(sessionId);
  };
}, [gameId]);
```

### 6. Embedded Player
```tsx
// Show player in game detail page
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  <div className="lg:col-span-2">
    <GamePlayer {...launchData} height="600px" />
  </div>
  <div>
    <GameInfo game={game} />
    <RelatedGames gameId={game.id} />
  </div>
</div>
```

## Ruffle Configuration

### Scale Modes

**showall (default):**
- Maintains aspect ratio
- Adds letterboxing if needed
- Best for most games

**exactfit:**
- Stretches to fill container
- May distort aspect ratio
- Good for full-screen games

**noborder:**
- Maintains aspect ratio
- Crops if necessary
- No letterboxing

**noscale:**
- Original game dimensions
- No scaling applied
- May require scrolling

### Configuration Options

```typescript
const ruffleConfig = {
  autoplay: 'auto',              // Auto-start playback
  backgroundColor: '#000000',     // Background color
  letterbox: 'fullscreen',        // Letterbox mode
  warnOnUnsupportedContent: true, // Show warnings
  logLevel: 'warn',               // Console logging
  showSwfDownload: false,         // Hide download button
  contextMenu: 'off',             // Disable right-click menu
  preloader: true,                // Show loading screen
  splashScreen: true,             // Show Ruffle logo
  maxExecutionDuration: 15,       // Script timeout (seconds)
};
```

## Error Handling

### Flash Load Errors
```typescript
// Ruffle fails to load SWF
onLoadError={(error) => {
  console.error('Ruffle error:', error);
  // Show error message to user
  // Suggest alternatives
  // Report to error tracking
}}
```

### HTML5 Load Errors
```typescript
// Iframe fails to load
<iframe
  onError={(e) => {
    setIframeError('Failed to load HTML5 game');
    // Display error overlay
    // Show URL for debugging
  }}
/>
```

### No Content Available
```typescript
if (!contentUrl) {
  return (
    <div className="error-state">
      <AlertCircle size={48} />
      <p>No content URL available</p>
      <p className="text-sm">Launch command: {launchCommand}</p>
    </div>
  );
}
```

### Platform Not Supported
```typescript
if (!canPlayInBrowser) {
  return (
    <div className="error-state">
      <AlertCircle size={48} />
      <h3>Cannot Play in Browser</h3>
      <p>The {platform} platform requires the Flashpoint Launcher.</p>
    </div>
  );
}
```

## Best Practices

1. **Always track play sessions** for analytics
2. **Show loading states** while game initializes
3. **Handle errors gracefully** with user-friendly messages
4. **Use fullscreen wisely** - provide ESC hint
5. **Optimize for mobile** - touch controls, responsive sizing
6. **Cache Ruffle files** in public directory
7. **Monitor performance** - track load times
8. **Test with various games** - different SWF versions

## Troubleshooting

### Ruffle not loading
- Verify ruffle.js is in public/ruffle/
- Check browser console for errors
- Ensure WebAssembly is supported
- Update Ruffle to latest version

### Black screen on Flash games
- Check contentUrl is correct
- Verify game file exists in htdocs or ZIPs
- Inspect network requests for 404s
- Check CORS headers from proxy

### HTML5 games not loading
- Verify iframe sandbox permissions
- Check for mixed content warnings (HTTP/HTTPS)
- Inspect browser console for errors
- Test content URL directly

### Fullscreen not working
- Verify fullscreen button handler
- Check CSS z-index conflicts
- Ensure ESC key listener attached
- Test browser fullscreen API support

## Future Enhancements

- Save game state (if supported by game)
- Screenshot/recording functionality
- Game controls remapping
- Performance metrics display
- Ruffle settings UI (scale mode, quality)
- Offline play support
- Game favorites quick-launch
- Recently played games list
- Gamepad support detection
- VR game support (WebXR)
