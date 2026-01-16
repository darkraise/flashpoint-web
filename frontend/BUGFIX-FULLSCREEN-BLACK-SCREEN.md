# Fullscreen Black Screen Issue - FIXED

## Issue

After clicking the Fullscreen button:
1. Game enlarged ✓
2. Game reloaded ✗
3. Black screen shown - game not visible ✗

## Root Cause

**File**: `frontend/src/views/GamePlayerView.tsx`

The GamePlayer component was inside a container that became **hidden** when fullscreen was active:

```tsx
// BUG: GamePlayer inside a hidden container
<div className={isFullscreen ? 'fixed inset-0 z-50 bg-black' : ''}>
  <div className={isFullscreen ? 'hidden' : 'max-w-6xl mx-auto space-y-6'}>
    {/* Back button, header, etc. */}
    <div className="bg-gray-800 rounded-lg">
      <div className="aspect-video bg-black">
        <GamePlayer />  {/* ← HIDDEN when isFullscreen=true! */}
      </div>
    </div>
  </div>
</div>
```

### Why This Caused a Black Screen

When `isFullscreen` changed to `true`:

1. Parent container got `className="hidden"`
2. **Everything inside was hidden**, including the GamePlayer
3. Outer div had `className="fixed inset-0 z-50 bg-black"`
4. Result: Black fullscreen overlay with no game visible

```
Fullscreen Mode:
┌─────────────────────────────────┐
│ fixed inset-0 bg-black (visible)│  ← Shows black background
│ ┌─────────────────────────────┐ │
│ │ HIDDEN (display: none)      │ │  ← Everything hidden!
│ │   <GamePlayer />            │ │  ← Game not rendered
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
Result: Black screen
```

## The Fix

**Strategy**: Never hide the GamePlayer container. Only conditionally render the UI chrome (back button, header, game info).

### Implementation

```tsx
// FIXED: GamePlayer always visible, only UI chrome is conditional
return (
  <div className={isFullscreen ? 'fixed inset-0 z-50 bg-black' : 'max-w-6xl mx-auto space-y-6'}>
    {/* Back button - conditionally rendered */}
    {!isFullscreen && (
      <button onClick={() => navigate(-1)}>Back</button>
    )}

    {/* Container styling changes, but stays visible */}
    <div className={isFullscreen ? 'w-full h-full' : 'bg-gray-800 rounded-lg overflow-hidden shadow-xl'}>
      {/* Header - conditionally rendered */}
      {!isFullscreen && (
        <div className="px-6 py-4 border-b border-gray-700">
          <h1>{game.title}</h1>
        </div>
      )}

      {/* GamePlayer - ALWAYS VISIBLE */}
      <div className={isFullscreen ? 'w-full h-screen' : 'aspect-video bg-black'}>
        <GamePlayer
          key={`game-player-${id}`}
          {...playerProps}
          height={isFullscreen ? '100vh' : 'aspect-video'}
        />
      </div>

      {/* Game Info - conditionally rendered */}
      {!isFullscreen && (
        <div>Game info...</div>
      )}
    </div>
  </div>
);
```

### Key Changes

1. **Removed Hidden Wrapper**:
   ```tsx
   // Before (BUG):
   <div className={isFullscreen ? 'hidden' : 'max-w-6xl mx-auto'}>
     <GamePlayer />
   </div>

   // After (FIXED):
   <div className={isFullscreen ? 'w-full h-full' : 'bg-gray-800 rounded-lg'}>
     <GamePlayer />
   </div>
   ```

2. **Conditional Rendering for UI Only**:
   ```tsx
   {!isFullscreen && <button>Back</button>}  // ← OK
   {!isFullscreen && <div>Header</div>}      // ← OK
   <GamePlayer />                            // ← NEVER conditional!
   {!isFullscreen && <div>Game Info</div>}   // ← OK
   ```

3. **Container Classes Change**:
   ```tsx
   // Root container adapts
   className={isFullscreen ? 'fixed inset-0 z-50 bg-black' : 'max-w-6xl mx-auto space-y-6'}

   // Card container adapts
   className={isFullscreen ? 'w-full h-full' : 'bg-gray-800 rounded-lg overflow-hidden shadow-xl'}

   // Player container adapts
   className={isFullscreen ? 'w-full h-screen' : 'aspect-video bg-black'}
   ```

4. **Added Stable Key**:
   ```tsx
   <GamePlayer key={`game-player-${id}`} />
   ```
   This helps React identify that it's the same component instance even though props change.

## How It Works Now

