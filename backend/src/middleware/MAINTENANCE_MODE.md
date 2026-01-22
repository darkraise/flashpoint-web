# Maintenance Mode Middleware

## Overview

The maintenance mode middleware provides a way to temporarily restrict access to the application while allowing administrators to continue working. This is useful for:

- Performing database migrations
- Applying critical updates
- System maintenance
- Emergency repairs

## How It Works

The middleware uses a **simplified 4-step approach** to control access during maintenance:

### Prerequisites

**IMPORTANT:** The `softAuth` middleware MUST be applied globally **before** this middleware. `softAuth` populates `req.user` with user data if a valid token exists, without throwing errors. This allows the maintenance middleware to identify admin users.

**Middleware order in server.ts:**
```typescript
app.use(softAuth);           // 1. Populate req.user
app.use(maintenanceMode);    // 2. Check maintenance and admin status
```

### Step 1: Allow Minimal Public Paths

**What:** A minimal set of endpoints that must work for admin to LOGIN during maintenance.

**Why:** Admin needs to be able to log in to access the system and disable maintenance mode.

**Minimal public paths:**
- `/health` - Health check endpoint (monitoring)
- `/api/auth/login` - Admin needs to login
- `/api/auth/refresh` - Token refresh
- `/api/settings/public` - UI needs public settings

### Step 2: Check if Maintenance Mode is Enabled

**What:** Read `app.maintenanceMode` setting from system settings (cached).

**If disabled:** Allow ALL requests through (normal operation)

**If enabled:** Continue to admin check

### Step 3: Admin Bypass - Allow Admin Everything

**What:** Users with `settings.update` permission can access **ALL endpoints**.

**How it works:**
- `req.user` is populated by `softAuth` middleware (applied globally before this)
- Check if `req.user.permissions` includes `'settings.update'`
- If yes → **ALLOW EVERYTHING** (all features, all APIs)

**Admin actions allowed during maintenance:**
- ✅ Browse games, playlists, platforms
- ✅ View and modify all settings
- ✅ Manage users and roles
- ✅ Disable maintenance mode
- ✅ **Full access to all features**

### Step 4: Block Everyone Else

**What:** Non-admin users and guests are blocked from ALL endpoints (except public paths).

**Response:**
```json
{
  "error": "Service Unavailable",
  "message": "The application is currently undergoing maintenance. Please try again later.",
  "maintenanceMode": true,
  "retryAfter": 3600
}
```

**HTTP Headers:**
- Status: `503 Service Unavailable`
- `Retry-After: 3600` (retry after 1 hour)

## Logging

The middleware provides detailed logging to help troubleshoot issues:

### Info Logs (admin access):
- `[Maintenance] Admin <username> accessing GET /api/games` - Admin accessing endpoint during maintenance

### Warning Logs (when requests are blocked):
- `[Maintenance] Blocked GET /api/games from user john (IP: 127.0.0.1)` - Authenticated user blocked
- `[Maintenance] Blocked GET /api/games from unauthenticated user (IP: 127.0.0.1)` - Guest blocked

### Error Logs (critical failures):
- `[Maintenance] Critical error in maintenance middleware: <error>` - Middleware error (request blocked)

## Enabling Maintenance Mode

### Via Settings UI (Admin only):
1. Navigate to Settings → App Settings
2. Toggle "Maintenance Mode" on
3. Confirm the change

### Via API:
```bash
curl -X PATCH http://localhost:3001/api/settings/app \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"maintenanceMode": true}'
```

### Via Database:
```sql
UPDATE system_settings
SET value = '1'
WHERE key = 'app.maintenance_mode';
```

## Testing Maintenance Mode

### Test as Admin:
1. Enable maintenance mode
2. Verify you can still access all pages
3. Check logs - should see debug messages about admin access
4. Disable maintenance mode

### Test as Regular User:
1. Enable maintenance mode (as admin)
2. Log in as regular user in a different browser/incognito
3. Verify API requests are blocked with 503
4. Verify you can still see the login page
5. Disable maintenance mode (as admin)

