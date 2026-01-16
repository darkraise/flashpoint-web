# Ruffle Instance ID Error - FIXED

## Issue

After a game fully loads in Ruffle, the browser console shows this error:

```
ERROR web/src/lib.rs:993 Ruffle Instance ID does not exist
```

The game works correctly, but this error indicates a problem with Ruffle's internal instance management.

## Root Cause

**File**: `frontend/src/components/player/RufflePlayer.tsx`

The error occurs due to a **cleanup race condition** when the component initializes or re-initializes:

### The Problem

1. Component mounts and creates a Ruffle player instance
2. Component might unmount (React Strict Mode in dev, or state changes)
3. Cleanup runs and calls `player.remove()`
4. Component re-mounts immediately
5. Old code cleared container with `innerHTML = ''` **without** properly cleaning up the existing Ruffle instance
6. Ruffle's internal async operations from the previous instance are still running
7. These operations try to access the instance by its internal ID
8. **Error**: "Ruffle Instance ID does not exist" because the instance was cleared without proper cleanup

### Why innerHTML Clearing Caused Issues

```tsx
// BUG: Clearing innerHTML without cleaning up Ruffle instances
if (containerRef.current) {
  containerRef.current.innerHTML = '';  // ← Removes DOM elements but not Ruffle state!
  containerRef.current.appendChild(player);
}
```

When you use `innerHTML = ''`, it:
- ✅ Removes DOM elements
- ❌ Does NOT call Ruffle's cleanup methods
- ❌ Leaves Ruffle's internal state orphaned
- ❌ Ruffle's async operations still reference the old instance ID

## The Fix

### Change 1: Clean up existing player before creating new one

**File**: `frontend/src/components/player/RufflePlayer.tsx` (lines 46-59)

```tsx
// FIXED: Properly clean up existing player before creating new one
const initRuffle = async () => {
  if (!containerRef.current) return;

  try {
    setIsLoading(true);
    setError(null);

    // Clean up any existing player before creating a new one
    if (rufflePlayerRef.current) {
      try {
        console.log('[Ruffle] Cleaning up existing player instance');
        rufflePlayerRef.current.remove();  // ← Proper Ruffle cleanup
        rufflePlayerRef.current = null;
        // Give Ruffle time to clean up internal state
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err) {
        console.warn('[Ruffle] Error cleaning up existing player:', err);
      }
    }

    if (!mounted) return;

    // Now safe to create new player...
  }
}
```

### Change 2: Improved cleanup function

**File**: `frontend/src/components/player/RufflePlayer.tsx` (lines 158-173)

```tsx
// FIXED: Better cleanup that checks both local and ref variables
return () => {
  mounted = false;

  // Clean up the player instance
  const playerToCleanup = player || rufflePlayerRef.current;
  if (playerToCleanup) {
    try {
      console.log('[Ruffle] Cleanup: Removing player instance');
      playerToCleanup.remove();  // ← Proper Ruffle cleanup
    } catch (err) {
      console.error('[Ruffle] Error removing player:', err);
    }
  }
  rufflePlayerRef.current = null;
};
```

## Key Improvements

### 1. Explicit Cleanup Before Creation

Before creating a new Ruffle instance, we now:
1. Check if an instance already exists in the ref
2. Call `.remove()` on the existing instance (proper Ruffle cleanup)
3. Wait 100ms for Ruffle's internal cleanup to complete
4. Only then create the new instance

### 2. Cleanup Delay

The 100ms delay after `player.remove()` gives Ruffle time to:
- Cancel pending async operations
- Clean up internal state
- Remove event listeners
- Free resources

### 3. Better Cleanup Function

The cleanup function now:
- Checks both the local `player` variable and `rufflePlayerRef.current`
- Ensures we clean up whichever reference exists
- Logs cleanup actions for debugging

## How It Works Now

