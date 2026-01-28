import BetterSqlite3 from 'better-sqlite3';
import { config } from '../config';
import { logger } from '../utils/logger';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

/**
 * User Database Service - Singleton for user.db
 * Mirrors the pattern of DatabaseService.ts for Flashpoint database
 */
export class UserDatabaseService {
  private static db: BetterSqlite3.Database | null = null;

  /**
   * Initialize user database connection and schema
   */
  static async initialize(): Promise<void> {
    try {
      // Ensure directory exists
      const dbDir = path.dirname(config.userDbPath);
      if (!fs.existsSync(dbDir) && dbDir !== '.') {
        fs.mkdirSync(dbDir, { recursive: true });
        logger.info(`[UserDB] Created directory: ${dbDir}`);
      }

      // Open database connection
      this.db = new BetterSqlite3(config.userDbPath);
      logger.info(`[UserDB] Opened database at: ${config.userDbPath}`);

      // Enable foreign keys
      this.db.pragma('foreign_keys = ON');

      // Bootstrap migration registry
      await this.bootstrapMigrationRegistry();

      // Run migrations
      await this.runMigrations();

      // Check if initial setup is needed (first user becomes admin)
      this.needsInitialSetup();

      logger.info('[UserDB] User database initialized successfully');
    } catch (error) {
      logger.error('[UserDB] Failed to initialize user database:', error);
      throw error;
    }
  }

