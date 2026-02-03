# Settings API

Manage system-wide configuration settings.

**Authentication:** Required (JWT Bearer token)
**Permissions:** `settings.read` (view), `settings.update` (modify)

## Get All Settings

`GET /api/settings` - Requires `settings.read` permission

Returns grouped settings by category (auth, app, metadata, features, game).

## Get Category Settings

`GET /api/settings/:category` - Requires `settings.read` permission

Returns all settings for category (auth|app|metadata|features|game).

## Update Category Settings

`PATCH /api/settings/:category` - Requires `settings.update` permission

Body (all optional): `{ "key1": value1, "key2": value2, ... }`

Validates all values against JSON schemas. Type must match setting's value_type.

## Get Single Setting

`GET /api/settings/:category/:key` - Requires `settings.read` permission

Returns `{ "value": ... }`

## Update Single Setting

`PATCH /api/settings/:category/:key` - Requires `settings.update` permission

Body: `{ "value": ... }`

## Cache Management

### Get Cache Stats

`GET /api/settings/_cache/stats` - Admin only

Returns keyCount, categoryCount, hitRate, size.

### Clear Settings Cache

`POST /api/settings/_cache/clear` - Admin only

Body (optional): `{ "category": "auth" }` (clear specific category or all if not provided)

### Get Permission Cache Stats

`GET /_cache/permissions/stats` - Admin only

### Clear Permission Cache

`POST /_cache/permissions/clear` - Admin only

Body options:
- `{ "type": "user", "id": 5 }` - Clear user 5
- `{ "type": "role", "id": 2 }` - Clear role 2
- `{ "type": "all" }` or `{}` - Clear all

## Settings Categories

| Category | Setting | Type | Default | Validation |
|----------|---------|------|---------|-----------|
| auth | guestAccessEnabled | boolean | true | - |
| auth | userRegistrationEnabled | boolean | true | - |
| auth | maxLoginAttempts | number | 5 | 1-20 |
| auth | lockoutDurationMinutes | number | 15 | 1-1440 |
| app | siteName | string | Flashpoint Web | maxLength: 100 |
| app | maintenanceMode | boolean | false | - |
| app | defaultTheme | string | dark | light\|dark\|system |
| app | defaultPrimaryColor | string | blue | blue\|green\|red\|purple\|orange\|pink |
| metadata | autoSyncEnabled | boolean | false | - |
| metadata | syncIntervalMinutes | number | 60 | 0-1440 |
| features | enablePlaylists | boolean | true | - |
| features | enableFavorites | boolean | true | - |
| features | enableStatistics | boolean | true | - |
| features | enableActivityLog | boolean | true | - |
| game | defaultScaleMode | string | showall | showall\|exactfit\|noborder\|noscale |
| game | defaultVolume | number | 0.7 | 0-1 |

## Implementation Notes

**Caching:** Settings cached 60 seconds (in-memory). Auto-invalidated on update.

**Validation:** All updates validated against JSON schemas. Type, range, and enum validation enforced.

**Frontend Integration:**

```typescript
import { systemSettingsApi } from '@/lib/api';

// Get all
const all = await systemSettingsApi.getAll();

// Get category
const auth = await systemSettingsApi.getCategory('auth');

// Update category
await systemSettingsApi.updateCategory('auth', {
  guestAccessEnabled: false,
  maxLoginAttempts: 3
});

// Get single
const { value } = await systemSettingsApi.getSetting('auth', 'guestAccessEnabled');

// Update single
await systemSettingsApi.updateSetting('auth', 'guestAccessEnabled', false);
```

## Best Practices

- Always validate before updating (schemas enforced server-side)
- Clear cache after direct database updates
- Test setting changes before applying to production
- Document new settings in validation schemas
- Set sensible defaults
- Store values correctly (booleans as booleans, not strings)
