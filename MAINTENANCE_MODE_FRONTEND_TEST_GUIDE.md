# Maintenance Mode Frontend Testing Guide

## Overview

This guide provides step-by-step instructions to test the complete maintenance mode implementation, including **frontend redirection** for non-admin users.

## Expected Behavior

### When Maintenance Mode is ON:

1. **Admin Users:**
   - ✅ Can log in normally
   - ✅ Can access **ALL pages** (games, playlists, settings, etc.)
   - ✅ Can navigate using browser address bar
   - ✅ See normal app UI (no maintenance page)
   - ✅ Can disable maintenance mode from settings

2. **Regular Users:**
   - ✅ Can log in successfully
   - ❌ **Immediately redirected to maintenance page**
   - ❌ **Cannot access any app pages** (even via address bar)
   - ❌ Any navigation attempt redirects back to maintenance page
   - ✅ See maintenance page with logout option

3. **Guests:**
   - ❌ **Immediately redirected to maintenance page**
   - ❌ Cannot browse games
   - ✅ Can access login page

---

## Prerequisites

1. **Start both backend and frontend:**
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm run dev

   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

2. **Create test users (if not already exist):**
   - Admin user: `admin` / `admin`
   - Regular user: `user` / `password`

---

## Test Scenario 1: Admin User Experience

### Step 1: Login as Admin
```
1. Open http://localhost:5173/login
2. Login with admin credentials
3. Expected: Redirected to flash games page ✅
```

### Step 2: Enable Maintenance Mode
```
1. Navigate to Settings page
2. Go to "App Settings" tab
3. Toggle "Maintenance Mode" ON
4. Expected: Setting saved successfully
5. Expected: Admin sees no changes (stays on settings page) ✅
```

### Step 3: Navigate Around App
```
1. Click on "Flash Games" sidebar link
2. Expected: Games load normally ✅

3. Click on "Playlists" sidebar link
4. Expected: Playlists load normally ✅

5. Type http://localhost:5173/favorites in address bar
6. Expected: Favorites page loads normally ✅

7. Open browser devtools console
8. Expected: No errors about maintenance mode ✅
```

### Step 4: Verify Admin Can Disable Maintenance
```
1. Go back to Settings → App Settings
2. Toggle "Maintenance Mode" OFF
3. Expected: Setting saved successfully ✅
```

---

## Test Scenario 2: Regular User Experience (CRITICAL)

### Step 1: Enable Maintenance Mode as Admin
```
1. Login as admin (if not already)
2. Go to Settings → App Settings
3. Toggle "Maintenance Mode" ON
4. Confirm it's enabled
5. Logout (admin)
```

### Step 2: Login as Regular User
```
1. Open http://localhost:5173/login
2. Login with regular user credentials
3. Expected: Login succeeds
4. Expected: **IMMEDIATELY redirected to /maintenance page** ✅
```

**What you should see:**
- Maintenance page with:
  - Yellow warning icon
  - "Under Maintenance" title
  - "We're currently performing system maintenance..." message
  - "Logged in as: user" text
  - "Refresh Page" button
  - "Logout" button

### Step 3: Try to Navigate Using Address Bar
```
1. In address bar, type: http://localhost:5173/flash-games
2. Press Enter
3. Expected: **Redirected back to /maintenance** ✅

4. In address bar, type: http://localhost:5173/playlists
5. Press Enter
6. Expected: **Redirected back to /maintenance** ✅

7. In address bar, type: http://localhost:5173/settings
8. Press Enter
9. Expected: **Redirected back to /maintenance** ✅
```

**Critical:** No matter what URL the user types, they should be redirected to the maintenance page!

### Step 4: Test Navigation Blocking
```
1. Open browser devtools console
2. Try to navigate: window.location.href = '/flash-games'
3. Expected: **Redirected back to /maintenance** ✅
```

### Step 5: Test Logout
```
1. Click "Logout" button on maintenance page
2. Expected: Redirected to login page ✅
3. Expected: User is logged out ✅
```

---

## Test Scenario 3: Guest User Experience

### Step 1: Access App Without Login
```
1. Open incognito/private browser window
2. Go to http://localhost:5173
3. Expected: **Redirected to /maintenance page** ✅
```

### Step 2: Verify Login Page Still Works
```
1. In address bar, type: http://localhost:5173/login
2. Expected: Login page loads normally ✅
3. Don't login yet
```

### Step 3: Try to Access Games Without Login
```
1. In address bar, type: http://localhost:5173/flash-games
2. Expected: **Redirected to /maintenance page** ✅
```

---

## Test Scenario 4: Maintenance Mode Polling

### Step 1: Keep Regular User Session Open
```
1. Login as regular user (should be on maintenance page)
2. Keep the page open
```