  /**
   * Bootstrap migration registry table
   * Creates migrations table if it doesn't exist and detects existing database state
   */
  private static async bootstrapMigrationRegistry(): Promise<void> {
    try {
      // Check if migrations table exists
      const hasMigrationsTable = this.db!.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='migrations'"
      ).get();

      if (!hasMigrationsTable) {
        logger.info('[UserDB] Bootstrapping migration registry...');

        // Create migrations table
        const bootstrapPath = path.join(__dirname, '../migrations/bootstrap.sql');
        if (fs.existsSync(bootstrapPath)) {
          const bootstrapSQL = fs.readFileSync(bootstrapPath, 'utf-8');
          this.db!.exec(bootstrapSQL);
          logger.info('[UserDB] Migration registry created');
        } else {
          throw new Error(`Bootstrap file not found: ${bootstrapPath}`);
        }

        // Detect existing migrations in legacy databases
        await this.detectExistingMigrations();
      }
    } catch (error) {
      logger.error('[UserDB] Failed to bootstrap migration registry:', error);
      throw error;
    }
  }

  /**
   * Detect and mark existing migrations for backward compatibility
   * This method checks for database features and marks corresponding migrations as applied
   */
  private static async detectExistingMigrations(): Promise<void> {
    try {
      // Check if any tables exist (indicates existing database)
      const tables = this.db!.prepare(
        "SELECT name FROM sqlite_master WHERE type='table'"
      ).all() as { name: string }[];

      if (tables.length === 0) {
        // New database, no detection needed
        logger.info('[UserDB] New database detected, no legacy migrations to detect');
        return;
      }

      logger.info('[UserDB] Existing database detected, detecting applied migrations...');

      // Helper to mark migration as applied
      const markApplied = (name: string, description: string) => {
        this.db!.prepare(
          'INSERT OR IGNORE INTO migrations (name, applied_at, description) VALUES (?, ?, ?)'
        ).run(name, new Date().toISOString(), description);
        logger.info(`[UserDB] Marked migration as applied: ${name}`);
      };

      // Detect 001_initialize_schema (check for users table)
      if (tables.some(t => t.name === 'users')) {
        markApplied('001_initialize_schema', 'Detected existing schema');
      }

      // Detect 002_seed_default_data (check for roles)
      const hasRoles = this.db!.prepare('SELECT COUNT(*) as count FROM roles').get() as { count: number };
      if (hasRoles && hasRoles.count > 0) {
        markApplied('002_seed_default_data', 'Detected existing seed data');
      }

      logger.info('[UserDB] Legacy migration detection completed');
    } catch (error) {
      logger.error('[UserDB] Failed to detect existing migrations:', error);
      throw error;
    }
  }

  /**
   * Compute SHA-256 checksum of SQL content
   */
  private static computeChecksum(sql: string): string {
    return crypto.createHash('sha256').update(sql).digest('hex');
  }

  /**
   * Run database migrations using registry-based approach
   * Scans migrations directory and runs any migrations not yet applied
   */
  private static async runMigrations(): Promise<void> {
    try {
      const migrationDir = path.join(__dirname, '../migrations');

      // Get all migration files (*.sql files with numeric prefix)
      const files = fs.readdirSync(migrationDir)
        .filter(f => f.endsWith('.sql') && /^\d{3}_/.test(f))
        .sort(); // Alphabetical sort ensures correct order (001, 002, etc.)

      logger.info(`[UserDB] Found ${files.length} migration file(s)`);

      for (const file of files) {
        const name = path.basename(file, '.sql');
        const migrationPath = path.join(migrationDir, file);

        // Check if migration has already been applied
        const applied = this.db!.prepare(
          'SELECT 1 FROM migrations WHERE name = ?'
        ).get(name);

        if (!applied) {
          logger.info(`[UserDB] Running migration: ${name}`);

          // Read migration SQL
          const sql = fs.readFileSync(migrationPath, 'utf-8');
          const checksum = this.computeChecksum(sql);
          const start = Date.now();

          // Execute migration
          this.db!.exec(sql);

          // Record migration in registry
          const executionTime = Date.now() - start;
          this.db!.prepare(
            'INSERT INTO migrations (name, applied_at, checksum, execution_time_ms) VALUES (?, ?, ?, ?)'
          ).run(name, new Date().toISOString(), checksum, executionTime);

          logger.info(`[UserDB] Migration completed: ${name} (${executionTime}ms)`);
        } else {
          logger.debug(`[UserDB] Migration already applied: ${name}`);
        }
      }

      logger.info('[UserDB] All migrations completed successfully');
    } catch (error) {
      logger.error('[UserDB] Failed to run migrations:', error);
      throw error;
    }
  }

  /**
   * Check if the system needs initial setup (no users exist)
   */
  static needsInitialSetup(): boolean {
    try {
      const userCount = this.get('SELECT COUNT(*) as count FROM users', []);
      const needsSetup = userCount?.count === 0;

      if (needsSetup) {
        logger.info('╔═══════════════════════════════════════════════════════════════╗');
        logger.info('║  INITIAL SETUP REQUIRED                                       ║');
        logger.info('║  No users found in database.                                  ║');
        logger.info('║  The first registered user will become an administrator.      ║');
        logger.info('╚═══════════════════════════════════════════════════════════════╝');
      } else {
        logger.debug(`[UserDB] Found ${userCount.count} existing user(s)`);
      }

      return needsSetup;
    } catch (error) {
      logger.error('[UserDB] Failed to check initial setup status:', error);
      return false;
    }
  }

  /**
   * Get the database instance
   */
  static getDatabase(): BetterSqlite3.Database {
    if (!this.db) {
      throw new Error('[UserDB] Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  /**
   * Execute a query and return all rows
   */
  static exec<T = any>(sql: string, params: any[] = []): T[] {
    const db = this.getDatabase();
    try {
      const stmt = db.prepare(sql);
      return stmt.all(params) as T[];
    } catch (error) {
      logger.error('[UserDB] Query error:', { sql, params, error });
      throw error;
    }
  }

  /**
   * Execute a query and return first row
   */
  static get<T = any>(sql: string, params: any[] = []): T | undefined {
    const db = this.getDatabase();
    try {
      const stmt = db.prepare(sql);
      const result = stmt.get(params);
      return result as T | undefined;
    } catch (error) {
      logger.error('[UserDB] Get error:', { sql, params, error });
      throw error;
    }
  }

  /**
   * Execute a query and return all rows (alias for exec)
   */
  static all<T = any>(sql: string, params: any[] = []): T[] {
    return this.exec<T>(sql, params);
  }

  /**
   * Execute an INSERT, UPDATE, or DELETE statement
   */
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

  /**
   * Check if database is connected
   */
  static isConnected(): boolean {
    return this.db !== null && this.db.open;
  }

  /**
   * Close database connection
   */
  static close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      logger.info('[UserDB] Database connection closed');
    }
  }
}
