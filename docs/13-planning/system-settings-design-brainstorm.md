# System Settings Storage Design - Brainstorming Session

## Current Implementation

**Table:** `auth_settings`
```sql
CREATE TABLE auth_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),  -- Singleton pattern
  guest_access_enabled BOOLEAN DEFAULT 1,
  user_registration_enabled BOOLEAN DEFAULT 1,
  require_email_verification BOOLEAN DEFAULT 0,
  session_timeout_minutes INTEGER DEFAULT 60,
  max_login_attempts INTEGER DEFAULT 5,
  lockout_duration_minutes INTEGER DEFAULT 15,
  updated_at TEXT,
  updated_by INTEGER
);
```

**Issues with Current Approach:**
- ❌ Adding new settings requires schema migrations
- ❌ Each setting category needs its own table
- ❌ Tight coupling between database schema and application code
- ❌ No flexibility for dynamic settings
- ❌ Difficult to add/remove settings without database changes

---

## Future Settings Categories

Based on the application architecture, we'll likely need:

### 1. Authentication & Security
- Guest access enabled
- User registration enabled
- Email verification required
- Session timeout
- Max login attempts
- Lockout duration
- Password complexity requirements
- 2FA settings

### 2. Application Settings
- Site name / branding
- Maintenance mode
- Default theme mode (light/dark)
- Default primary color
- Terms of service text
- Privacy policy text
- Welcome message

### 3. Metadata Sync Settings
- Auto-sync enabled
- Sync interval (minutes/hours)
- Sync only on startup
- Include tags/developers/publishers in sync
- Metadata source priority

### 4. Game Settings
- Default player scale mode
- Allowed file types
- Max game file size
- Enable Flash content
- Enable HTML5 content
- Default volume level

### 5. Storage & Caching
- Cache size limit (MB)
- Cache cleanup interval
- Temporary file retention (days)
- Log retention (days)
- Database backup interval

### 6. Email Settings (Future)
- SMTP host, port, username, password
- Email from address
- Email templates
- Enable email notifications

### 7. Feature Flags
- Enable playlists
- Enable favorites
- Enable play tracking
- Enable statistics
- Enable user profiles
- Enable game reviews

### 8. Rate Limiting
- API rate limit (requests/minute)
- Download rate limit
- Enable rate limiting per IP/user

---

## Design Approach Options

### Option 1: Key-Value Store (EAV Pattern)

**Schema:**
```sql
CREATE TABLE system_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,           -- e.g., 'auth.user_registration_enabled'
  value TEXT NOT NULL,                -- JSON string or plain value
  data_type TEXT NOT NULL,            -- 'boolean', 'integer', 'string', 'json'
  category TEXT NOT NULL,             -- 'auth', 'app', 'metadata', 'game', etc.
  description TEXT,                   -- Human-readable description
  is_public BOOLEAN DEFAULT 0,        -- Can be read without auth?
  is_editable BOOLEAN DEFAULT 1,      -- Can be changed via UI?
  validation_rules TEXT,              -- JSON schema for validation
  updated_at TEXT DEFAULT (datetime('now')),
  updated_by INTEGER,
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE INDEX idx_settings_key ON system_settings(key);
CREATE INDEX idx_settings_category ON system_settings(category);
```

**Example Data:**
```sql
INSERT INTO system_settings (key, value, data_type, category, description, is_public) VALUES
  ('auth.user_registration_enabled', 'true', 'boolean', 'auth', 'Allow user registration', 1),
  ('auth.session_timeout_minutes', '60', 'integer', 'auth', 'Session timeout in minutes', 0),
  ('app.site_name', 'Flashpoint Web', 'string', 'app', 'Application name', 1),
  ('metadata.auto_sync_enabled', 'false', 'boolean', 'metadata', 'Auto-sync metadata', 0);
```

**Pros:**
- ✅ No schema changes needed to add new settings
- ✅ Extremely flexible
- ✅ Easy to add metadata (description, validation rules)
- ✅ Can query all settings in one category
- ✅ Easy to implement feature flags
- ✅ Can mark settings as public/private, editable/read-only

**Cons:**
- ❌ No compile-time type safety
- ❌ Values stored as strings (type conversion needed)
- ❌ No database-level validation (must be done in code)
- ❌ Queries are less efficient (string comparisons)
- ❌ More complex to ensure uniqueness
- ❌ Harder to enforce referential integrity

