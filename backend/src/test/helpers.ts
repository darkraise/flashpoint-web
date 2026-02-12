import BetterSqlite3 from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

/**
 * Create an in-memory SQLite database with the user.db schema
 * Useful for testing database operations without side effects
 */
export function createTestDatabase(): BetterSqlite3.Database {
  const db = new BetterSqlite3(':memory:');

  // Apply PRAGMA optimizations
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Load and execute schema
  const schemaPath = path.join(__dirname, '../migrations/001_complete_schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    db.exec(schema);
  }

  return db;
}

/**
 * Create a test user with default values
 */
export function createTestUser(
  db: BetterSqlite3.Database,
  overrides: {
    username?: string;
    email?: string;
    password_hash?: string;
    role_id?: number;
    is_active?: boolean;
  } = {}
) {
  const defaults = {
    username: 'testuser',
    email: 'test@example.com',
    password_hash: '$2b$10$abcdefghijklmnopqrstuv', // Fake bcrypt hash
    role_id: 2, // Default to 'user' role
    is_active: 1,
  };

  const userData = { ...defaults, ...overrides };

  const result = db
    .prepare(
      `INSERT INTO users (username, email, password_hash, role_id, is_active)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(
      userData.username,
      userData.email,
      userData.password_hash,
      userData.role_id,
      userData.is_active ? 1 : 0
    );

  return {
    id: result.lastInsertRowid as number,
    ...userData,
  };
}

/**
 * Create a test role with permissions
 */
export function createTestRole(
  db: BetterSqlite3.Database,
  name: string,
  permissions: string[] = []
) {
  const result = db
    .prepare(`INSERT INTO roles (name, description) VALUES (?, ?)`)
    .run(name, `Test role: ${name}`);

  const roleId = result.lastInsertRowid as number;

  // Assign permissions if provided
  for (const permissionName of permissions) {
    // Find or create permission
    let permission = db.prepare('SELECT id FROM permissions WHERE name = ?').get(permissionName) as
      | { id: number }
      | undefined;

    if (!permission) {
      const [resource, action] = permissionName.split('.');
      const permResult = db
        .prepare('INSERT INTO permissions (name, resource, action) VALUES (?, ?, ?)')
        .run(permissionName, resource, action);
      permission = { id: permResult.lastInsertRowid as number };
    }

    // Link role to permission
    db.prepare('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)').run(
      roleId,
      permission.id
    );
  }

  return { id: roleId, name, permissions };
}

/**
 * Get permissions for a role
 */
export function getRolePermissions(db: BetterSqlite3.Database, roleId: number): string[] {
  const permissions = db
    .prepare(
      `SELECT p.name
       FROM permissions p
       JOIN role_permissions rp ON p.id = rp.permission_id
       WHERE rp.role_id = ?`
    )
    .all(roleId) as { name: string }[];

  return permissions.map((p) => p.name);
}

/**
 * Clean up test database
 */
export function cleanupTestDatabase(db: BetterSqlite3.Database): void {
  if (db.open) {
    db.close();
  }
}
