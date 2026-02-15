# Maintenance Mode

Temporarily restrict access to the application while performing system updates.

## Overview

Maintenance mode allows administrators to temporarily block access to the application
while performing critical operations like database migrations, updates, or emergency
repairs. When enabled, only administrators can access the system while regular users
and guests receive a maintenance message.

## How It Works

When maintenance mode is enabled:

1. **Administrators** (users with `settings.update` permission) can access everything
2. **Regular users** are blocked from all API endpoints
3. **Guest users** are blocked from all API endpoints
4. **Public paths** remain accessible for login (so admins can authenticate)

## Enabling Maintenance Mode

### Via Settings UI

1. Navigate to **Settings** → **App Settings** (requires admin access)
2. Toggle **Maintenance Mode** on
3. Confirm the change

### Via API

```bash
curl -X PATCH http://localhost:3100/api/settings/app \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"maintenanceMode": true}'
```

### Via Database (Emergency)

If locked out, update the database directly:

```sql
UPDATE system_settings
SET value = '0'
WHERE key = 'app.maintenance_mode';
```

## User Experience

### Admin Users

Admins experience no change during maintenance:
- Full access to all features
- Can browse games, manage users, update settings
- Log entries show admin activity during maintenance

### Non-Admin Users

When a non-admin user tries to access the site:

**API Response:**
```json
{
  "error": "Service Unavailable",
  "message": "The application is currently undergoing maintenance. Please try again later.",
  "maintenanceMode": true,
  "retryAfter": 3600
}
```

**HTTP Status:** `503 Service Unavailable`

**Headers:**
- `Retry-After: 3600` (suggests retry after 1 hour)

### Frontend Handling

The frontend should:
1. Detect 503 responses with `maintenanceMode: true`
2. Display a maintenance message to users
3. Provide a way to check if maintenance has ended

## Public Paths

These endpoints remain accessible during maintenance (for admin login):

| Path | Purpose |
|------|---------|
| `/health` | Health check endpoint |
| `/api/auth/login` | Admin authentication |
| `/api/auth/register` | User registration |
| `/api/auth/setup-status` | Initial setup check |
| `/api/auth/refresh` | Token refresh |
| `/api/settings/public` | Public settings (UI needs) |
| `/api/playlists/shared/*` | Shared playlist access |

## Security

### Fail-Closed Strategy

If the maintenance middleware encounters an error (e.g., database failure), it
**blocks requests** rather than allowing them through. This ensures the system
remains protected even during failures.

### Admin Detection

Admin status is determined by checking if the user has the `settings.update`
permission. This permission is typically assigned only to the "admin" role.

### Token Validation

The middleware relies on `softAuth` middleware to validate JWT tokens. No duplicate
validation is performed, ensuring good performance.

## Testing Maintenance Mode

### As Admin
1. Enable maintenance mode via Settings
2. Verify you can still access all features
3. Check activity logs for maintenance access entries
4. Disable maintenance mode

### As Regular User
1. Have an admin enable maintenance mode
2. Open the site in a different browser/incognito
3. Verify you see the maintenance message
4. Verify login page is accessible (for error display)
5. Have admin disable maintenance mode

### As Guest
1. Enable maintenance mode (as admin)
2. Open site in incognito (not logged in)
3. Verify API requests return 503
4. Verify static assets still load

## Troubleshooting

### Can't Disable Maintenance Mode

**Cause:** Admin token may have expired.

**Solution:**
1. Log out and log back in for a fresh token
2. Or update database directly (see above)

### UI Broken During Maintenance

**Cause:** Public settings endpoint may be failing.

**Solution:** Verify `/api/settings/public` is accessible and returning valid data.

### Admin Getting Blocked

**Cause:** User may not have `settings.update` permission.

**Solution:**
1. Check user's role permissions in the database
2. Ensure user is assigned the admin role

## Logging

The middleware logs all maintenance-related activity:

| Log Level | Message | Description |
|-----------|---------|-------------|
| INFO | `[Maintenance] Admin <username> accessing...` | Admin request during maintenance |
| WARN | `[Maintenance] Blocked...` | Non-admin request blocked |
| ERROR | `[Maintenance] Critical error...` | Middleware failure |

## Best Practices

1. **Notify users beforehand** when possible (email, announcement)
2. **Keep maintenance windows short** to minimize disruption
3. **Test critical operations** before enabling maintenance
4. **Monitor logs** during maintenance for issues
5. **Have database access ready** in case of admin lockout
6. **Verify admin login works** before enabling maintenance

## Related Documentation

- [System Settings](./09-system-settings.md) - Where maintenance mode is configured
- [Authentication](./01-authentication-authorization.md) - How admin access works
- [Settings API](../06-api-reference/settings-api.md) - API for toggling maintenance
- [Internal Maintenance Docs](../../backend/src/middleware/MAINTENANCE_MODE.md) - Technical implementation details