**Code Example:**
```typescript
// Service
class SettingsService {
  get(key: string): any {
    const row = db.get('SELECT value, data_type FROM system_settings WHERE key = ?', [key]);
    return this.parseValue(row.value, row.data_type);
  }

  set(key: string, value: any, updatedBy: number): void {
    db.run('UPDATE system_settings SET value = ?, updated_by = ?, updated_at = datetime("now") WHERE key = ?',
      [JSON.stringify(value), updatedBy, key]);
  }

  getCategory(category: string): Record<string, any> {
    const rows = db.all('SELECT key, value, data_type FROM system_settings WHERE category = ?', [category]);
    return rows.reduce((acc, row) => {
      acc[row.key] = this.parseValue(row.value, row.data_type);
      return acc;
    }, {});
  }
}

// Usage
const registrationEnabled = settingsService.get('auth.user_registration_enabled');
const authSettings = settingsService.getCategory('auth');
```

---

### Option 2: JSON Column Approach

**Schema:**
```sql
CREATE TABLE system_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),  -- Singleton
  settings TEXT NOT NULL,                 -- JSON blob containing all settings
  updated_at TEXT DEFAULT (datetime('now')),
  updated_by INTEGER,
  FOREIGN KEY (updated_by) REFERENCES users(id)
);
```

**Example Data:**
```json
{
  "auth": {
    "guestAccessEnabled": true,
    "userRegistrationEnabled": true,
    "requireEmailVerification": false,
    "sessionTimeoutMinutes": 60,
    "maxLoginAttempts": 5,
    "lockoutDurationMinutes": 15
  },
  "app": {
    "siteName": "Flashpoint Web",
    "maintenanceMode": false,
    "defaultTheme": "dark"
  },
  "metadata": {
    "autoSyncEnabled": false,
    "syncIntervalMinutes": 60
  }
}
```

**Pros:**
- ✅ Simple schema (one table, one row)
- ✅ Easy to read/write all settings at once
- ✅ Natural TypeScript interface mapping
- ✅ Can use TypeScript for type safety
- ✅ Fast reads (one query)
- ✅ Easy to backup/restore (just one JSON blob)

**Cons:**
- ❌ Must read entire JSON to get one setting (inefficient)
- ❌ Must write entire JSON to update one setting (concurrency issues)
- ❌ No indexing on individual settings
- ❌ No validation at database level
- ❌ Harder to query specific settings in SQL
- ❌ Size limits (SQLite TEXT max ~2GB, but impractical)
- ❌ Race conditions if multiple updates happen simultaneously

**Code Example:**
```typescript
interface SystemSettings {
  auth: AuthSettings;
  app: AppSettings;
  metadata: MetadataSettings;
  // ... more categories
}

class SettingsService {
  getAll(): SystemSettings {
    const row = db.get('SELECT settings FROM system_settings WHERE id = 1', []);
    return JSON.parse(row.settings);
  }

  get<K extends keyof SystemSettings>(category: K): SystemSettings[K] {
    return this.getAll()[category];
  }

  set<K extends keyof SystemSettings>(category: K, value: SystemSettings[K], updatedBy: number): void {
    const current = this.getAll();
    current[category] = value;
    db.run('UPDATE system_settings SET settings = ?, updated_by = ?, updated_at = datetime("now") WHERE id = 1',
      [JSON.stringify(current), updatedBy]);
  }
}
```

---

### Option 3: Categorized Settings Tables (Current + Expansion)

**Schema:**
```sql
-- Keep current auth_settings table
CREATE TABLE auth_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  guest_access_enabled BOOLEAN DEFAULT 1,
  user_registration_enabled BOOLEAN DEFAULT 1,
  -- ... other auth settings
  updated_at TEXT,
  updated_by INTEGER
);

-- Add new tables for each category
CREATE TABLE app_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  site_name TEXT DEFAULT 'Flashpoint Web',
  maintenance_mode BOOLEAN DEFAULT 0,
  default_theme TEXT DEFAULT 'dark',
  updated_at TEXT,
  updated_by INTEGER
);

CREATE TABLE metadata_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  auto_sync_enabled BOOLEAN DEFAULT 0,
  sync_interval_minutes INTEGER DEFAULT 60,
  updated_at TEXT,
  updated_by INTEGER
);

-- ... more tables for each category
```