```
Normal Mode:
┌─────────────────────────────────┐
│ max-w-6xl mx-auto               │
│ ┌─────────────────────────────┐ │
│ │ Back Button (shown)         │ │
│ ├─────────────────────────────┤ │
│ │ bg-gray-800 rounded-lg      │ │
│ │ ┌─────────────────────────┐ │ │
│ │ │ Header (shown)          │ │ │
│ │ ├─────────────────────────┤ │ │
│ │ │ aspect-video            │ │ │
│ │ │   <GamePlayer />        │ │ │  ← Visible!
│ │ ├─────────────────────────┤ │ │
│ │ │ Game Info (shown)       │ │ │
│ │ └─────────────────────────┘ │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘

Fullscreen Mode:
┌─────────────────────────────────┐
│ fixed inset-0 z-50 bg-black     │
│ ┌─────────────────────────────┐ │
│ │ Back Button (hidden)        │ │  ← Not rendered
│ │ w-full h-full               │ │
│ │ ┌─────────────────────────┐ │ │
│ │ │ Header (hidden)         │ │ │  ← Not rendered
│ │ │ w-full h-screen         │ │ │
│ │ │   <GamePlayer />        │ │ │  ← Visible!
│ │ │ Game Info (hidden)      │ │ │  ← Not rendered
│ │ └─────────────────────────┘ │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

### React's Perspective

```jsx
// Component tree stays consistent
<div>  {/* Root - classes change */}
  <div>  {/* Card - classes change */}
    <div>  {/* Player container - classes change */}
      <GamePlayer key="game-player-123" />  {/* ← Same key, same instance! */}
    </div>
  </div>
</div>
```

React sees:
- ✅ Same component hierarchy
- ✅ Same key
- ✅ Only props and classes change
- ✅ No unmount/remount needed

## Why It Was Reloading

Even though the GamePlayer was hidden (not removed from DOM), changing its visibility caused layout issues that triggered a remount or re-initialization of the Ruffle player.

Additionally, when the parent had `display: none`, the GamePlayer container might have had zero dimensions, causing Ruffle to not render properly.

## Testing Checklist

✅ Game loads in normal mode
✅ Click fullscreen → Game continues without reload
✅ Game is visible in fullscreen (no black screen)
✅ Game state preserved
✅ Controls work in both modes
✅ Click exit fullscreen → Returns to normal mode
✅ Game continues playing
✅ No black flash or screen issues

## Lessons Learned

### Rule 1: Never Hide Stateful Components

```tsx
// ❌ BAD - Hides stateful component
<div className={condition ? 'hidden' : ''}>
  <GamePlayer />  {/* Has internal state */}
</div>

// ✅ GOOD - Component always visible, only UI chrome is conditional
<div>
  {!condition && <Header />}  {/* UI chrome */}
  <GamePlayer />              {/* Always rendered */}
  {!condition && <Footer />}  {/* UI chrome */}
</div>
```

### Rule 2: Change Classes, Not Visibility

```tsx
// ❌ BAD - Changes visibility
<div className={fullscreen ? 'hidden' : 'visible'}>
  <Component />
</div>

// ✅ GOOD - Changes layout/styling
<div className={fullscreen ? 'w-full h-screen' : 'w-auto h-auto'}>
  <Component />
</div>
```

### Rule 3: Conditional Rendering Strategy

```tsx
// Stateful components: NEVER conditional
<VideoPlayer />
<GamePlayer />
<AudioPlayer />
<FormInput />

// UI chrome: OK to be conditional
{showHeader && <Header />}
{showFooter && <Footer />}
{showSidebar && <Sidebar />}
```

## Performance Impact

### Before (Hidden Container)
```
Fullscreen toggle
  → Parent gets display:none
  → GamePlayer still in DOM but invisible
  → Ruffle detects container size = 0x0
  → Ruffle might reinitialize or fail to render
  → Black screen
```

### After (Always Visible)
```
Fullscreen toggle
  → Container classes change
  → GamePlayer stays visible
  → Ruffle detects new container size
  → Ruffle scales appropriately
  → Game continues rendering
```

## Related Issues

This fix also addresses:
- ✅ Game reload on fullscreen toggle
- ✅ Black screen in fullscreen mode
- ✅ Loss of game progress
- ✅ Poor fullscreen transition experience

## Conclusion

By ensuring the GamePlayer is never hidden and only changing container styling, we fixed both the reload issue and the black screen issue. The game now seamlessly transitions between normal and fullscreen modes without any interruption.

**Key Principle**: Stateful components should never be inside containers with `display: none` or conditional rendering that could unmount them.
