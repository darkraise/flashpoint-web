# Settings API

## Overview

The Settings API provides endpoints for managing system-wide configuration settings. Settings are organized into categories (auth, app, metadata, features, game) and stored as key-value pairs with validation and caching support.

**Base Path:** `/api/settings`

**Authentication:** Required (JWT Bearer token)

**Required Permissions:**
- `settings.read` - View settings
- `settings.update` - Modify settings

---

## Endpoints

### GET /api/settings

Get all system settings grouped by category.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response (200 OK):**
```json
{
  "auth": {
    "guestAccessEnabled": true,
    "userRegistrationEnabled": true,
    "maxLoginAttempts": 5,
    "lockoutDurationMinutes": 15
  },
  "app": {
    "siteName": "Flashpoint Web",
    "maintenanceMode": false,
    "defaultTheme": "dark",
    "defaultPrimaryColor": "blue"
  },
  "metadata": {
    "autoSyncEnabled": false,
    "syncIntervalMinutes": 60,
    "syncTags": true,
    "syncPlatforms": true
  },
  "features": {
    "enablePlaylists": true,
    "enableFavorites": true,
    "enableStatistics": true,
    "enableActivityLog": true,
    "enableUserProfiles": true
  },
  "game": {
    "defaultScaleMode": "showall",
    "defaultVolume": 0.7,
    "enableFlash": true,
    "enableHtml5": true
  }
}
```

**Errors:**
- 401: Unauthorized
- 403: Forbidden (missing settings.read permission)

---

### GET /api/settings/:category

Get all settings for a specific category.

**Parameters:**
- `category` (path): Setting category ("auth", "app", "metadata", "features", "game")

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Example Request:**
```
GET /api/settings/auth
```

**Response (200 OK):**
```json
{
  "guestAccessEnabled": true,
  "userRegistrationEnabled": true,
  "maxLoginAttempts": 5,
  "lockoutDurationMinutes": 15
}
```

**Errors:**
- 401: Unauthorized
- 403: Forbidden
- 404: Category not found

---

### PATCH /api/settings/:category

Update multiple settings within a category.

**Parameters:**
- `category` (path): Setting category

**Headers:**
```
Authorization: Bearer {accessToken}
Content-Type: application/json
```

**Request Body:**
```json
{
  "guestAccessEnabled": false,
  "maxLoginAttempts": 3,
  "lockoutDurationMinutes": 30
}
```

**Response (200 OK):**
```json
{
  "guestAccessEnabled": false,
  "userRegistrationEnabled": true,
  "maxLoginAttempts": 3,
  "lockoutDurationMinutes": 30
}
```

**Validation:**
- Values are validated against JSON schemas defined in `validation_schema` column
- Type checking enforces correct data types (boolean, number, string)
- Enum validation for constrained values (e.g., theme modes)

**Errors:**
- 400: Validation error (invalid value, wrong type, constraint violation)
- 401: Unauthorized
- 403: Forbidden (missing settings.update permission)
- 404: Category not found

---

### GET /api/settings/:category/:key

Get a single setting value.

**Parameters:**
- `category` (path): Setting category
- `key` (path): Setting key

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Example Request:**
```
GET /api/settings/auth/guestAccessEnabled
```

**Response (200 OK):**
```json
{
  "value": true
}
```

**Errors:**
- 401: Unauthorized
- 403: Forbidden
- 404: Setting not found

---

### PATCH /api/settings/:category/:key

Update a single setting value.

**Parameters:**
- `category` (path): Setting category
- `key` (path): Setting key

**Headers:**
```
Authorization: Bearer {accessToken}
Content-Type: application/json
```

**Request Body:**
```json
{
  "value": false
}
```

**Response (200 OK):**
```json
{
  "value": false
}
```

**Validation:**
- Value is validated against the setting's JSON schema
- Type must match the setting's `value_type` (boolean, number, string, json)

**Errors:**
- 400: Validation error
- 401: Unauthorized
- 403: Forbidden
- 404: Setting not found

---

### GET /api/settings/_cache/stats

Get cache statistics (admin only).

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response (200 OK):**
```json
{
  "keyCount": 23,
  "categoryCount": 5,
  "hitRate": 0.85,
  "size": 4096
}
```

**Errors:**
- 401: Unauthorized
- 403: Forbidden

---

### POST /api/settings/_cache/clear

Clear settings cache (admin only).

**Headers:**
```
Authorization: Bearer {accessToken}
Content-Type: application/json
```

**Request Body (Optional):**
```json
{
  "category": "auth"
}
```

**Response (200 OK):**
```json
{
  "message": "Cache cleared successfully"
}
```

**Notes:**
- If `category` is provided, only that category's cache is cleared
- If no category provided, entire cache is cleared

**Errors:**
- 401: Unauthorized
- 403: Forbidden

---

### GET /_cache/permissions/stats

Get permission cache statistics (admin only).

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response (200 OK):**
```json
{
  "userCacheSize": 42,
  "roleCacheSize": 3,
  "totalSize": 45,
  "description": {
    "userCacheSize": "Number of cached user permissions",
    "roleCacheSize": "Number of cached role permissions",
    "totalSize": "Total cached entries",
    "ttl": {
      "userPermissions": "5 minutes",
      "rolePermissions": "10 minutes"
    }
  }
}
```

**Authentication:** Required (JWT Bearer token)
**Permission:** `settings.update` (admin only)

**Errors:**
- 401: Unauthorized
- 403: Forbidden (missing settings.update permission)

---

### POST /_cache/permissions/clear

Clear permission cache (admin only).

**Headers:**
```
Authorization: Bearer {accessToken}
Content-Type: application/json
```

**Request Body (Optional):**
```json
{
  "type": "user",
  "id": 5
}
```

