# HTML5 Player Implementation

Documentation for HTML5 game iframe player.

## Overview

HTML5 games are rendered using a sandboxed iframe for security and isolation.
Unlike Flash games that require emulation, HTML5 games run natively in the
browser.

**Location:** `frontend/src/components/player/GamePlayer.tsx` (HTML5 branch)

## Implementation

HTML5 games are rendered through the GamePlayer component using an iframe:

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
) : null}
```

## Sandbox Attributes

The iframe uses strict sandboxing for security:

### Allowed Permissions

```
sandbox="
  allow-scripts               - Allow JavaScript execution
  allow-same-origin          - Allow same-origin access (required for APIs)
  allow-forms                - Allow form submission
  allow-popups               - Allow window.open()
  allow-modals               - Allow alert(), confirm(), etc.
  allow-pointer-lock         - Allow pointer lock API (for games)
  allow-top-navigation-by-user-activation - Allow navigation (user-initiated only)
"
```

### Feature Policy

```
allow="
  fullscreen;                - Allow Fullscreen API
  autoplay;                  - Allow autoplay
  clipboard-read;            - Allow clipboard read
  clipboard-write;           - Allow clipboard write
"
```

## Security Considerations

### What's Blocked

Without explicit permission, the iframe CANNOT:

- Access parent window (except via postMessage)
- Navigate top window
- Access local storage (unless same-origin)
- Download files automatically
- Access camera/microphone
- Access geolocation

### What's Allowed

With current sandbox settings:

- Run JavaScript
- Make network requests (same-origin)
- Use Canvas and WebGL
- Play audio
- Use keyboard/mouse input
- Enter fullscreen (with user gesture)
- Access clipboard (with permission)

## Content URL Structure

HTML5 game content is served through the game-service proxy:

```
http://localhost:22500/[relativePath]
```

Example:

```
http://localhost:22500/Games/HTML5/example-game/index.html
```

The game-service handles:

- Serving index.html
- Serving game assets (JS, CSS, images)
- CORS headers
- MIME type detection

## Error Handling

### Loading Errors

```typescript
const [iframeError, setIframeError] = useState<string | null>(null);

<iframe
  onLoad={() => {
    console.log('[HTML5 Game] Loaded successfully');
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
```

### Common Issues

**Issue: Game doesn't load**

- Check browser console for CORS errors
- Verify content URL is correct
- Ensure game-service is running

**Issue: Game loads but doesn't work**

- Check if game requires additional permissions
- Verify sandbox attributes allow required features
- Check browser console for JavaScript errors

**Issue: Game can't access resources**

- CORS may be blocking cross-origin requests
- Game may need same-origin access
- Check game-service proxy configuration

## Performance

HTML5 games generally perform better than Flash:

- No emulation overhead
- Native browser rendering
- Direct access to WebGL
- Better memory management

## Fullscreen Support

HTML5 games can use the Fullscreen API:

```javascript
// Inside the game
document.getElementById('game').requestFullscreen();
```

The GamePlayer component also provides fullscreen controls:

```typescript
<GamePlayer
  platform="HTML5"
  contentUrl={contentUrl}
  allowFullscreen={true}
/>
```

## Communication with Parent

Games can communicate with the parent window using postMessage:

```javascript
// Inside game iframe
window.parent.postMessage(
  {
    type: 'GAME_LOADED',
    data: { gameId: '123' },
  },
  '*'
);

// In parent window
window.addEventListener('message', (event) => {
  if (event.data.type === 'GAME_LOADED') {
    console.log('Game loaded:', event.data);
  }
});
```

## Browser Compatibility

HTML5 games work in all modern browsers:

- Chrome/Edge (Chromium) - Best performance
- Firefox - Good performance
- Safari - Good performance (some WebGL limitations)

## Advantages over Flash

1. **Native Performance** - No emulation needed
2. **Better Security** - Sandboxed by default
3. **Modern APIs** - Access to WebGL, Web Audio, etc.
4. **Mobile Support** - Works on touch devices
5. **No Plugins** - Runs in all modern browsers

## Limitations

1. **CORS Restrictions** - May affect cross-origin resources
2. **Sandbox Restrictions** - Some APIs may be blocked
3. **Storage Limits** - localStorage has size limits
4. **No File System Access** - Can't access local files

## Debugging

### Browser DevTools

- Open DevTools in the iframe context
- Right-click iframe → Inspect
- View console errors
- Monitor network requests

### Console Logging

```typescript
console.log('[HTML5 Game] Loading:', contentUrl);
console.log('[HTML5 Game] Loaded successfully');
console.error('[HTML5 Game] Load error:', error);
```

## Further Reading

- [GamePlayer Component](../components/player-components.md)
- [Ruffle Player](./ruffle-player.md)
- [Game Service Documentation](../../05-game-service/README.md)
- [MDN: iframe](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe)
- [MDN: iframe sandbox](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#attr-sandbox)
