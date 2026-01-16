# Ruffle Scale Modes and Viewport Configuration - FIXED

## Problem: Out-of-View Content Visible in Large Areas

When displaying Flash SWF files in large containers, out-of-view frames and content that should be clipped can become visible. This happens when Flash content has elements positioned outside the intended stage boundaries.

## Root Cause

Flash SWF files can have content that extends beyond the defined stage boundaries. Without proper clipping/masking, this out-of-view content becomes visible in large display areas or when the player container is larger than the intended game viewport.

## Available Scale Modes

Ruffle supports multiple scale modes (equivalent to Flash's `Stage.scaleMode`):

### 1. `showAll` (Previous Default)
- **Behavior**: Scales content to fill container while maintaining aspect ratio
- **Result**: Adds letterboxing (black bars) if aspect ratios don't match
- **Issue**: Can reveal out-of-view content that should be hidden

### 2. `noBorder` (New Default - Recommended)
- **Behavior**: Maintains aspect ratio but crops content to fill the entire container
- **Use case**: Perfect for hiding out-of-view frames and extra content
- **Trade-off**: May crop some edge content, but prevents unwanted elements from showing

### 3. `exactFit`
- Stretches content to fill the container without maintaining aspect ratio
- Not recommended as it distorts the content

### 4. `noScale`
- Content remains at original size
- No scaling or cropping applied

## The Solution

Instead of cropping the game content itself (which clips important parts), we use a combination of proper scale mode and **CSS overflow clipping** to mask out-of-view content.

## Key Changes Made

1. **`scale: 'showAll'`** - Keep this to preserve full game content
   - Shows all game content without cropping
   - Maintains aspect ratio with letterboxing
   - Ensures the entire game is visible

2. **`letterbox: 'on'`** - Enable letterboxing for proper framing
   - Adds black bars to maintain aspect ratio
   - Properly frames the game content

3. **`forceScale: true`** - Prevents the SWF from changing scale mode at runtime
   - Some Flash games try to change scale mode dynamically
   - This ensures consistent behavior

4. **`wmode: 'opaque'`** - Set window mode to opaque
   - Prevents transparency issues
   - Ensures proper layering

5. **CSS `overflow: hidden`** - THE KEY FIX
   - Added to player element: `player.style.overflow = 'hidden'`
   - Added to container div: `overflow: 'hidden'` in inline styles
   - Added to parent div: `overflow-hidden` Tailwind class
   - **This clips any content that extends beyond the player bounds**

## How This Fixes the Issue

### Before (without overflow clipping):
```
┌──────────────────────────────────────┐
│  Container (no overflow hidden)      │
│  ┌────────────────────────────────┐  │
│  │ Letterbox (black bars)         │  │
│  │  ┌──────────────────────────┐  │  │
│  │  │  Game Content            │  │  │
│  │  │                          │  │  │
│  │  └──────────────────────────┘  │  │
│  │     ↑ Out-of-view frames     │  │
│  │       visible in letterbox   │  │  ← Problem!
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

### After (with overflow: hidden):
```
┌──────────────────────────────────────┐
│  Container (overflow: hidden) ✂️      │
│  ┌────────────────────────────────┐  │
│  │ Letterbox (black bars)         │  │
│  │  ┌──────────────────────────┐  │  │
│  │  │  Game Content            │  │  │
│  │  │  (fully visible)         │  │  │  ← Game preserved!
│  │  └──────────────────────────┘  │  │
│  │  [Out-of-view frames clipped]│  │  ← Hidden!
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

**Key insight**: By using `overflow: hidden` at multiple levels (parent container, container div, and player element), any content that extends beyond the Ruffle player boundaries is clipped, while the game itself remains fully visible with proper aspect ratio.

## Key Configuration Changes

**Ruffle Config** (RufflePlayer.tsx lines 137-154):
```tsx
scale: 'showAll'       // Keep to show full game content
letterbox: 'on'        // Enable letterboxing for proper framing
forceScale: true       // NEW: Prevents runtime scale changes
wmode: 'opaque'        // NEW: Opaque window mode
salign: ''            // Default center alignment
```

**CSS Overflow Clipping** (THE KEY FIX):
```tsx
// Player element (line 160)
player.style.overflow = 'hidden';

// Container div (line 264)
overflow: 'hidden'  // in inline styles

// Parent container (line 257)
className="... overflow-hidden ..."  // Tailwind class
```

## Scale Mode Comparison

| Mode | Behavior | Use Case |
|------|----------|----------|
| `showAll` (old) | Shows entire content, maintains aspect ratio, adds letterboxing | Best for viewing full content with black bars |
| `noBorder` (new) | Fills space by cropping edges, maintains aspect ratio | **Best for hiding out-of-view content** |
| `exactFit` | Stretches to fill, distorts aspect ratio | Not recommended |
| `noScale` | No scaling, original size | For pixel-perfect display |

## Key Changes

1. **`scale: 'noBorder'`** - Crops content that extends beyond the viewport instead of letterboxing
2. **`letterbox: 'off'`** - Disables letterboxing completely to prevent extra content from showing
3. **`forceScale: true`** - Prevents the SWF from changing scale mode at runtime
4. **`salign: ''`** - Uses default (center) alignment

## How This Works

**Before** (with `showAll`):
- Content scales to fit entirely within viewport
- Adds letterboxing (black bars) to maintain aspect ratio
- Can reveal out-of-view content in the letterbox areas

**After** (with `noBorder`):
- Content scales to fill the viewport completely
- Maintains aspect ratio
- **Crops/clips** any content that extends beyond the viewport
- No letterboxing, no extra visible content

## Scale Mode Comparison

| Mode | Aspect Ratio | Cropping | Letterboxing | Best For |
|------|--------------|----------|--------------|
| **`showAll`** (old) | Preserved | No cropping | Yes | Full content visibility |
| **`noBorder`** (new) | Preserved | Crops overflow | No | Hiding out-of-view content |
| `exactFit` | Stretches to fit | No cropping | No | Distorts content |
| `noScale` | Original size | No scaling at all | N/A | Pixel-perfect display |

## Key Changes Made:

1. **`scale: 'noBorder'`** - Instead of `showAll`, this crops content that extends beyond the viewport rather than showing it with letterboxing
2. **`letterbox: 'off'`** - Disables letterboxing completely, preventing extra content from being revealed
3. **`forceScale: true`** - Prevents the SWF from changing the scale mode at runtime
4. **`salign: ''`** - Default center alignment

## How It Works

**Before (without overflow clipping)**:
- Content scales with `showAll` mode (correct)
- Letterboxing maintains aspect ratio (correct)
- BUT: Out-of-view frames visible beyond player boundaries
- Extra content becomes visible in letterbox areas or large displays

**After (with overflow: hidden)**:
- Content scales with `showAll` mode (game fully visible ✅)
- Letterboxing maintains aspect ratio (correct framing ✅)
- `overflow: hidden` clips content beyond container boundaries
- Out-of-view frames are masked and hidden ✅
- Game content preserved, unwanted content clipped ✅

## Alternative Scale Modes (if needed)

The current solution uses `showAll` which works for most games. If specific games have issues, you can try:

1. **For pixel-perfect display:**
   ```typescript
   scale: 'noScale',  // No scaling, shows at original size
   letterbox: 'off',
   // Still use overflow: hidden for clipping
   ```

2. **If letterbox causes issues:**
   ```typescript
   scale: 'showAll',
   letterbox: 'off',  // No black bars
   // overflow: hidden still required
   ```

3. **For games that need to fill space (use with caution):**
   ```typescript
   scale: 'noBorder',  // Fills space, may crop game edges
   letterbox: 'off',
   // May clip important game content!
   ```

**Note**: Regardless of scale mode, `overflow: hidden` should always be applied to prevent out-of-view content from showing.

## Summary of Changes

**Changed in `RufflePlayer.tsx`**:

### Ruffle Configuration (lines 137-154):
1. **`scale: 'showAll'`** - Keeps full game content visible
2. **`letterbox: 'on'`** - Maintains proper aspect ratio with black bars
3. **`forceScale: true`** - Prevents SWF from changing scale mode at runtime
4. **`wmode: 'opaque'`** - Sets window mode to opaque for proper layering
5. **`salign: ''`** - Default center alignment

### CSS Overflow Clipping (THE KEY FIX):
1. **Line 160**: `player.style.overflow = 'hidden'` on player element
2. **Line 264**: `overflow: 'hidden'` in container div inline styles
3. **Line 257**: `overflow-hidden` Tailwind class on parent container

## How This Fixes the Issue

- **`showAll` mode**: Shows entire game content without cropping the game itself ✅
- **`letterbox: 'on'`**: Properly frames content with aspect ratio preserved ✅
- **`overflow: hidden`**: THE KEY FIX - Clips any content extending beyond player boundaries ✅
- **Multi-level clipping**: Three layers of overflow hidden ensure thorough masking ✅
- **Result**: Game fully visible, out-of-view frames hidden ✅

## Sources

- [Ruffle Frontend Bundle README](https://github.com/ruffle-rs/ruffle/blob/master/frontend-utils/src/bundle/README.md)
- [Ruffle BaseLoadOptions Documentation](https://ruffle.rs/js-docs/master/interfaces/Config.BaseLoadOptions.html)
- [Scaling a Ruffle SWF in a Browser Window Discussion](https://github.com/ruffle-rs/ruffle/discussions/3539)
- [Visible Content Area Limited by Stage Size Issue](https://github.com/ruffle-rs/ruffle/issues/2015)