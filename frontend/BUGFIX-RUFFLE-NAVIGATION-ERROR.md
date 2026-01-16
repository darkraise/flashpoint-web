# Ruffle Instance ID Error on Navigation - FIXED

## Issue

When navigating between game pages (play → back → play again), the console shows this error:

```
ERROR web/src/lib.rs:993 Ruffle Instance ID does not exist
```

**Reproduction Steps**:
1. Play a game (works fine)
2. Click back button to navigate away
3. Play the same game again
4. Error appears in console

## Root Cause

**File**: `frontend/src/components/player/RufflePlayer.tsx`

The error occurs due to **multiple race conditions** in the Ruffle lifecycle management:

### Problem 1: Aggressive innerHTML Clearing

```tsx
// BUG: Using innerHTML = '' interferes with Ruffle's async cleanup
if (containerRef.current) {
  containerRef.current.innerHTML = '';  // ← Removes DOM elements instantly
  containerRef.current.appendChild(player);
}
```

**Why this is bad**:
- `innerHTML = ''` removes DOM elements immediately
- Ruffle's cleanup operations are **asynchronous**
- If Ruffle's internal operations are still running, they lose their DOM references
- Results in "Instance ID does not exist" errors

### Problem 2: Insufficient Cleanup Delays

```tsx
// BUG: Not enough time for Ruffle to clean up internal state
player.remove();
// Immediately create new instance - TOO FAST!
```

**Why this is bad**:
- `player.remove()` triggers async cleanup internally
- We were immediately creating a new instance
- Ruffle's internal registry wasn't fully cleared
- Old async operations still trying to access removed instance IDs

### Problem 3: No Race Condition Protection

```tsx
// BUG: Multiple initializations can run concurrently
useEffect(() => {
  initRuffle();  // No check if already initializing
}, [swfUrl]);
```

**Why this is bad**:
- React Strict Mode can trigger double-mounting
- Fast navigation can start initialization before cleanup completes
- Multiple Ruffle instances can be created simultaneously

### Problem 4: Incomplete Cleanup on Navigation

```tsx
// BUG: Cleanup function doesn't wait for Ruffle
return () => {
  player.remove();  // Async operation
  // Component unmounts immediately - no time for cleanup!
};
```

**Why this is bad**:
- React's cleanup is synchronous, but Ruffle's is asynchronous
- Component fully unmounts before Ruffle finishes cleanup
- Orphaned async operations continue running
- Next mount tries to use same internal IDs

## The Fix

### Change 1: Add initialization guard

**File**: `frontend/src/components/player/RufflePlayer.tsx` (lines 22, 41-46)

```tsx
// Add flag to prevent concurrent initialization
const isInitializingRef = useRef(false);

const initRuffle = async () => {
  if (!containerRef.current || isInitializingRef.current) {
    console.log('[Ruffle] Already initializing or no container, skipping');
    return;
  }

  isInitializingRef.current = true;
  // ... rest of initialization
};
```

**Benefits**:
- ✅ Prevents multiple concurrent initializations
- ✅ Protects against React Strict Mode double-mounting
- ✅ Ensures only one Ruffle instance at a time

### Change 2: Add delays for Ruffle cleanup

**File**: `frontend/src/components/player/RufflePlayer.tsx` (lines 52-79)

```tsx
// Give Ruffle time to clean up from previous instance (especially after navigation)
console.log('[Ruffle] Waiting for any previous cleanup to complete...');
await new Promise(resolve => setTimeout(resolve, 100));

if (!mounted) {
  isInitializingRef.current = false;
  return;
}

// Clean up any existing player before creating a new one
if (rufflePlayerRef.current) {
  try {
    console.log('[Ruffle] Cleaning up existing player instance');
    const oldPlayer = rufflePlayerRef.current;
    rufflePlayerRef.current = null;

    // Call destroy if available, otherwise remove
    if (typeof oldPlayer.destroy === 'function') {
      oldPlayer.destroy();
    } else {
      oldPlayer.remove();
    }

    // Give Ruffle additional time to clean up internal state
    console.log('[Ruffle] Waiting for cleanup to complete...');
    await new Promise(resolve => setTimeout(resolve, 200));
  } catch (err) {
    console.warn('[Ruffle] Error cleaning up existing player:', err);
  }
}
```

