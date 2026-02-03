# System Settings

## Overview

System Settings provides flexible, centralized configuration management for Flashpoint Web. Settings are organized into categories, validated using JSON schemas, cached for performance, and accessible through web UI and REST API.

## Settings Categories

| Category | Purpose | Example Keys |
|----------|---------|--------------|
| auth | Authentication/security | guestAccessEnabled, maxLoginAttempts, lockoutDurationMinutes |
| app | Application settings | siteName, maintenanceMode, dateFormat, timeFormat |
| metadata | Metadata sync config | autoSyncEnabled, syncIntervalMinutes, syncTags, syncPlatforms |
| features | Feature flags | enablePlaylists, enableFavorites, enableStatistics |
| game | Game player config | defaultScaleMode, defaultVolume, enableFlash |

## Architecture

**Backend Components:**
- `SystemSettingsService` - Core settings CRUD operations
- `CachedSystemSettingsService` - Caching layer wrapper
- Settings routes (routes/system-settings.ts) - REST API
- Validation middleware using JSON Schema

**Frontend Components:**
- `SettingsView` - Main settings page with tabs
- `systemSettingsApi` - API client for settings
- React Query for server state management
- Form validation using controlled components

## Database Schema

```sql
CREATE TABLE system_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT,
  value_type TEXT DEFAULT 'string',
  description TEXT,
  validation_schema TEXT,
  is_public BOOLEAN DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now')),
  updated_by INTEGER,
  UNIQUE(category, key)
);
```

## Settings Tabs

#### General Tab
- **Version Information** - View Flashpoint version and edition (auto-detected from `version.txt`, served via `/api/settings/public`), web app version, and Ruffle emulator version
- **Date & Time Format** - Choose from 7 date and 4 time formats
- **Ruffle Emulator Management** - Check for and install updates (admin only)
- **Authentication Settings** - Control registration and guest access (admin only)

#### App Tab
- **Site Name** - Customize application name
- **Maintenance Mode** - Enable/disable maintenance mode
- **Default Theme** - Set default theme (light, dark, system)
- **Default Primary Color** - Set default color scheme

#### Domain Settings (in App Tab)

The App settings tab includes a **Domain Settings** card below the application settings card:

- **Add Domain** - Text input with inline validation (no protocol, valid format, no duplicates)
- **Domain List** - All configured domains with radio buttons to select the default
- **Delete Domain** - Remove any domain with the trash icon
- **Empty State** - "No domains configured. Share links will use the current browser URL."

The default domain is used when non-admin users share playlists. Admin users see a domain selector dropdown in the Share Playlist dialog to choose which domain to use per share link. When no domains are configured, all share links fall back to `window.location.origin`.

**Permissions:** Requires `settings.update` (admin only)
**API:** See [Domains API](../06-api-reference/domains-api.md)

#### Metadata Tab
- **Auto Sync on Startup** - Automatically sync metadata when server starts
- **Sync Interval** - How often to check for updates (in minutes)
- **Sync Tags** - Include tags in metadata sync
- **Sync Platforms** - Include platforms in metadata sync

#### Features Tab
- **Enable Playlists** - Allow users to create playlists
- **Enable Favorites** - Allow users to favorite games
- **Enable Statistics** - Track and display play statistics
- **Enable Activity Log** - Log user actions for auditing
- **Enable User Profiles** - Allow profile customization

#### Game Tab
- **Default Scale Mode** - Default Ruffle scale mode for Flash games
- **Default Volume** - Default audio volume (0-100%)
- **Enable Flash Games** - Allow Flash game playback
- **Enable HTML5 Games** - Allow HTML5 game playback

## Caching Strategy

**CachedSystemSettingsService:**
- **TTL:** 60 seconds (configurable)
- **Invalidation:** Automatic on update
- **Cleanup:** Every 5 minutes
- **Statistics:** Hit rate, key count, size tracking

**Cache Benefits:**
- Response time: <1ms (cache hit) vs ~10ms (DB query)
- Database load reduced by ~85%
- No contention with concurrent reads
- Typical cache hit rate: >90%

## Validation

All settings use JSON Schema validation:

**Example Schema (maxLoginAttempts):**
```json
{
  "type": "integer",
  "minimum": 1,
  "maximum": 20,
  "description": "Maximum failed login attempts before account lockout"
}
```

**Validation Process:**
1. Client sends update request
2. Backend validates against JSON schema
3. Type checking enforced
4. Range/enum constraints verified
5. Error returned if validation fails
6. Setting updated if valid

## Default Values

**Auth Defaults:**
- guestAccessEnabled: true
- userRegistrationEnabled: true
- maxLoginAttempts: 5
- lockoutDurationMinutes: 15

**App Defaults:**
- siteName: "Flashpoint Web"
- maintenanceMode: false
- defaultTheme: "dark"
- defaultPrimaryColor: "blue"
- dateFormat: "MM/dd/yyyy"
- timeFormat: "hh:mm a"

**Metadata Defaults:**
- autoSyncEnabled: false
- syncIntervalMinutes: 60
- syncTags: true
- syncPlatforms: true

**Note:** Flashpoint edition and version are not database settings. They are auto-detected from `version.txt` at startup and injected into the `/api/settings/public` response from the backend `config` object.

**Features Defaults:**
- All features enabled by default

**Game Defaults:**
- defaultScaleMode: "showall"
- defaultVolume: 0.7
- enableFlash: true
- enableHtml5: true

## Features

**Real-time Updates:**
- Changes saved automatically when modified
- No page refresh required
- Validation feedback shown immediately

**Permission-Based Access:**
- Only administrators can view and modify
- Regular users see only what they need
- Guest users have no access

**Validation:**
- All inputs validated before saving
- Type checking (boolean, number, string)
- Range checking (min/max values)
- Enum validation (allowed values only)

## Security

**Access Control:**
- `settings.read` - View settings (admin only)
- `settings.update` - Modify settings (admin only)

**Validation:**
- All inputs validated against schemas
- Type safety enforced
- SQL injection prevented (prepared statements)
- XSS prevention (no HTML in values)

**Audit Trail:**
All setting changes logged via `ActivityService`:
```typescript
await activityService.log({
  userId: user.id,
  action: 'settings.update',
  resource: 'system_settings',
  details: { category: 'auth', changes: { guestAccessEnabled: false } }
});
```

## Best Practices

### Adding New Settings

1. Choose appropriate category (or create new if needed)
2. Define validation schema with type and constraints
3. Set sensible default
4. Update documentation
5. Test validation and caching thoroughly

**Example:**
```sql
INSERT INTO system_settings (category, key, value, value_type, description, validation_schema)
VALUES (
  'app',
  'maxUploadSizeMB',
  '10',
  'number',
  'Maximum file upload size in megabytes',
  '{"type":"integer","minimum":1,"maximum":1000}'
);
```

### Modifying Existing Settings

1. Check dependencies
2. Update validation schema if needed
3. Clear cache after direct DB updates
4. Test rollback to ensure old values still work

### Performance Tips

1. Batch multiple setting updates
2. Cache appropriately - don't cache frequently changing settings
3. Use category queries - more efficient than individual key queries
4. Monitor cache hit rate - adjust TTL if needed

## Troubleshooting

**Settings not applying immediately:**
- Cache TTL not expired (60 seconds)
- Solution: Clear cache or wait for TTL

**Validation errors on valid values:**
- Validation schema mismatch
- Solution: Check schema in database, update if needed

**Performance degradation:**
- Cache disabled or not working
- Solution: Verify CachedSystemSettingsService is in use

**Missing settings:**
- Migration didn't run or failed
- Solution: Check migration logs, run manually if needed
