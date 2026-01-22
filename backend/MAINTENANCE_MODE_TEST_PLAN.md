# Maintenance Mode Test Plan

## Overview
This document provides step-by-step testing instructions to verify the revamped maintenance mode works correctly.

**Expected Behavior:**
- When maintenance mode is ON, **admin users** can access **ALL features/endpoints**
- When maintenance mode is ON, **non-admin users and guests** are **blocked from everything** except minimal public paths
- Minimal public paths: `/health`, `/api/auth/login`, `/api/auth/refresh`, `/api/settings/public`

---

## Prerequisites

1. **Start the backend server:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Get admin token:**
   ```bash
   # Login as admin user
   curl -X POST http://localhost:3001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"admin"}'

   # Copy the "accessToken" from response
   ADMIN_TOKEN="<paste-access-token-here>"
   ```

3. **Get regular user token (if exists):**
   ```bash
   # Login as regular user
   curl -X POST http://localhost:3001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"user","password":"password"}'

   # Copy the "accessToken" from response
   USER_TOKEN="<paste-access-token-here>"
   ```

---

## Test Cases

### Test 1: Normal Operation (Maintenance Mode OFF)

**Setup:** Ensure maintenance mode is disabled

```bash
# Disable maintenance mode
curl -X PATCH http://localhost:3001/api/settings/app \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"maintenanceMode": false}'
```

**Expected:** `200 OK` with updated settings

**Test 1.1:** Admin can access games
```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3001/api/games?limit=5
```
**Expected:** `200 OK` with game list

**Test 1.2:** Regular user can access games
```bash
curl -H "Authorization: Bearer $USER_TOKEN" \
  http://localhost:3001/api/games?limit=5
```
**Expected:** `200 OK` with game list

**Test 1.3:** Guest can access public settings
```bash
curl http://localhost:3001/api/settings/public
```
**Expected:** `200 OK` with public settings

---

### Test 2: Maintenance Mode Enabled - Admin Access

**Setup:** Enable maintenance mode

```bash
# Enable maintenance mode as admin
curl -X PATCH http://localhost:3001/api/settings/app \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"maintenanceMode": true}'
```

**Expected:** `200 OK` with `maintenanceMode: true`

**Test 2.1:** Admin can still access games
```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3001/api/games?limit=5
```
**Expected:** ✅ `200 OK` with game list (ADMIN SHOULD ACCESS EVERYTHING!)

**Test 2.2:** Admin can access playlists
```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3001/api/playlists
```
**Expected:** ✅ `200 OK` with playlists

**Test 2.3:** Admin can access platforms
```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3001/api/platforms
```
**Expected:** ✅ `200 OK` with platforms

**Test 2.4:** Admin can access settings
```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3001/api/settings
```
**Expected:** ✅ `200 OK` with all settings

**Test 2.5:** Admin can access users
```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3001/api/users
```
**Expected:** ✅ `200 OK` with user list

**Test 2.6:** Admin can disable maintenance mode
```bash
curl -X PATCH http://localhost:3001/api/settings/app \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"maintenanceMode": false}'
```
**Expected:** ✅ `200 OK` (Admin must be able to turn OFF maintenance!)

---

### Test 3: Maintenance Mode Enabled - Non-Admin Blocking

**Setup:** Re-enable maintenance mode

```bash
# Enable maintenance mode again
curl -X PATCH http://localhost:3001/api/settings/app \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"maintenanceMode": true}'
```

**Test 3.1:** Regular user CANNOT access games
```bash
curl -H "Authorization: Bearer $USER_TOKEN" \
  http://localhost:3001/api/games
```
**Expected:** ❌ `503 Service Unavailable` with `maintenanceMode: true`

**Test 3.2:** Regular user CANNOT access playlists
```bash
curl -H "Authorization: Bearer $USER_TOKEN" \
  http://localhost:3001/api/playlists
```
**Expected:** ❌ `503 Service Unavailable`

**Test 3.3:** Regular user CANNOT access their favorites
```bash
curl -H "Authorization: Bearer $USER_TOKEN" \
  http://localhost:3001/api/favorites
```
**Expected:** ❌ `503 Service Unavailable`

**Test 3.4:** Regular user CANNOT access settings (non-public)
```bash
curl -H "Authorization: Bearer $USER_TOKEN" \
  http://localhost:3001/api/settings
```
**Expected:** ❌ `503 Service Unavailable`

---

### Test 4: Maintenance Mode - Public Paths

**Test 4.1:** Health check works for everyone
```bash
curl http://localhost:3001/health
```
**Expected:** ✅ `200 OK` with `maintenanceMode: true` in response