**Benefits**:
- ✅ 100ms initial delay allows previous cleanup to finish
- ✅ 200ms delay after `remove()` lets Ruffle clear internal registry
- ✅ Checks for `destroy()` method for more thorough cleanup
- ✅ Handles errors gracefully

### Change 3: Replace innerHTML with proper DOM removal

**File**: `frontend/src/components/player/RufflePlayer.tsx` (lines 172-176)

```tsx
// BEFORE (BUG):
containerRef.current.innerHTML = '';

// AFTER (FIXED):
// Remove existing children properly instead of using innerHTML
while (containerRef.current.firstChild) {
  containerRef.current.removeChild(containerRef.current.firstChild);
}
containerRef.current.appendChild(player);
```

**Benefits**:
- ✅ Doesn't interfere with Ruffle's event handlers
- ✅ Properly detaches DOM nodes
- ✅ Allows cleanup operations to complete

### Change 4: Add mounted checks before all async operations

**File**: `frontend/src/components/player/RufflePlayer.tsx` (lines 159-170, 179-190)

```tsx
// Check before appending to DOM
if (!mounted || !containerRef.current) {
  console.log('[Ruffle] Component unmounted during initialization, aborting');
  if (player) {
    try {
      player.remove();
    } catch (err) {
      console.error('[Ruffle] Error removing player during abort:', err);
    }
  }
  isInitializingRef.current = false;
  return;
}

// Check before loading SWF
if (!mounted) {
  console.log('[Ruffle] Component unmounted before load, aborting');
  if (player) {
    try {
      player.remove();
    } catch (err) {
      console.error('[Ruffle] Error removing player during abort:', err);
    }
  }
  isInitializingRef.current = false;
  return;
}
```

**Benefits**:
- ✅ Prevents operations on unmounted components
- ✅ Cleans up player if component unmounts mid-initialization
- ✅ Resets initialization flag on abort

### Change 5: Add finally block to reset initialization flag

**File**: `frontend/src/components/player/RufflePlayer.tsx` (lines 199-201)

```tsx
} catch (err) {
  // error handling...
} finally {
  isInitializingRef.current = false;
}
```

**Benefits**:
- ✅ Ensures flag is reset even if errors occur
- ✅ Prevents deadlock situations
- ✅ Allows retry after failures

### Change 6: Improved cleanup function

**File**: `frontend/src/components/player/RufflePlayer.tsx` (lines 207-239)

```tsx
return () => {
  console.log('[Ruffle] Cleanup: Component unmounting');
  mounted = false;
  isInitializingRef.current = false;

  // Clean up the player instance
  const playerToCleanup = player || rufflePlayerRef.current;
  if (playerToCleanup) {
    try {
      console.log('[Ruffle] Cleanup: Removing player instance');
      // Try destroy first if available, otherwise remove
      if (typeof playerToCleanup.destroy === 'function') {
        playerToCleanup.destroy();
      } else {
        playerToCleanup.remove();
      }
    } catch (err) {
      console.error('[Ruffle] Error removing player:', err);
    }
  }
  rufflePlayerRef.current = null;

  // Clear the container to ensure no stale DOM elements remain
  if (containerRef.current) {
    try {
      while (containerRef.current.firstChild) {
        containerRef.current.removeChild(containerRef.current.firstChild);
      }
    } catch (err) {
      console.error('[Ruffle] Error clearing container:', err);
    }
  }
};
```

**Benefits**:
- ✅ Resets initialization flag immediately
- ✅ Tries `destroy()` before `remove()` for thorough cleanup
- ✅ Cleans up both player and container
- ✅ Handles errors without crashing

## How It Works Now

