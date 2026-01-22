import BetterSqlite3 from 'better-sqlite3';
import { config } from '../config';
import { logger } from '../utils/logger';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';

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

      // Create tables if not exist
      await this.createTables();

      // Run migrations
      await this.runMigrations();

      // Create default admin user if no users exist
      await this.createDefaultAdmin();

      logger.info('[UserDB] User database initialized successfully');
    } catch (error) {
      logger.error('[UserDB] Failed to initialize user database:', error);
      throw error;
    }
  }

  /**
   * Create tables from schema SQL file
   */
  private static async createTables(): Promise<void> {
    try {
      const schemaPath = path.join(__dirname, '../migrations/001_user-schema.sql');

      if (!fs.existsSync(schemaPath)) {
        throw new Error(`Schema file not found: ${schemaPath}`);
      }

      const schemaSQL = fs.readFileSync(schemaPath, 'utf-8');
      this.db!.exec(schemaSQL);

      logger.info('[UserDB] Database schema created successfully');
    } catch (error) {
      logger.error('[UserDB] Failed to create tables:', error);
      throw error;
    }
  }

  /**
   * Run database migrations
   */
  private static async runMigrations(): Promise<void> {
    try {
      const tableInfo = this.db!.pragma('table_info(users)') as any[];

      // Migration 002: Create user_settings table
      const tables = this.db!.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name='user_settings'
      `).all();

      if (tables.length === 0) {
        logger.info('[UserDB] Running migration: 002_create-user-settings');
        const migrationPath = path.join(__dirname, '../migrations/002_create-user-settings.sql');
        if (fs.existsSync(migrationPath)) {
          const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
          this.db!.exec(migrationSQL);
          logger.info('[UserDB] Migration completed: 002_create-user-settings');
        }
      }

      // Migration 003: Create system_settings table
      const systemSettingsTables = this.db!.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name='system_settings'
      `).all();

      if (systemSettingsTables.length === 0) {
        logger.info('[UserDB] Running migration: 003_create-system-settings');
        const migrationPath = path.join(__dirname, '../migrations/003_create-system-settings.sql');
        if (fs.existsSync(migrationPath)) {
          const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
          this.db!.exec(migrationSQL);
          logger.info('[UserDB] Migration completed: 003_create-system-settings');
        }
      }

      // Migration 004: Add validation schemas
      const hasValidationSchemas = this.db!.prepare(`
        SELECT validation_schema FROM system_settings
        WHERE key = 'auth.user_registration_enabled'
      `).get() as { validation_schema: string | null } | undefined;

      if (systemSettingsTables.length > 0 && (!hasValidationSchemas || !hasValidationSchemas.validation_schema)) {
        logger.info('[UserDB] Running migration: 004_add-validation-schemas');
        const migrationPath = path.join(__dirname, '../migrations/004_add-validation-schemas.sql');
        if (fs.existsSync(migrationPath)) {
          const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
          this.db!.exec(migrationSQL);
          logger.info('[UserDB] Migration completed: 004_add-validation-schemas');
        }
      }

      // Migration 005: User playlists and favorites
      const userPlaylistsTables = this.db!.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name='user_playlists'
      `).all();

      if (userPlaylistsTables.length === 0) {
        logger.info('[UserDB] Running migration: 005_user-playlists-and-favorites');
        const migrationPath = path.join(__dirname, '../migrations/005_user-playlists-and-favorites.sql');
        if (fs.existsSync(migrationPath)) {
          const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
          this.db!.exec(migrationSQL);
          logger.info('[UserDB] Migration completed: 005_user-playlists-and-favorites');
        }
      }

      // Migration 006: Jobs settings
      const hasJobsSettings = this.db!.prepare(`
        SELECT COUNT(*) as count FROM system_settings
        WHERE category = 'jobs'
      `).get() as { count: number } | undefined;

      if (systemSettingsTables.length > 0 && (!hasJobsSettings || hasJobsSettings.count === 0)) {
        logger.info('[UserDB] Running migration: 006_create-jobs-settings');
        const migrationPath = path.join(__dirname, '../migrations/006_create-jobs-settings.sql');
        if (fs.existsSync(migrationPath)) {
          const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
          this.db!.exec(migrationSQL);
          logger.info('[UserDB] Migration completed: 006_create-jobs-settings');
        }
      }

      // Migration 007: Job execution logs
      const jobExecutionLogsTables = this.db!.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name='job_execution_logs'
      `).all();

      if (jobExecutionLogsTables.length === 0) {
        logger.info('[UserDB] Running migration: 007_create-job-execution-logs');
        const migrationPath = path.join(__dirname, '../migrations/007_create-job-execution-logs.sql');
        if (fs.existsSync(migrationPath)) {
          const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
          this.db!.exec(migrationSQL);
          logger.info('[UserDB] Migration completed: 007_create-job-execution-logs');
        }
      }

      // Migration 008: Convert interval to cron
      const hasCronSchedule = this.db!.prepare(`
        SELECT COUNT(*) as count FROM system_settings
        WHERE key = 'jobs.metadata_sync_schedule'
      `).get() as { count: number } | undefined;

      if (systemSettingsTables.length > 0 && (!hasCronSchedule || hasCronSchedule.count === 0)) {
        logger.info('[UserDB] Running migration: 008_convert-interval-to-cron');
        const migrationPath = path.join(__dirname, '../migrations/008_convert-interval-to-cron.sql');
        if (fs.existsSync(migrationPath)) {
          const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
          this.db!.exec(migrationSQL);
          logger.info('[UserDB] Migration completed: 008_convert-interval-to-cron');
        }
      }
    } catch (error) {
      logger.error('[UserDB] Failed to run migrations:', error);
      throw error;
    }
  }

  /**
   * Create default admin user if no users exist
   */
  private static async createDefaultAdmin(): Promise<void> {
    try {
      const userCount = this.get('SELECT COUNT(*) as count FROM users', []);

      if (userCount?.count === 0) {
        // Default admin credentials (MUST be changed on first login)
        const defaultUsername = 'admin';
        const defaultPassword = 'admin123';
        const defaultEmail = 'admin@flashpoint.local';

        // Hash password
        const passwordHash = await bcrypt.hash(defaultPassword, config.bcryptSaltRounds);

        // Create admin user (role_id = 1 for admin)
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
      } else {
        logger.debug(`[UserDB] Found ${userCount.count} existing user(s)`);
      }
    } catch (error) {
      logger.error('[UserDB] Failed to create default admin:', error);
      throw error;
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
  static exec(sql: string, params: any[] = []): any[] {
    const db = this.getDatabase();
    try {
      const stmt = db.prepare(sql);
      return stmt.all(params);
    } catch (error) {
      logger.error('[UserDB] Query error:', { sql, params, error });
      throw error;
    }
  }

  /**
   * Execute a query and return first row
   */
  static get(sql: string, params: any[] = []): any | null {
    const db = this.getDatabase();
    try {
      const stmt = db.prepare(sql);
      return stmt.get(params) || null;
    } catch (error) {
      logger.error('[UserDB] Get error:', { sql, params, error });
      throw error;
    }
  }

  /**
   * Execute a query and return all rows (alias for exec)
   */
  static all(sql: string, params: any[] = []): any[] {
    return this.exec(sql, params);
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