**Options:**
- `{ "type": "user", "id": 5 }` - Clear cache for user ID 5
- `{ "type": "role", "id": 2 }` - Clear cache for role ID 2
- `{ "type": "all" }` - Clear entire permission cache
- `{}` - Clear entire permission cache (no body)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Permission cache cleared successfully",
  "cleared": "user_5"
}
```

**Authentication:** Required (JWT Bearer token)
**Permission:** `settings.update` (admin only)

**Errors:**
- 400: Invalid request (unknown type or missing id)
- 401: Unauthorized
- 403: Forbidden (missing settings.update permission)

**Use Cases:**
- Clear all caches after bulk permission changes
- Clear user cache after manually updating user roles in database
- Clear role cache after directly modifying role_permissions table
- Debugging permission-related issues

**Activity Logging:**
- Logs activity: `settings.permission_cache_clear`
- Includes: user ID, cache type, target ID

---

## Settings Categories

### auth

Authentication and security settings.

| Key | Type | Default | Validation |
|-----|------|---------|-----------|
| guestAccessEnabled | boolean | true | - |
| userRegistrationEnabled | boolean | true | - |
| maxLoginAttempts | number | 5 | min: 1, max: 20 |
| lockoutDurationMinutes | number | 15 | min: 1, max: 1440 |

### app

Application-wide settings.

| Key | Type | Default | Validation |
|-----|------|---------|-----------|
| siteName | string | "Flashpoint Web" | minLength: 1, maxLength: 100 |
| maintenanceMode | boolean | false | - |
| defaultTheme | string | "dark" | enum: ["light", "dark", "system"] |
| defaultPrimaryColor | string | "blue" | enum: ["blue", "green", "red", "purple", "orange", "pink"] |

### metadata

Metadata synchronization settings.

| Key | Type | Default | Validation |
|-----|------|---------|-----------|
| autoSyncEnabled | boolean | false | - |
| syncIntervalMinutes | number | 60 | min: 0, max: 1440 |
| syncTags | boolean | true | - |
| syncPlatforms | boolean | true | - |

### features

Feature flags for toggling functionality.

| Key | Type | Default | Validation |
|-----|------|---------|-----------|
| enablePlaylists | boolean | true | - |
| enableFavorites | boolean | true | - |
| enableStatistics | boolean | true | - |
| enableActivityLog | boolean | true | - |
| enableUserProfiles | boolean | true | - |

### game

Game player configuration.

| Key | Type | Default | Validation |
|-----|------|---------|-----------|
| defaultScaleMode | string | "showall" | enum: ["showall", "exactfit", "noborder", "noscale"] |
| defaultVolume | number | 0.7 | min: 0, max: 1 |
| enableFlash | boolean | true | - |
| enableHtml5 | boolean | true | - |

---

## Implementation Details

### Caching

Settings are cached in memory using `CachedSystemSettingsService`:
- **TTL:** 60 seconds (configurable)
- **Cache Key Format:** `category` or `category:key`
- **Invalidation:** Automatic on update, manual via clear endpoint
- **Cleanup:** Every 5 minutes

### Validation

All settings updates are validated using JSON Schema:
- Type validation (boolean, number, string, array, object)
- Range validation (min/max for numbers)
- Length validation (minLength/maxLength for strings)
- Enum validation (allowed values)
- Format validation (email, url, etc.)

### Services

**SystemSettingsService:**
- Direct database access
- CRUD operations for settings
- Validation enforcement
- Atomic category updates

**CachedSystemSettingsService:**
- Wraps SystemSettingsService
- In-memory caching layer
- Cache statistics tracking
- Automatic invalidation

### Frontend Integration

**API Client:**
```typescript
import { systemSettingsApi } from '@/lib/api';

// Get all settings
const allSettings = await systemSettingsApi.getAll();

// Get category
const authSettings = await systemSettingsApi.getCategory('auth');

// Update category
await systemSettingsApi.updateCategory('auth', {
  guestAccessEnabled: false,
  maxLoginAttempts: 3
});

// Get single setting
const { value } = await systemSettingsApi.getSetting('auth', 'guestAccessEnabled');

// Update single setting
await systemSettingsApi.updateSetting('auth', 'guestAccessEnabled', false);
```

**Settings UI:**
- Located in `frontend/src/views/SettingsView.tsx`
- Tabbed interface for each category
- Real-time validation feedback
- Admin-only access (requires `settings.update` permission)

---

## Migration History

Settings system was introduced and evolved through these migrations:

1. **003_create-system-settings.sql** - Created system_settings table with seeded defaults
2. **004_add-validation-schemas.sql** - Added JSON Schema validation support

---

## Best Practices

1. **Always validate before updating** - Use the validation schemas
2. **Clear cache after direct DB updates** - Ensure consistency
3. **Test settings changes** - Verify they don't break functionality
4. **Document new settings** - Update this file and validation schemas
5. **Use appropriate types** - Store booleans as booleans, not strings
6. **Set sensible defaults** - In migration files and code
7. **Implement rollback** - For critical setting changes

---

## Troubleshooting

### Settings not updating
- Check cache - may need to wait for TTL or clear cache
- Verify permissions - user must have `settings.update`
- Check validation errors in response

### Validation errors
- Review validation schema for the setting
- Ensure value matches expected type
- Check constraints (min/max, enum values)

### Cache inconsistencies
- Clear cache manually via API endpoint
- Check cache TTL configuration
- Verify invalidation is working on updates

---

## Future Enhancements

- Settings versioning and history
- Setting groups/presets
- Import/export settings
- Setting dependencies and rules
- UI for managing validation schemas
- Setting change notifications
- Audit trail for setting changes