### Step 2: Admin Disables Maintenance
```
1. In a different browser (or incognito), login as admin
2. Go to Settings → App Settings
3. Toggle "Maintenance Mode" OFF
4. Logout admin
```

### Step 3: Verify Regular User Auto-Redirects
```
1. Go back to regular user's maintenance page
2. Wait 30 seconds (maintenance check interval)
3. Expected: **Page automatically redirects to home/flash-games** ✅
```

**Note:** The maintenance page polls every 30 seconds and auto-redirects when maintenance ends.

---

## Test Scenario 5: Maintenance Page Features

### Step 1: Test Refresh Button
```
1. Login as regular user (on maintenance page)
2. Click "Refresh Page" button
3. Expected: Page reloads
4. Expected: Still on maintenance page (if maintenance still ON) ✅
```

### Step 2: Verify User Info Display
```
1. On maintenance page, verify it shows:
   "Logged in as: <username>" ✅
```

---

## Test Scenario 6: Login Flow During Maintenance

### Step 1: Logout and Try to Login Again
```
1. As regular user on maintenance page
2. Click "Logout"
3. Login again with same credentials
4. Expected: **Immediately redirected to maintenance page** ✅
5. Expected: No flash of normal app UI ✅
```

### Step 2: Admin Login During Maintenance
```
1. Logout from regular user
2. Login as admin
3. Expected: Redirected to flash games (normal app)
4. Expected: **No maintenance page shown** ✅
```

---

## Troubleshooting

### Issue: Regular user can still access app pages

**Possible causes:**
1. Maintenance mode not enabled
   - Solution: Check Settings → App Settings → Maintenance Mode is ON

2. User has admin permissions
   - Solution: Verify user doesn't have `settings.update` permission

3. Frontend not detecting maintenance mode
   - Solution: Check browser console for errors
   - Solution: Check `/api/settings/public` returns `maintenanceMode: true`

### Issue: Admin gets redirected to maintenance page

**Possible causes:**
1. Admin token expired
   - Solution: Logout and login again

2. Admin doesn't have `settings.update` permission
   - Solution: Check admin role has `settings.update` permission in database

3. MaintenanceGuard not checking admin correctly
   - Solution: Check browser console for errors

### Issue: Page doesn't auto-redirect when maintenance ends

**Possible causes:**
1. Polling not working
   - Solution: Check browser console for API errors
   - Solution: Verify `/api/settings/public` endpoint is accessible

2. 30 second interval hasn't passed yet
   - Solution: Wait for 30 seconds or refresh page manually

---

## Visual Checklist

After running all tests, verify:

- [ ] Admin can enable/disable maintenance mode
- [ ] Admin can access ALL pages during maintenance
- [ ] Regular user sees maintenance page immediately after login
- [ ] Regular user **cannot** navigate to any app page (address bar blocked)
- [ ] Guest user sees maintenance page when trying to access app
- [ ] Login page still works during maintenance
- [ ] Maintenance page shows correct user info
- [ ] "Logout" button works on maintenance page
- [ ] "Refresh" button works on maintenance page
- [ ] Page auto-redirects when maintenance ends (after 30s)
- [ ] No console errors in browser devtools

---

## Expected Console Logs

### Backend Logs (Maintenance ON, Regular User Tries to Access):
```
[Maintenance] Blocked GET /api/games from user testuser (IP: ::1)
[Maintenance] Blocked GET /api/playlists from user testuser (IP: ::1)
```

### Backend Logs (Maintenance ON, Admin Accesses):
```
[Maintenance] Admin admin accessing GET /api/games
[Maintenance] Admin admin accessing GET /api/playlists
```

---

## Cleanup

After testing, disable maintenance mode:
```
1. Login as admin
2. Go to Settings → App Settings
3. Toggle "Maintenance Mode" OFF
4. Expected: Regular users can now access app normally
```

Verify cleanup:
```
1. Logout admin
2. Login as regular user
3. Expected: Redirected to flash games (normal operation) ✅
```

---

## Success Criteria

All tests pass when:
1. ✅ Admin users have full app access during maintenance
2. ✅ Regular users see maintenance page and **cannot** navigate away
3. ✅ Guests see maintenance page
4. ✅ Login page always works
5. ✅ Maintenance page auto-redirects when maintenance ends
6. ✅ No console errors
7. ✅ Navigation blocking works (including address bar)

---

## Notes

- Maintenance check happens every **30 seconds** (automatic polling)
- Admin detection is based on `settings.update` permission
- Maintenance mode setting is stored in backend database
- Frontend reads maintenance status from `/api/settings/public`
- MaintenanceGuard wraps all app routes to enforce redirection
