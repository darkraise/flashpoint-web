# UserDatabaseService

`UserDatabaseService` manages the connection to the user database (user.db). It
provides a singleton interface for accessing user data, authentication, roles,
permissions, and play tracking.

## Location

`backend/src/services/UserDatabaseService.ts`

## Overview

The UserDatabaseService connects to the application-specific SQLite database for
storing user accounts, sessions, and application data. Unlike DatabaseService
(read-only Flashpoint data), this service has full read/write access.

## Key Features

### 1. Database Initialization

Creates database file and schema on first run:

```typescript
static async initialize(): Promise<void> {
  // Ensure directory exists
  const dbDir = path.dirname(config.userDbPath);
  if (!fs.existsSync(dbDir) && dbDir !== '.') {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // Open database connection
  this.db = new BetterSqlite3(config.userDbPath);

  // Enable foreign keys
  this.db.pragma('foreign_keys = ON');

  // Create tables from schema file
  await this.createTables();

  // Run migrations
  await this.runMigrations();

  // Create default admin user
  await this.createDefaultAdmin();
}
```

### 2. Schema Management

Loads schema from SQL file:

```typescript
private static async createTables(): Promise<void> {
  const schemaPath = path.join(__dirname, '../migrations/001_user-schema.sql');
  const schemaSQL = fs.readFileSync(schemaPath, 'utf-8');
  this.db!.exec(schemaSQL);
  logger.info('[UserDB] Database schema created successfully');
}
```

### 3. Migration System

Runs database migrations on startup with transactional safety:

```typescript
private static async runMigrations(): Promise<void> {
  // Check for user_settings table
  const tables = this.db!.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table' AND name='user_settings'
  `).all();

  if (tables.length === 0) {
    logger.info('[UserDB] Running migration: 002_create-user-settings');
    const migrationPath = path.join(__dirname, '../migrations/002_create-user-settings.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // IMPORTANT: Wrap in transaction for atomicity
    const transaction = this.db!.transaction(() => {
      this.db!.exec(migrationSQL);
      this.recordMigration('002_create-user-settings', migrationSQL);
    });

    transaction();  // Execute atomically
  }

  // Check for system_settings table
  const tables = this.db!.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table' AND name='system_settings'
  `).all();

  if (tables.length === 0) {
    // Run migration to create system_settings table
    const migrationPath = path.join(__dirname, '../migrations/003_create-system-settings.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // IMPORTANT: Wrap in transaction for atomicity
    const transaction = this.db!.transaction(() => {
      this.db!.exec(migrationSQL);
      this.recordMigration('003_create-system-settings', migrationSQL);
    });

    transaction();  // Execute atomically
  }
}
```

**Transaction Safety for Migrations:**

Each migration execution is wrapped in a better-sqlite3 `db.transaction()` that
includes:

1. The SQL execution (`db.exec(sql)`)
2. The migration registry insert (`recordMigration()`)

If either part fails, the entire transaction rolls back, preventing partial
migration states where:

- SQL executed but not recorded in registry (orphaned changes)
- Migration recorded but SQL never executed (wrong schema state)
- Database left in inconsistent half-migrated state

This ensures migrations are all-or-nothing: either the migration completely
succeeds or completely fails with no intermediate states.



### 4. Default Admin User

Creates admin account if database is empty:

```typescript
private static async createDefaultAdmin(): Promise<void> {
  const userCount = this.get('SELECT COUNT(*) as count FROM users', []);

  if (userCount?.count === 0) {
    const defaultUsername = 'admin';
    const defaultPassword = 'admin123';
    const defaultEmail = 'admin@flashpoint.local';

    const passwordHash = await bcrypt.hash(defaultPassword, config.bcryptSaltRounds);

    this.run(
      'INSERT INTO users (username, email, password_hash, role_id) VALUES (?, ?, ?, ?)',
      [defaultUsername, defaultEmail, passwordHash, 1]
    );

    logger.warn('╔═══════════════════════════════════════════════════════════════╗');
    logger.warn('║  DEFAULT ADMIN USER CREATED                                   ║');
    logger.warn('║  Username: admin                                              ║');
    logger.warn('║  Password: admin123                                           ║');
    logger.warn('║                                                               ║');
    logger.warn('║  ⚠️  SECURITY WARNING: CHANGE THIS PASSWORD IMMEDIATELY! ⚠️   ║');
    logger.warn('╚═══════════════════════════════════════════════════════════════╝');
  }
}
```

## Public API

### Static Methods

#### `initialize(): Promise<void>`

Initialize database, run migrations, and create default admin.

```typescript
await UserDatabaseService.initialize();
```

**Called by**: `server.ts` on startup

---

#### `getDatabase(): BetterSqlite3.Database`

Get raw database instance.

```typescript
const db = UserDatabaseService.getDatabase();
```

**Returns**: BetterSqlite3.Database instance

**Throws**: `Error` if database not initialized

---

#### `get(sql: string, params: any[]): any | null`

Execute query and return first row.

```typescript
const user = UserDatabaseService.get('SELECT * FROM users WHERE username = ?', [
  'admin',
]);
```

**Returns**: First result row or null

---

#### `all(sql: string, params: any[]): any[]`

Execute query and return all rows.

```typescript
const users = UserDatabaseService.all(
  'SELECT id, username, email FROM users WHERE is_active = ?',
  [1]
);
```

**Returns**: Array of result rows

---

#### `exec(sql: string, params: any[]): any[]`

Alias for `all()`.

---

#### `run(sql: string, params: any[]): BetterSqlite3.RunResult`

Execute INSERT, UPDATE, or DELETE query.

```typescript
const result = UserDatabaseService.run(
  'INSERT INTO users (username, email, password_hash, role_id) VALUES (?, ?, ?, ?)',
  ['newuser', 'user@example.com', passwordHash, 2]
);

const userId = result.lastInsertRowid;
```

**Returns**: RunResult object with:

- `changes`: Number of rows affected
- `lastInsertRowid`: ID of inserted row (for INSERT)

---

#### `isConnected(): boolean`

Check if database is connected.

```typescript
if (UserDatabaseService.isConnected()) {
  // Safe to query
}
```

---

#### `close(): void`

Close database connection.

```typescript
UserDatabaseService.close();
```

## Usage Examples

### User Queries

```typescript
// Get user by username
const user = UserDatabaseService.get(
  `SELECT u.*, r.name as role_name
   FROM users u
   JOIN roles r ON u.role_id = r.id
   WHERE u.username = ?`,
  ['admin']
);

// Get all active users
const users = UserDatabaseService.all(
  'SELECT * FROM users WHERE is_active = 1 ORDER BY created_at DESC',
  []
);

// Count users by role
const roleCounts = UserDatabaseService.all(
  `SELECT r.name, COUNT(u.id) as count
   FROM roles r
   LEFT JOIN users u ON u.role_id = r.id
   GROUP BY r.id`,
  []
);
```

### Authentication

```typescript
// Record login attempt
UserDatabaseService.run(
  'INSERT INTO login_attempts (username, ip_address, success) VALUES (?, ?, ?)',
  ['admin', '192.168.1.1', 1]
);

// Store refresh token
UserDatabaseService.run(
  `INSERT INTO refresh_tokens (user_id, token, expires_at)
   VALUES (?, ?, datetime('now', '+30 days'))`,
  [userId, refreshToken]
);

// Check failed login attempts
const attempts = UserDatabaseService.get(
  `SELECT COUNT(*) as count FROM login_attempts
   WHERE username = ? AND success = 0
   AND attempted_at > datetime('now', '-15 minutes')`,
  ['admin']
);
```

### Role and Permission Management

```typescript
// Get user permissions
const permissions = UserDatabaseService.all(
  `SELECT DISTINCT p.name
   FROM permissions p
   JOIN role_permissions rp ON p.id = rp.permission_id
   JOIN users u ON u.role_id = rp.role_id
   WHERE u.id = ?`,
  [userId]
);

// Get role with permissions
const role = UserDatabaseService.get('SELECT * FROM roles WHERE id = ?', [
  roleId,
]);

const rolePermissions = UserDatabaseService.all(
  `SELECT p.* FROM permissions p
   JOIN role_permissions rp ON p.id = rp.permission_id
   WHERE rp.role_id = ?`,
  [roleId]
);
```

### Play Tracking

```typescript
// Start play session
UserDatabaseService.run(
  `INSERT INTO user_game_plays (user_id, game_id, game_title, session_id, started_at)
   VALUES (?, ?, ?, ?, datetime('now'))`,
  [userId, gameId, gameTitle, sessionId]
);

// End play session
UserDatabaseService.run(
  `UPDATE user_game_plays
   SET ended_at = datetime('now'), duration_seconds = ?
   WHERE session_id = ?`,
  [durationSeconds, sessionId]
);

// Get user stats
const stats = UserDatabaseService.get(
  'SELECT * FROM user_stats WHERE user_id = ?',
  [userId]
);

// Get top games for user
const topGames = UserDatabaseService.all(
  `SELECT * FROM user_game_stats
   WHERE user_id = ?
   ORDER BY total_playtime_seconds DESC
   LIMIT 10`,
  [userId]
);
```

### Activity Logging

```typescript
// Log activity
UserDatabaseService.run(
  `INSERT INTO activity_logs
   (user_id, username, action, resource, resource_id, details, ip_address)
   VALUES (?, ?, ?, ?, ?, ?, ?)`,
  [
    userId,
    username,
    'create',
    'users',
    newUserId,
    JSON.stringify(details),
    ipAddress,
  ]
);

// Get recent activity
const activities = UserDatabaseService.all(
  `SELECT * FROM activity_logs
   WHERE user_id = ?
   ORDER BY created_at DESC
   LIMIT 50`,
  [userId]
);

// Clean up old logs
UserDatabaseService.run(
  `DELETE FROM activity_logs
   WHERE created_at < datetime('now', '-90 days')`
);
```

## Database Schema

See [database/schema.md](../database/schema.md) for complete schema
documentation.

Main tables:

- `users` - User accounts
- `roles` - User roles (admin, user, guest)
- `permissions` - Available permissions
- `role_permissions` - Role-permission mapping
- `refresh_tokens` - JWT refresh tokens
- `login_attempts` - Failed login tracking
- `system_settings` - Global system-wide configuration
- `user_settings` - Per-user settings (theme, preferences)
- `user_game_plays` - Individual play sessions
- `user_game_stats` - Aggregated play statistics per game
- `user_stats` - Overall user statistics
- `activity_logs` - User activity audit trail

## Foreign Key Constraints

Foreign keys are enabled on initialization:

```typescript
this.db.pragma('foreign_keys = ON');
```

This ensures referential integrity:

```sql
-- Cascade delete: Delete user's sessions when user is deleted
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE

-- Restrict delete: Prevent deleting role if users exist with that role
FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT

-- Set null: Set user_id to NULL when user is deleted
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
```

## Transactions

Execute multiple operations atomically:

```typescript
const db = UserDatabaseService.getDatabase();

const createUser = db.transaction((username, email, passwordHash, roleId) => {
  // Create user
  const userResult = db
    .prepare(
      'INSERT INTO users (username, email, password_hash, role_id) VALUES (?, ?, ?, ?)'
    )
    .run(username, email, passwordHash, roleId);

  const userId = userResult.lastInsertRowid;

  // Initialize user stats
  db.prepare('INSERT INTO user_stats (user_id) VALUES (?)').run(userId);

  return userId;
});

// Execute transaction
const userId = createUser('newuser', 'user@example.com', hash, 2);
```

**Benefits**:

- Atomic: All operations succeed or all fail
- Consistent: Database remains in valid state
- Fast: Single disk write for all operations

## Error Handling

Errors are logged with query context:

```typescript
static run(sql: string, params: any[] = []): BetterSqlite3.RunResult {
  const db = this.getDatabase();
  try {
    const stmt = db.prepare(sql);
    return stmt.run(params);
  } catch (error) {
    logger.error('[UserDB] Run error:', { sql, params });
    logger.error('[UserDB] Error details:', error);
    if (error instanceof Error) {
      logger.error('[UserDB] Error stack:', error.stack);
    }
    throw error;
  }
}
```

## Migration System

Migrations run automatically on startup.

### Migration File Naming

Migrations are numbered sequentially:

```
001_user-schema.sql          # Initial schema
002_create-user-settings.sql # Add user_settings table
003_drop-legacy-theme-columns.sql # Remove old columns
```

### Adding a Migration

1. Create SQL file in `src/migrations/` with next number
2. Add migration check in `runMigrations()`:

```typescript
// Check if migration is needed
const tables = this.db!.prepare(
  `
  SELECT name FROM sqlite_master
  WHERE type='table' AND name='new_table'
`
).all();

if (tables.length === 0) {
  logger.info('[UserDB] Running migration: 005_add-new-feature');
  const migrationPath = path.join(
    __dirname,
    '../migrations/005_add-new-feature.sql'
  );
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
  this.db!.exec(migrationSQL);
  logger.info('[UserDB] Migration completed: 005_add-new-feature');
}
```

3. Test on clean database:

```bash
rm user.db
npm run dev
# Check logs for migration messages
```

### Migration Best Practices

- **Idempotent**: Use `IF NOT EXISTS`, `IF EXISTS`
- **Backward compatible**: Don't break existing code
- **Tested**: Test on clean database and existing data
- **Documented**: Add comments explaining purpose
- **Atomic**: Use transactions for multi-step migrations

## Performance Considerations

### Connection Pooling

Not needed - SQLite is single-threaded:

- Single connection shared across requests
- Synchronous operations are fast
- No connection overhead

### Query Optimization

- Use indexes on foreign keys and frequently queried columns
- Prepared statements are cached automatically
- Use LIMIT for potentially large result sets

### Index Usage

All foreign keys and common query columns are indexed:

```sql
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
```

## Troubleshooting

### Database Locked

**Cause**: Another process has write lock

**Solution**:

- Ensure only one backend instance
- Check for abandoned connections
- Use shorter transactions

### Foreign Key Violation

**Cause**: Attempting to insert/update with invalid foreign key

**Solution**:

- Verify referenced record exists
- Check ON DELETE CASCADE/RESTRICT constraints
- Ensure foreign keys are enabled

### Migration Failure

**Cause**: Migration SQL has error

**Solution**:

- Check migration SQL syntax
- Test migration file in SQLite CLI
- Review error message in logs

## Integration with Services

### AuthService

```typescript
const user = UserDatabaseService.get('SELECT * FROM users WHERE username = ?', [
  username,
]);

const passwordHash = await bcrypt.hash(password, config.bcryptSaltRounds);

UserDatabaseService.run(
  'INSERT INTO users (username, email, password_hash, role_id) VALUES (?, ?, ?, ?)',
  [username, email, passwordHash, roleId]
);
```

### UserService

```typescript
async getUsers(page: number, limit: number) {
  const offset = (page - 1) * limit;

  const users = UserDatabaseService.all(
    'SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [limit, offset]
  );

  return users;
}
```

### PlayTrackingService

```typescript
UserDatabaseService.run(
  `INSERT INTO user_game_plays (user_id, game_id, game_title, session_id)
   VALUES (?, ?, ?, ?)`,
  [userId, gameId, gameTitle, sessionId]
);
```

## Best Practices

1. **Use parameterized queries** - Never concatenate SQL strings
2. **Enable foreign keys** - Ensures referential integrity
3. **Use transactions** - For multi-step operations
4. **Index query columns** - For performance
5. **Clean up old data** - Activity logs, login attempts
6. **Validate input** - Before inserting/updating
7. **Handle errors** - Database operations can fail

## Related Documentation

- [DatabaseService](./database-service.md) - Flashpoint database
- [Database Schema](../database/schema.md) - Complete schema
