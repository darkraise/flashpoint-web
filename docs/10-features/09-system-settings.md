# System Settings

## Overview

The System Settings feature provides a flexible, centralized configuration management system for Flashpoint Web. Settings are organized into categories, validated using JSON schemas, cached for performance, and accessible through both a web UI and REST API.

## User-Facing Functionality

### Settings Interface

**Access:** Settings page (Admin only, requires `settings.update` permission)

The settings UI is organized into five tabs:

#### 1. General Tab
- **Version Information** - View app and Flashpoint versions
- **Date & Time Format** - Customize how dates and times are displayed throughout the application
  - **Date Format** - Choose from 7 formats (MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD, etc.)
  - **Time Format** - Choose from 4 formats (12-hour, 24-hour, with/without seconds)
- **Ruffle Emulator Management** - Check for and install Ruffle updates (admin only)
  - View current version and installation status
  - Check for updates with changelog display
  - One-click update installation
- **Authentication Settings** - Control user registration and guest access (admin only)

#### 2. App Tab
- **Site Name** - Customize the application name
- **Maintenance Mode** - Enable/disable maintenance mode
- **Default Theme** - Set default theme (light, dark, system)
- **Default Primary Color** - Set default color scheme

#### 3. Metadata Tab
- **Auto Sync on Startup** - Automatically sync metadata when server starts
- **Sync Interval** - How often to check for updates (in minutes)
- **Sync Tags** - Include tags in metadata sync
- **Sync Platforms** - Include platforms in metadata sync

#### 4. Features Tab
- **Enable Playlists** - Allow users to create playlists
- **Enable Favorites** - Allow users to favorite games
- **Enable Statistics** - Track and display play statistics
- **Enable Activity Log** - Log user actions for auditing
- **Enable User Profiles** - Allow profile customization

#### 5. Game Tab
- **Default Scale Mode** - Default Ruffle scale mode for Flash games
- **Default Volume** - Default audio volume (0-100%)
- **Enable Flash Games** - Allow Flash game playback
- **Enable HTML5 Games** - Allow HTML5 game playback

### Features

**Real-time Updates:**
- Changes are saved automatically when modified
- No need to refresh page
- Validation feedback shown immediately

**Permission-Based Access:**
- Only administrators can view and modify settings
- Regular users see only what they need (version info)
- Guest users have no access to settings

**Validation:**
- All inputs are validated before saving
- Type checking (boolean, number, string)
- Range checking (min/max values)
- Enum validation (allowed values only)

## Technical Implementation

### Architecture

**Backend Components:**
- `SystemSettingsService` - Core settings CRUD operations
- `CachedSystemSettingsService` - Caching layer wrapper
- `routes/system-settings.ts` - REST API endpoints
- Validation middleware using JSON Schema

**Frontend Components:**
- `SettingsView` - Main settings page with tabs
- `systemSettingsApi` - API client for settings
- React Query for server state management
- Form validation using controlled components

### Database Schema

Settings are stored in the `system_settings` table:

```sql
CREATE TABLE system_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,           -- Setting category
  key TEXT NOT NULL,                 -- Setting key within category
  value TEXT,                        -- Setting value (JSON or plain text)
  value_type TEXT DEFAULT 'string',  -- Data type
  description TEXT,                  -- Human-readable description
  validation_schema TEXT,            -- JSON Schema for validation
  is_public BOOLEAN DEFAULT 0,       -- Publicly readable flag
  updated_at TEXT DEFAULT (datetime('now')),
  updated_by INTEGER,
  UNIQUE(category, key)
);
```

**Indexes:**
- Composite unique index on `(category, key)`
- Index on `category`
- Index on `is_public`

### Setting Categories

Settings are organized into logical categories:

| Category | Purpose | Example Keys |
|----------|---------|--------------|
| auth | Authentication/security | guestAccessEnabled, maxLoginAttempts |
| app | Application settings | siteName, maintenanceMode, dateFormat, timeFormat |
| metadata | Metadata sync config | autoSyncEnabled, syncIntervalMinutes |
| features | Feature flags | enablePlaylists, enableFavorites, enableStatistics |
| game | Game player config | defaultScaleMode, defaultVolume |

### Caching Strategy

**CachedSystemSettingsService Implementation:**

```typescript
class CachedSystemSettingsService {
  private cache: Map<string, CachedValue>
  private ttl: number = 60000 // 60 seconds

  get(category: string, key: string) {
    // Check cache first
    // Return from DB if cache miss
    // Update cache
  }

  set(category: string, key: string, value: any) {
    // Update database
    // Invalidate cache
  }

  invalidate(category?: string) {
    // Clear specific category or entire cache
  }
}
```

**Cache Characteristics:**
- **TTL:** 60 seconds (configurable)
- **Invalidation:** Automatic on update
- **Cleanup:** Every 5 minutes
- **Statistics:** Hit rate, key count, size tracking

### Validation

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

### Migration History

**Migration 003: Create System Settings**
- Created `system_settings` table
- Populated default values for all categories (auth, app, metadata, features, game, storage, rate_limit)
- No data migration needed (auth_settings never existed in the schema)

**Migration 004: Add Validation Schemas**
- Added JSON Schema validation rules to all settings
- Enabled runtime type and constraint validation
- Supports: type, minimum, maximum, minLength, maxLength, enum

