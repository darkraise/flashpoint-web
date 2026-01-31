import BetterSqlite3 from 'better-sqlite3';
import { config } from '../config';
import { logger } from '../utils/logger';
import { measureQueryPerformance } from '../utils/queryPerformance';
import fs from 'fs';

// Import GameSearchCache for cache invalidation
// Using dynamic import to avoid circular dependency
let GameSearchCache: any = null;
try {
  GameSearchCache = require('./GameSearchCache').GameSearchCache;
} catch (error) {
  // GameSearchCache may not be available in all contexts
  logger.debug('GameSearchCache not available for cache invalidation');
}

export class DatabaseService {
  private static db: BetterSqlite3.Database | null = null;
  private static watcher: fs.FSWatcher | null = null;
  private static reloadTimeout: NodeJS.Timeout | null = null;
  private static lastModifiedTime: number = 0;

  static async initialize(): Promise<void> {
    try {
      // Check if database file exists
      if (!fs.existsSync(config.flashpointDbPath)) {
        throw new Error(`Flashpoint database not found at: ${config.flashpointDbPath}`);
      }

      // Open database connection
      // Note: Not using readonly mode to allow write operations (e.g., game downloads)
      // SQLite handles concurrent access with file locking
      this.db = new BetterSqlite3(config.flashpointDbPath, {
        fileMustExist: true,
      });

      // Store initial modification time
      const stats = fs.statSync(config.flashpointDbPath);
      this.lastModifiedTime = stats.mtimeMs;

      logger.info('Database connection opened successfully');

      // Start watching for file changes
      this.startWatching();
    } catch (error) {
      logger.error('Failed to initialize database:', error);
      throw error;
    }
  }

  /**
   * Start watching the database file for changes (e.g., from Flashpoint Launcher)
   */
  private static startWatching(): void {
    if (this.watcher) {
      return; // Already watching
    }

    try {
      this.watcher = fs.watch(config.flashpointDbPath, (eventType) => {
        if (eventType === 'change') {
          // Debounce: wait 500ms after last change before reloading
          if (this.reloadTimeout) {
            clearTimeout(this.reloadTimeout);
          }

          this.reloadTimeout = setTimeout(() => {
            this.reloadFromDisk();
          }, 500);
        }
      });

      logger.info('Database file watcher started');
    } catch (error) {
      logger.error('Failed to start database file watcher:', error);
      // Non-fatal: continue without file watching
    }
  }

  /**
   * Stop watching the database file
   */
  private static stopWatching(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      logger.info('Database file watcher stopped');
    }

    if (this.reloadTimeout) {
      clearTimeout(this.reloadTimeout);
      this.reloadTimeout = null;
    }
  }

  /**
   * Reload database from disk (called when file changes detected)
   */
  private static async reloadFromDisk(): Promise<void> {
    try {
      // Check if file was actually modified
      const stats = fs.statSync(config.flashpointDbPath);
      if (stats.mtimeMs <= this.lastModifiedTime) {
        // File hasn't changed, skip reload
        return;
      }

      logger.info('Database file changed on disk, reopening connection...');

      // Close existing database connection
      if (this.db) {
        this.db.close();
        this.db = null;
      }

      // Reopen database connection
      // Note: Not using readonly mode to allow write operations (e.g., game downloads)
      this.db = new BetterSqlite3(config.flashpointDbPath, {
        fileMustExist: true,
      });

      // Update modification time
      this.lastModifiedTime = stats.mtimeMs;

      // Invalidate game search cache since database changed
      if (GameSearchCache) {
        GameSearchCache.clearCache();
        logger.info('Game search cache invalidated due to database reload');
      }

      logger.info('Database connection reopened successfully');
    } catch (error) {
      logger.error('Failed to reload database from disk:', error);
      // Try to re-initialize if reload failed
      try {
        await this.initialize();
      } catch (reinitError) {
        logger.error('Failed to re-initialize database:', reinitError);
      }
    }
  }

  /**
   * Manually reload database from disk
   * Useful for API endpoints or when you know the database has changed
   */
  static async reload(): Promise<void> {
    return this.reloadFromDisk();
  }

  static getDatabase(): BetterSqlite3.Database {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  static isConnected(): boolean {
    return this.db !== null;
  }

  static close(): void {
    // Stop watching before closing
    this.stopWatching();

    if (this.db) {
      this.db.close();
      this.db = null;
      logger.info('Database connection closed');
    }
  }

  // Helper method to execute queries and return results as objects
  static exec<T = any>(sql: string, params: any[] = []): T[] {
    const db = this.getDatabase();

    return measureQueryPerformance(() => {
      try {
        const stmt = db.prepare(sql);
        return stmt.all(params) as T[];
      } catch (error) {
        logger.error('Database query error:', { sql, params, error });
        throw error;
      }
    }, sql, params);
  }

  // Helper method to get a single row
  static get<T = any>(sql: string, params: any[] = []): T | undefined {
    const db = this.getDatabase();

    return measureQueryPerformance(() => {
      try {
        const stmt = db.prepare(sql);
        const result = stmt.get(params);
        return result as T | undefined;
      } catch (error) {
        logger.error('Database get error:', error);
        throw error;
      }
    }, sql, params);
  }

  // Helper method to get all rows
  static all<T = any>(sql: string, params: any[] = []): T[] {
    const db = this.getDatabase();

    return measureQueryPerformance(() => {
      try {
        const stmt = db.prepare(sql);
        return stmt.all(params) as T[];
      } catch (error) {
        logger.error('Database all error:', error);
        throw error;
      }
    }, sql, params);
  }

  // Helper method to run INSERT/UPDATE/DELETE queries (doesn't return rows)
  static run(sql: string, params: any[] = []): void {
    const db = this.getDatabase();

    measureQueryPerformance(() => {
      try {
        const stmt = db.prepare(sql);
        stmt.run(params);
      } catch (error) {
        logger.error('Database run error:', { sql, params, error });
        throw error;
      }
    }, sql, params);
  }

  // Save database changes to disk
  // Note: With better-sqlite3, changes are automatically written to disk
  // This method exists for compatibility but is essentially a no-op
  static save(): void {
    try {
      const db = this.getDatabase();
      // Force a checkpoint in WAL mode to ensure all changes are written
      db.pragma('wal_checkpoint(TRUNCATE)');
      logger.info('Database changes flushed to disk');
    } catch (error) {
      logger.error('Failed to save database:', error);
      throw error;
    }
  }
}