**Pros:**
- ✅ Strong typing at database level
- ✅ Each category is isolated
- ✅ Easy to understand and maintain
- ✅ Can add constraints and validations
- ✅ Good query performance
- ✅ Clear separation of concerns

**Cons:**
- ❌ Requires migration for every new setting
- ❌ Many tables to manage
- ❌ Duplicate code (updated_at, updated_by in every table)
- ❌ Hard to get all settings in one query
- ❌ Rigid structure

---

### Option 4: Hybrid Approach (Recommended)

**Combine structured tables for critical settings + flexible key-value for others**

**Schema:**
```sql
-- Critical, frequently-accessed settings with strong typing
CREATE TABLE auth_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  guest_access_enabled BOOLEAN DEFAULT 1,
  user_registration_enabled BOOLEAN DEFAULT 1,
  require_email_verification BOOLEAN DEFAULT 0,
  session_timeout_minutes INTEGER DEFAULT 60,
  max_login_attempts INTEGER DEFAULT 5,
  lockout_duration_minutes INTEGER DEFAULT 15,
  updated_at TEXT,
  updated_by INTEGER
);

-- Flexible key-value for less critical or dynamic settings
CREATE TABLE system_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  data_type TEXT NOT NULL CHECK (data_type IN ('boolean', 'integer', 'string', 'json')),
  category TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT 0,
  default_value TEXT,
  updated_at TEXT DEFAULT (datetime('now')),
  updated_by INTEGER,
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE INDEX idx_settings_key ON system_settings(key);
CREATE INDEX idx_settings_category ON system_settings(category);
```

**Data:**
```sql
-- Critical auth settings stay in auth_settings table

-- Less critical settings go to key-value store
INSERT INTO system_settings (key, value, data_type, category, description, is_public, default_value) VALUES
  ('app.site_name', 'Flashpoint Web', 'string', 'app', 'Application name', 1, 'Flashpoint Web'),
  ('app.maintenance_mode', 'false', 'boolean', 'app', 'Maintenance mode', 1, 'false'),
  ('metadata.auto_sync_enabled', 'false', 'boolean', 'metadata', 'Auto-sync metadata', 0, 'false'),
  ('features.enable_playlists', 'true', 'boolean', 'features', 'Enable playlists', 0, 'true'),
  ('features.enable_statistics', 'true', 'boolean', 'features', 'Enable statistics', 0, 'true');
```

**Pros:**
- ✅ Best of both worlds
- ✅ Critical settings have strong typing
- ✅ Flexible for new/experimental settings
- ✅ Can migrate settings from key-value to structured as they mature
- ✅ Good performance for both critical and dynamic settings
- ✅ Easy to add feature flags without migrations

**Cons:**
- ❌ More complex to understand
- ❌ Two different patterns to maintain
- ❌ Decision needed: which settings go where?

---

### Option 5: Settings Registry Pattern

**TypeScript-first approach with database as storage**

**Schema:**
```sql
CREATE TABLE settings_registry (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  namespace TEXT NOT NULL,            -- 'auth', 'app', 'metadata'
  key TEXT NOT NULL,                  -- 'user_registration_enabled'
  value TEXT NOT NULL,                -- JSON-encoded value
  schema TEXT,                        -- JSON schema for validation
  metadata TEXT,                      -- JSON metadata (description, ui hints, etc.)
  updated_at TEXT DEFAULT (datetime('now')),
  updated_by INTEGER,
  UNIQUE(namespace, key),
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE INDEX idx_settings_namespace ON settings_registry(namespace);
```

**TypeScript Registry:**
```typescript
// Define settings in code with full type safety
const settingsRegistry = {
  auth: {
    userRegistrationEnabled: {
      type: 'boolean' as const,
      default: true,
      description: 'Allow user registration',
      public: true,
      validation: { type: 'boolean' }
    },
    sessionTimeoutMinutes: {
      type: 'integer' as const,
      default: 60,
      description: 'Session timeout in minutes',
      public: false,
      validation: { type: 'integer', min: 5, max: 1440 }
    }
  },
  app: {
    siteName: {
      type: 'string' as const,
      default: 'Flashpoint Web',
      description: 'Application name',
      public: true,
      validation: { type: 'string', minLength: 1, maxLength: 100 }
    }
  }
} as const;

type SettingsRegistry = typeof settingsRegistry;
type SettingValue<N extends keyof SettingsRegistry, K extends keyof SettingsRegistry[N]> =
  SettingsRegistry[N][K]['default'];
```