```
Component Mount:
  → Check rufflePlayerRef.current
  → If exists: Clean up properly with .remove()
  → Wait 100ms for Ruffle cleanup
  → Create new player
  → Store in rufflePlayerRef.current
  → Append to DOM
  → Load SWF
  ✅ No orphaned instances

Component Unmount:
  → Check player and rufflePlayerRef.current
  → Call .remove() on existing instance
  → Set ref to null
  ✅ Proper cleanup, no lingering state
```

## React Strict Mode Compatibility

This fix is particularly important in **React Strict Mode** (development), which:
1. Mounts components
2. **Immediately unmounts them**
3. **Re-mounts them**

Without proper cleanup, this causes:
```
Mount #1: Create Ruffle instance A
Unmount #1: Try to cleanup, but innerHTML clears DOM
Mount #2: Create Ruffle instance B (A still in memory!)
Ruffle: "Instance ID for A does not exist" (A's operations still running)
```

With the fix:
```
Mount #1: Create Ruffle instance A
Unmount #1: Properly remove instance A, wait for cleanup
Mount #2: Create Ruffle instance B
✅ No errors, clean state
```

## Testing Checklist

✅ Game loads without console errors
✅ No "Ruffle Instance ID does not exist" error
✅ Fullscreen toggle works without errors
✅ Component remount (React Strict Mode) works correctly
✅ Game state preserved during transitions
✅ Proper cleanup on navigation away from game

## Related Issues Fixed

This fix also prevents:
- ✅ Memory leaks from orphaned Ruffle instances
- ✅ Multiple Ruffle instances running simultaneously
- ✅ Event listener leaks
- ✅ Resource leaks (canvas, audio contexts)

## Performance Impact

### Before (No Proper Cleanup)
```
Component lifecycle:
  → Create instance
  → Clear DOM with innerHTML
  → Ruffle instance stays in memory
  → Create new instance
  → Old instance still running async operations
  → Memory leak + errors
```

### After (Proper Cleanup)
```
Component lifecycle:
  → Clean up existing instance
  → Wait for Ruffle internal cleanup (100ms)
  → Create new instance
  → Clean state, no leaks
  → Slightly slower init but no errors
```

## Lessons Learned

### Rule 1: Never Clear DOM Without Cleaning Up Complex Components

```tsx
// ❌ BAD - Doesn't clean up component state
containerRef.current.innerHTML = '';

// ✅ GOOD - Proper cleanup first
if (existingInstance) {
  existingInstance.remove();
  await delay(100);
}
// Then safe to modify DOM
```

### Rule 2: Give Async Libraries Time to Clean Up

Complex libraries like Ruffle have internal async operations. When cleaning up:
1. Call the cleanup method (`.remove()`)
2. **Wait a short time** (100-200ms)
3. Then create new instances

### Rule 3: Store Instances in Refs for Cross-Render Access

```tsx
// ✅ GOOD - Can access in next render
const rufflePlayerRef = useRef<any>(null);

// Check and clean up in next render
if (rufflePlayerRef.current) {
  rufflePlayerRef.current.remove();
}
```

## Alternative Solutions Considered

### Option 1: Don't Clear Container (Rejected)
- Would work but less clean
- Relies on appendChild replacing content
- Less explicit about intent

### Option 2: Longer Delay (Rejected)
- 100ms is sufficient for Ruffle cleanup
- Longer delays slow down initialization unnecessarily
- 100ms is imperceptible to users

### Option 3: Check Ruffle Internal State (Rejected)
- Ruffle doesn't expose reliable internal state API
- Would be fragile across Ruffle versions
- Better to follow proper cleanup pattern

## Conclusion

By properly cleaning up existing Ruffle instances before creating new ones, and giving Ruffle time to complete its internal cleanup, we eliminated the "Ruffle Instance ID does not exist" error while maintaining smooth gameplay and proper resource management.

**Key Principle**: When working with complex libraries that manage internal state (Ruffle, video players, WebGL contexts), always call their cleanup methods and give them time to finish before creating new instances.