**Migration 013: Add Date/Time Format Settings (2026-01-24)**
- Added `app.date_format` setting with 7 format options
  - MM/dd/yyyy, dd/MM/yyyy, yyyy-MM-dd, MMM dd, yyyy, MMMM dd, yyyy, dd MMM yyyy, dd MMMM yyyy
- Added `app.time_format` setting with 4 format options
  - hh:mm a (12-hour), HH:mm (24-hour), hh:mm:ss a (12-hour with seconds), HH:mm:ss (24-hour with seconds)
- Both settings are public (accessible without authentication)
- Validation schemas enforce allowed format values

### API Integration

**AuthService Integration:**
```typescript
class AuthService {
  private systemSettings: SystemSettingsService;

  private getAuthSettings() {
    const authSettings = this.systemSettings.getCategory('auth');
    return {
      guest_access_enabled: authSettings.guestAccessEnabled ? 1 : 0,
      user_registration_enabled: authSettings.userRegistrationEnabled ? 1 : 0,
      max_login_attempts: authSettings.maxLoginAttempts || 5,
      lockout_duration_minutes: authSettings.lockoutDurationMinutes || 15
    };
  }
}
```

**Frontend Usage:**
```typescript
// Fetch auth settings
const { data: authSettings } = useQuery({
  queryKey: ['systemSettings', 'auth'],
  queryFn: () => systemSettingsApi.getCategory('auth')
});

// Update settings
const mutation = useMutation({
  mutationFn: ({ category, settings }) =>
    systemSettingsApi.updateCategory(category, settings),
  onSuccess: () => {
    queryClient.invalidateQueries(['systemSettings']);
  }
});
```

## Configuration

### Environment Variables

No specific environment variables required. Settings are stored in the database.

### Default Values

Default values are set during migration:

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

**Features Defaults:**
- All features enabled by default

**Game Defaults:**
- defaultScaleMode: "showall"
- defaultVolume: 0.7
- enableFlash: true
- enableHtml5: true

## Performance Considerations

### Caching Benefits

With caching enabled:
- **Response time:** <1ms (cache hit) vs ~10ms (database query)
- **Database load:** Reduced by ~85%
- **Concurrent requests:** No contention, reads from cache
- **Cache hit rate:** Typically >90% for frequently accessed settings

### Optimization Strategies

1. **Category-level caching** - Cache entire category for bulk reads
2. **Lazy loading** - Only load settings when needed
3. **Background cleanup** - Periodic cache cleanup prevents memory growth
4. **Smart invalidation** - Only invalidate affected cache entries

## Security

### Access Control

**Permission Requirements:**
- `settings.read` - View settings (admin only)
- `settings.update` - Modify settings (admin only)

**Validation:**
- All inputs validated against schemas
- Type safety enforced
- SQL injection prevented (prepared statements)
- XSS prevention (no HTML in values)

### Audit Trail

All setting changes are logged via `ActivityService`:
```typescript
await activityService.log({
  userId: user.id,
  action: 'settings.update',
  resource: 'system_settings',
  details: {
    category: 'auth',
    changes: { guestAccessEnabled: false }
  }
});
```

## Best Practices

### Adding New Settings

1. **Choose appropriate category** - Or create new category if needed
2. **Define validation schema** - Always include type and constraints
3. **Set sensible default** - Consider both security and usability
4. **Update documentation** - Document the setting and its purpose
5. **Test thoroughly** - Verify validation and caching work correctly

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

1. **Check dependencies** - Ensure no code relies on old value format
2. **Update validation schema** - If changing constraints
3. **Clear cache** - After direct database updates
4. **Test rollback** - Ensure old values still work

### Performance Tips

1. **Batch updates** - Update multiple settings in one request
2. **Cache appropriately** - Don't cache settings that change frequently
3. **Use category queries** - More efficient than individual key queries
4. **Monitor cache hit rate** - Adjust TTL if needed

## Troubleshooting

### Settings not applying immediately
- **Cause:** Cache TTL not expired
- **Solution:** Clear cache or wait for TTL (60 seconds)

### Validation errors on valid values
- **Cause:** Validation schema mismatch
- **Solution:** Check schema in database, update if needed

### Performance degradation
- **Cause:** Cache disabled or not working
- **Solution:** Verify CachedSystemSettingsService is in use

### Missing settings
- **Cause:** Migration didn't run or failed
- **Solution:** Check migration logs, run manually if needed

## Future Enhancements

- **Setting presets** - Save/load configuration snapshots
- **Setting templates** - Pre-configured setting groups
- **Setting history** - Track changes over time
- **Import/Export** - Backup and restore settings
- **Setting dependencies** - Automatic rule enforcement
- **Dynamic validation** - Custom validation functions
- **Setting search** - Search across all settings
- **Bulk operations** - Update multiple categories at once
- **Setting notifications** - Alert admins of changes
- **Role-based defaults** - Different defaults per role

## Related Features

- [Authentication & Authorization](./01-authentication-authorization.md) - Uses auth settings
- [User Management](./06-user-management.md) - Affected by registration settings
- [Activity Logging](./08-activity-logging.md) - Logs setting changes

## API Reference

See [Settings API Reference](../06-api-reference/settings-api.md) for complete API documentation.