**Service:**
```typescript
class SettingsService {
  get<N extends keyof SettingsRegistry, K extends keyof SettingsRegistry[N]>(
    namespace: N,
    key: K
  ): SettingValue<N, K> {
    const definition = settingsRegistry[namespace][key];
    const row = db.get(
      'SELECT value FROM settings_registry WHERE namespace = ? AND key = ?',
      [namespace, String(key)]
    );

    if (!row) {
      return definition.default;
    }

    return JSON.parse(row.value);
  }

  set<N extends keyof SettingsRegistry, K extends keyof SettingsRegistry[N]>(
    namespace: N,
    key: K,
    value: SettingValue<N, K>,
    updatedBy: number
  ): void {
    const definition = settingsRegistry[namespace][key];

    // Validate against schema
    this.validate(value, definition.validation);

    db.run(
      `INSERT INTO settings_registry (namespace, key, value, schema, metadata, updated_by)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(namespace, key) DO UPDATE SET
         value = excluded.value,
         updated_by = excluded.updated_by,
         updated_at = datetime('now')`,
      [
        namespace,
        String(key),
        JSON.stringify(value),
        JSON.stringify(definition.validation),
        JSON.stringify({ description: definition.description, public: definition.public }),
        updatedBy
      ]
    );
  }
}

// Usage with full type safety
const enabled = settingsService.get('auth', 'userRegistrationEnabled'); // boolean
const timeout = settingsService.get('auth', 'sessionTimeoutMinutes');   // number
settingsService.set('auth', 'userRegistrationEnabled', true, userId);
// settingsService.set('auth', 'userRegistrationEnabled', 'yes', userId); // TypeScript error!
```

**Pros:**
- ✅ Full TypeScript type safety
- ✅ Settings defined in one place (TypeScript file)
- ✅ Compile-time validation
- ✅ Runtime validation with JSON schemas
- ✅ Easy to add new settings (just edit TypeScript)
- ✅ Database is just storage, not source of truth
- ✅ Can auto-generate admin UI from registry
- ✅ Self-documenting (description in code)

**Cons:**
- ❌ More complex implementation
- ❌ Requires JSON schema library
- ❌ Defaults are in code, not database
- ❌ Must sync registry changes with database

---

## Comparison Matrix

| Feature | Key-Value | JSON Column | Categorized Tables | Hybrid | Registry Pattern |
|---------|-----------|-------------|-------------------|--------|------------------|
| **Type Safety** | ❌ Runtime | ⚠️ TypeScript | ✅ Database | ⚠️ Mixed | ✅ TypeScript |
| **Flexibility** | ✅ High | ✅ High | ❌ Low | ⚠️ Medium | ✅ High |
| **Schema Changes** | ✅ None | ✅ None | ❌ Required | ⚠️ Partial | ✅ None |
| **Query Performance** | ⚠️ Good | ⚠️ Good | ✅ Excellent | ✅ Excellent | ⚠️ Good |
| **Validation** | ⚠️ Code | ⚠️ Code | ✅ Database | ⚠️ Mixed | ✅ Code |
| **Complexity** | ⚠️ Medium | ✅ Simple | ⚠️ Medium | ❌ High | ❌ High |
| **Scalability** | ✅ High | ⚠️ Medium | ✅ High | ✅ High | ✅ High |
| **Maintainability** | ⚠️ Good | ✅ Excellent | ⚠️ Fair | ⚠️ Good | ✅ Excellent |

---

## Recommendation

### For Flashpoint Web: **Hybrid Approach**

**Rationale:**
1. **Auth settings are critical** - Keep them in a structured table with strong typing
2. **Many settings are coming** - Need flexibility for rapid addition
3. **SQLite database** - No JSONB support like PostgreSQL
4. **Type safety matters** - Use TypeScript interfaces for both approaches
5. **Migration path** - Can promote settings from key-value to structured tables as they mature

### Implementation Strategy:

```sql
-- Phase 1: Keep existing auth_settings table (already in production)
-- No changes needed to auth_settings

-- Phase 2: Add system_settings table for flexible settings
CREATE TABLE system_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  data_type TEXT NOT NULL CHECK (data_type IN ('boolean', 'integer', 'string', 'json', 'float')),
  category TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT 0,
  default_value TEXT,
  validation_schema TEXT,  -- JSON schema for validation
  updated_at TEXT DEFAULT (datetime('now')),
  updated_by INTEGER,
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE INDEX idx_settings_key ON system_settings(key);
CREATE INDEX idx_settings_category ON system_settings(category);

-- Phase 3: Seed initial settings
INSERT INTO system_settings (key, value, data_type, category, description, is_public, default_value) VALUES
  ('app.site_name', 'Flashpoint Web', 'string', 'app', 'Application name', 1, 'Flashpoint Web'),
  ('app.maintenance_mode', 'false', 'boolean', 'app', 'Maintenance mode enabled', 1, 'false'),
  ('app.default_theme', 'dark', 'string', 'app', 'Default theme mode', 1, 'dark'),
  ('metadata.auto_sync_enabled', 'false', 'boolean', 'metadata', 'Automatically sync metadata', 0, 'false'),
  ('metadata.sync_interval_minutes', '60', 'integer', 'metadata', 'Metadata sync interval', 0, '60'),
  ('features.enable_playlists', 'true', 'boolean', 'features', 'Enable playlist feature', 0, 'true'),
  ('features.enable_statistics', 'true', 'boolean', 'features', 'Enable statistics tracking', 0, 'true'),
  ('features.enable_favorites', 'true', 'boolean', 'features', 'Enable favorites feature', 0, 'true');
```

**Unified Settings Service:**
```typescript
// Unified settings service that handles both structured and key-value
class SettingsService {
  // Auth settings (structured table)
  getAuthSettings(): AuthSettings {
    return authSettingsService.getSettings();
  }

  updateAuthSettings(data: Partial<AuthSettings>, updatedBy: number): AuthSettings {
    return authSettingsService.updateSettings(data, updatedBy);
  }

  // System settings (key-value)
  get(key: string): any {
    const row = db.get('SELECT value, data_type, default_value FROM system_settings WHERE key = ?', [key]);
    if (!row) return null;
    return this.parseValue(row.value || row.default_value, row.data_type);
  }

  set(key: string, value: any, updatedBy: number): void {
    db.run(
      `UPDATE system_settings
       SET value = ?, updated_by = ?, updated_at = datetime('now')
       WHERE key = ?`,
      [this.stringifyValue(value), updatedBy, key]
    );
  }

  getCategory(category: string): Record<string, any> {
    const rows = db.all('SELECT key, value, data_type FROM system_settings WHERE category = ?', [category]);
    return rows.reduce((acc, row) => {
      const shortKey = row.key.replace(`${category}.`, '');
      acc[shortKey] = this.parseValue(row.value, row.data_type);
      return acc;
    }, {});
  }

  // Get all settings (combined)
  getAllSettings(): AllSettings {
    return {
      auth: this.getAuthSettings(),
      app: this.getCategory('app'),
      metadata: this.getCategory('metadata'),
      features: this.getCategory('features')
    };
  }
}
```

**Benefits of This Approach:**
- ✅ No breaking changes to existing auth settings
- ✅ Flexible for future additions
- ✅ Can gradually migrate settings between approaches
- ✅ Clear separation: critical (structured) vs dynamic (key-value)
- ✅ Easy to implement feature flags
- ✅ Supports metadata (descriptions, validation, defaults)

---

## Alternative Consideration: Registry Pattern

If type safety and developer experience are priorities, consider the **Settings Registry Pattern** as it provides:
- Compile-time type checking
- Auto-generated API documentation
- Self-describing settings
- Single source of truth in code

However, it's more complex to implement and may be overkill for this application.

---

## Migration Path from Current to Hybrid

1. ✅ Keep `auth_settings` table as-is (no changes)
2. ✅ Create `system_settings` table in new migration
3. ✅ Create `SystemSettingsService` for key-value operations
4. ✅ Update API routes to support both `/settings/auth` and `/settings/:category`
5. ✅ Update frontend to fetch settings from appropriate endpoints
6. ✅ Add admin UI for managing system settings
7. ⚠️ Future: Consider migrating some auth settings to system_settings if they become less critical

---

## Decision Criteria

Choose based on:

1. **If type safety is critical**: Categorized Tables or Registry Pattern
2. **If flexibility is critical**: Key-Value Store or Hybrid
3. **If simplicity is critical**: JSON Column
4. **If balanced approach is needed**: **Hybrid (Recommended)**
5. **If TypeScript ecosystem is strong**: Registry Pattern

For Flashpoint Web, **Hybrid Approach** offers the best balance of stability, flexibility, and maintainability.