**Test 4.2:** Public settings accessible
```bash
curl http://localhost:3001/api/settings/public
```
**Expected:** ✅ `200 OK` with public settings

**Test 4.3:** Login endpoint accessible (so admin can login)
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'
```
**Expected:** ✅ `200 OK` with tokens

**Test 4.4:** Token refresh works
```bash
# First get a refresh token from login response, then:
curl -X POST http://localhost:3001/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<refresh-token>"}'
```
**Expected:** ✅ `200 OK` with new access token

---

### Test 5: Maintenance Mode - Guest Access

**Test 5.1:** Guest CANNOT access games
```bash
curl http://localhost:3001/api/games
```
**Expected:** ❌ `503 Service Unavailable`

**Test 5.2:** Guest CANNOT access playlists
```bash
curl http://localhost:3001/api/playlists
```
**Expected:** ❌ `503 Service Unavailable`

**Test 5.3:** Guest CAN access health check
```bash
curl http://localhost:3001/health
```
**Expected:** ✅ `200 OK`

---

### Test 6: Error Handling

**Test 6.1:** Invalid admin token during maintenance
```bash
curl -H "Authorization: Bearer invalid-token-12345" \
  http://localhost:3001/api/games
```
**Expected:** ❌ `503 Service Unavailable` (treated as non-admin)

**Test 6.2:** Expired admin token during maintenance
```bash
# Use an expired token
curl -H "Authorization: Bearer <expired-token>" \
  http://localhost:3001/api/games
```
**Expected:** ❌ `503 Service Unavailable` (treated as non-admin)

---

### Test 7: Logging Verification

**Test 7.1:** Check logs for admin access
```bash
# Enable maintenance, then access as admin
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3001/api/games
```

**Check backend logs:**
```
[Maintenance] Admin <username> accessing GET /api/games
```

**Test 7.2:** Check logs for blocked user
```bash
# Try to access as regular user
curl -H "Authorization: Bearer $USER_TOKEN" \
  http://localhost:3001/api/games
```

**Check backend logs:**
```
[Maintenance] Blocked GET /api/games from user <username> (IP: ::1)
```

---

### Test 8: Retry-After Header

**Test 8.1:** Blocked requests include Retry-After header
```bash
curl -i http://localhost:3001/api/games
```

**Check response headers:**
```
HTTP/1.1 503 Service Unavailable
Retry-After: 3600
```

---

## Summary Checklist

After running all tests, verify:

- [ ] Admin can enable/disable maintenance mode
- [ ] Admin can access ALL endpoints during maintenance (games, playlists, settings, users, etc.)
- [ ] Regular users are blocked from ALL endpoints except public paths
- [ ] Guests are blocked from ALL endpoints except public paths
- [ ] Public paths work for everyone: `/health`, `/api/auth/login`, `/api/auth/refresh`, `/api/settings/public`
- [ ] Logs show admin access during maintenance
- [ ] Logs show blocked requests for non-admins
- [ ] 503 responses include `Retry-After` header
- [ ] 503 responses include `maintenanceMode: true` flag
- [ ] Invalid/expired tokens are treated as non-admin (blocked)

---

## Cleanup

After testing, disable maintenance mode:

```bash
curl -X PATCH http://localhost:3001/api/settings/app \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"maintenanceMode": false}'
```

**Expected:** `200 OK` with `maintenanceMode: false`

Verify normal operation restored:
```bash
# Regular user should now access games
curl -H "Authorization: Bearer $USER_TOKEN" \
  http://localhost:3001/api/games
```

**Expected:** `200 OK` with game list

---

## Troubleshooting

### Issue: Admin still getting blocked

**Possible causes:**
1. Token doesn't have `settings.update` permission
   - Solution: Check user role has admin permissions in database

2. `softAuth` middleware not applied globally
   - Solution: Verify `app.use(softAuth)` is before `app.use(maintenanceMode)` in server.ts

3. Token expired
   - Solution: Login again to get fresh token

### Issue: Regular users can still access during maintenance

**Possible causes:**
1. Maintenance mode not enabled
   - Solution: Check `system_settings` table: `SELECT * FROM system_settings WHERE key = 'app.maintenance_mode'`

2. User has admin permissions
   - Solution: Check user permissions in database

### Issue: Public paths not working

**Possible causes:**
1. Path not in `MINIMAL_PUBLIC_PATHS` array
   - Solution: Add path to whitelist in `maintenanceMode.ts`

2. Path matching issue
   - Solution: Check if path uses exact match or starts-with logic

---

## Next Steps

1. Run through all test cases
2. Verify all checkboxes in summary checklist
3. If any issues, refer to troubleshooting section
4. Once all tests pass, update main documentation
