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
      const schemaPath = path.join(__dirname, '../migrations/user-schema.sql');

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
      const tableInfo = this.db!.pragma('table_info(users)');

      // Check if theme_color column exists
      const hasThemeColor = tableInfo.some((col: any) => col.name === 'theme_color');
      if (!hasThemeColor) {
        logger.info('[UserDB] Running migration: add-theme-color');
        const migrationPath = path.join(__dirname, '../migrations/add-theme-color.sql');
        if (fs.existsSync(migrationPath)) {
          const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
          this.db!.exec(migrationSQL);
          logger.info('[UserDB] Migration completed: add-theme-color');
        }
      }

      // Check if surface_color column exists
      const hasSurfaceColor = tableInfo.some((col: any) => col.name === 'surface_color');
      if (!hasSurfaceColor) {
        logger.info('[UserDB] Running migration: add-surface-color');
        const migrationPath = path.join(__dirname, '../migrations/add-surface-color.sql');
        if (fs.existsSync(migrationPath)) {
          const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
          this.db!.exec(migrationSQL);
          logger.info('[UserDB] Migration completed: add-surface-color');
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
