# Game Player Components

This directory contains reusable components for playing Flash (SWF) and HTML5 games.

## Components

### `GamePlayer`

A flexible, reusable game player component that can render Flash (via Ruffle) or HTML5 games. Can be embedded in pages, dialogs, or any other container.

**Features:**
- Supports Flash (SWF) and HTML5 games
- Optional fullscreen mode
- Player controls (fullscreen toggle)
- Configurable height and styling
- Error handling for unplayable games

**Example Usage in a Page:**

```tsx
import { GamePlayer } from '@/components/player';

function MyGamePage() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <GamePlayer
      title="My Game"
      platform="Flash"
      contentUrl="/game-files/abc123/game.swf"
      canPlayInBrowser={true}
      allowFullscreen={true}
      initialFullscreen={isFullscreen}
      onFullscreenChange={setIsFullscreen}
      showControls={true}
      height="calc(100vh - 220px)"
    />
  );
}
```

**Example Usage in a Dialog:**

```tsx
import { GamePlayer } from '@/components/player';

function GameDialog({ isOpen, onClose, gameData }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80">
      <div className="relative w-full h-full max-w-6xl mx-auto my-8 bg-gray-900 rounded-lg">
        <button onClick={onClose}>Close</button>

        <GamePlayer
          title={gameData.title}
          platform={gameData.platform}
          contentUrl={gameData.contentUrl}
          canPlayInBrowser={true}
          allowFullscreen={false} // Disable in dialog
          showControls={true}
          height="600px"
        />
      </div>
    </div>
  );
}
```

**Example Usage in a Sidebar/Panel:**

```tsx
import { GamePlayer } from '@/components/player';

function GameSidebar() {
  return (
    <div className="w-96 h-full">
      <GamePlayer
        title="Quick Play"
        platform="Flash"
        contentUrl="/game-files/xyz789/game.swf"
        canPlayInBrowser={true}
        allowFullscreen={false}
        showControls={false} // Hide controls for compact view
        height="400px"
      />
    </div>
  );
}
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | Required | Game title for display |
| `platform` | `string` | Required | Platform (Flash, HTML5, etc.) |
| `contentUrl` | `string?` | - | Content URL for the game |
| `launchCommand` | `string?` | - | Launch command (if any) |
| `canPlayInBrowser` | `boolean` | Required | Whether the game can be played in browser |
| `allowFullscreen` | `boolean` | `true` | Enable fullscreen mode |
| `initialFullscreen` | `boolean` | `false` | Start in fullscreen |
| `onFullscreenChange` | `(isFullscreen: boolean) => void` | - | Callback when fullscreen changes |
| `className` | `string` | `''` | Custom class name |
| `showControls` | `boolean` | `true` | Show player controls |
| `height` | `string` | `'calc(100vh - 220px)'` | Container height (CSS value) |

### `RufflePlayer`

Low-level component for rendering Flash SWF files using Ruffle emulator. Used internally by `GamePlayer` but can be used directly for advanced use cases.

**Example:**

```tsx
import { RufflePlayer } from '@/components/player';

function MyFlashPlayer() {
  return (
    <RufflePlayer
      swfUrl="/path/to/game.swf"
      width="800px"
      height="600px"
      onLoadSuccess={() => console.log('Loaded!')}
      onLoadError={(err) => console.error(err)}
    />
  );
}
```

## Example: Full Dialog Implementation

See `components/dialogs/GamePlayerDialog.tsx` for a complete example of using `GamePlayer` in a dialog with:
- ESC key to close
- Header with game info
- Close button
- Proper layout and styling

## Architecture

```
GamePlayerView (Page)
  └─ GamePlayer (Reusable Component)
      ├─ RufflePlayer (Flash)
      └─ iframe (HTML5)

GamePlayerDialog (Example Dialog)
  └─ GamePlayer (Same Reusable Component)
      ├─ RufflePlayer (Flash)
      └─ iframe (HTML5)
```

The `GamePlayer` component is designed to be platform-agnostic and context-agnostic, making it easy to use anywhere in the application.