```
First Visit (Play Game):
  → Check isInitializing: false ✓
  → Set isInitializing: true
  → Wait 100ms (previous cleanup time)
  → Check rufflePlayerRef: null ✓
  → Load Ruffle script (if needed)
  → Create player
  → Remove children properly
  → Append player to container
  → Load SWF
  → Set isInitializing: false
  ✅ Game plays successfully

Navigate Away (Click Back):
  → Cleanup runs
  → Set isInitializing: false
  → Call player.remove()
  → Clear container children
  → Set ref to null
  ✅ Clean state, no errors

Navigate Back (Play Again):
  → Check isInitializing: false ✓
  → Set isInitializing: true
  → Wait 100ms ← Ruffle fully cleaned up from previous
  → Check rufflePlayerRef: null ✓
  → Load Ruffle script (cached)
  → Create player
  → Remove children properly
  → Append player to container
  → Load SWF
  → Set isInitializing: false
  ✅ Game plays successfully, NO ERRORS!
```

## Key Improvements

### 1. Proper Timing

- **100ms** initial delay: Ensures previous cleanup completed
- **200ms** after remove: Ensures Ruffle's internal registry is cleared
- Total overhead: ~300ms on re-mount (imperceptible to users)

### 2. Race Condition Protection

- `isInitializingRef` prevents concurrent initializations
- Mounted checks prevent operations on unmounted components
- Finally block ensures flag is always reset

### 3. Thorough Cleanup

- Try `destroy()` method first (more thorough)
- Fall back to `remove()` if destroy not available
- Clear container using proper DOM methods
- Handle all errors gracefully

### 4. Better Error Handling

- Try-catch around all cleanup operations
- Detailed console logging for debugging
- Graceful degradation on errors

## Testing Checklist

✅ First game load works
✅ Navigate away (cleanup runs)
✅ Navigate back and play again (no errors)
✅ Rapid navigation back and forth (no race conditions)
✅ React Strict Mode compatibility (double-mounting)
✅ Fullscreen toggle still works
✅ No memory leaks
✅ No console errors

## Performance Impact

### Before (Broken)
```
Navigate back and play again:
  → Cleanup runs: player.remove()
  → Component unmounts immediately
  → New component mounts
  → innerHTML = '' (instant DOM clear)
  → Create new player
  → Ruffle's old async operations still running
  → ERROR: Instance ID does not exist
```

### After (Fixed)
```
Navigate back and play again:
  → Cleanup runs: player.remove()
  → Component unmounts
  → New component mounts
  → Wait 100ms (Ruffle cleanup completes)
  → Check for existing player (none)
  → Create new player properly
  → Load SWF
  → ✅ No errors, clean state

Added latency: ~100ms (imperceptible)
```

## Lessons Learned

### Rule 1: Never Use innerHTML with Complex Components

```tsx
// ❌ BAD
containerRef.current.innerHTML = '';

// ✅ GOOD
while (containerRef.current.firstChild) {
  containerRef.current.removeChild(containerRef.current.firstChild);
}
```

### Rule 2: Give Async Libraries Time to Clean Up

```tsx
// ❌ BAD
player.remove();
// Create new instance immediately

// ✅ GOOD
player.remove();
await new Promise(resolve => setTimeout(resolve, 200));
// Now safe to create new instance
```

### Rule 3: Protect Against Race Conditions

```tsx
// ❌ BAD
useEffect(() => {
  initPlayer();
}, [url]);

// ✅ GOOD
const isInitializingRef = useRef(false);
useEffect(() => {
  if (isInitializingRef.current) return;
  isInitializingRef.current = true;
  // ...
  // finally { isInitializingRef.current = false; }
}, [url]);
```

### Rule 4: Check Mounted State Around Async Operations

```tsx
// ✅ GOOD
if (!mounted) {
  cleanup();
  return;
}
await longOperation();
if (!mounted) {
  cleanup();
  return;
}
```

## Conclusion

By adding proper timing delays, race condition protection, thorough cleanup, and defensive checks, we eliminated the "Ruffle Instance ID does not exist" error when navigating between game pages. The key was understanding that Ruffle's cleanup is asynchronous and needs time to complete before creating new instances.

**Key Principle**: When working with libraries that manage complex internal state asynchronously (like Ruffle, video players, WebGL contexts), always:
1. Give them time to clean up (100-200ms)
2. Protect against concurrent operations
3. Use proper DOM manipulation methods
4. Check component mounted state around async operations