### Test as Guest:
1. Enable maintenance mode (as admin)
2. Open site in incognito/private window (not logged in)
3. Verify API requests are blocked with 503
4. Verify static assets load (logo, CSS, etc.)
5. Verify you can access login page

## Common Issues

### Issue: "Admin sees blocked requests in logs"

**Cause:** Some browser requests (prefetch, favicon, extensions) may not include the Authorization header.

**Solution:** This is normal. Only API requests to non-whitelisted endpoints need admin auth.

### Issue: "Can't disable maintenance mode"

**Cause:** Admin token may have expired or `/api/settings` is being blocked.

**Solution:**
1. Log out and log back in to get fresh token
2. Or update database directly:
```sql
UPDATE system_settings SET value = '0' WHERE key = 'app.maintenance_mode';
```

### Issue: "UI is broken during maintenance"

**Cause:** Public settings endpoint might be failing.

**Solution:** Verify `/api/settings/public` is in the whitelist and working.

## Security Considerations

### Fail-Closed Strategy (Secure by Default)

**IMPORTANT:** If the middleware encounters an error (e.g., database connection fails), it **blocks the request** rather than allowing it through.

**Why fail-closed:**
- Maintenance mode is a security-critical feature
- Errors during maintenance could indicate database issues
- Safer to block requests than expose potentially broken systems
- Admin can still disable maintenance via database if needed

**Impact:**
- If settings service fails → all requests blocked (except public paths)
- Better to be overly cautious during maintenance

### Token Validation

The middleware relies on `softAuth` middleware (applied globally before it) which:
- Extracts JWT from Authorization header
- Verifies token signature and expiration
- Populates `req.user` with user data
- **Never throws errors** - just sets `req.user` or leaves it undefined

**No duplicate token verification** - token is only verified once by `softAuth`.

### Admin Detection

Only users with the `settings.update` permission can bypass maintenance mode. This is typically only the "admin" role.

**Permission check:**
```typescript
const isAdmin = req.user?.permissions?.includes('settings.update');
```

### Singleton Service Instance

The middleware uses a **shared singleton** instance of `CachedSystemSettingsService`:
- Prevents per-request service instantiation
- Shares cache across all requests
- Better performance and memory usage

## Performance

### Optimizations

- **Cache TTL:** 60 seconds (settings cached in singleton service)
- **Single token verification:** Token verified once by `softAuth`, result reused
- **Early returns:** Requests exit as soon as they're allowed
- **Singleton service:** Shared instance prevents per-request instantiation
- **Minimal processing:** Simple permission checks, no heavy computations

### Request Flow Performance

1. **Public path check:** O(1) - array lookup
2. **Settings read:** Cached (60s TTL) - no DB hit on most requests
3. **Admin check:** O(1) - permission array includes check
4. **Total overhead:** < 1ms for most requests

## Architecture Improvements (Recent)

### What Changed

The maintenance mode middleware was recently **completely revamped** to fix critical issues:

**Old architecture issues:**
- ❌ Duplicate token verification (performance cost)
- ❌ Per-request service instantiation
- ❌ Fail-open security flaw
- ❌ Missing critical endpoints from whitelist
- ❌ Admin users getting blocked

**New architecture benefits:**
- ✅ Single token verification (via `softAuth` middleware)
- ✅ Singleton service instance (shared cache)
- ✅ Fail-closed security (secure by default)
- ✅ Minimal public paths (only what's needed for login)
- ✅ **Admin users get full access to everything**

### Migration Notes

If you're upgrading from the old version:

1. Ensure `softAuth` is applied globally before `maintenanceMode` in `server.ts`
2. Remove any custom auth checks in route handlers (now handled globally)
3. Test admin access to ensure all features work during maintenance
4. Update any documentation referencing the old 4-strategy approach

## Future Enhancements

Potential improvements:
- Configurable maintenance message (via system settings)
- Scheduled maintenance windows
- Read-only mode (allow reads, block writes)
- Maintenance mode status page for users
- Email notifications when maintenance starts/ends
- IP whitelist for additional trusted users during maintenance
- Separate `maintenance.access` permission (distinct from `settings.update`)
