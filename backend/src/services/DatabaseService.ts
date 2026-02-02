import BetterSqlite3 from 'better-sqlite3';
import { config } from '../config';
import { logger } from '../utils/logger';
import { measureQueryPerformance } from '../utils/queryPerformance';
import fs from 'fs';
import path from 'path';

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
  private static sourceDbPath: string = ''; // Original path (may be network)
  private static activeDbPath: string = ''; // Path actually used (local or network)
  private static isUsingLocalCopy: boolean = false;

  static async initialize(): Promise<void> {
    try {
      this.sourceDbPath = config.flashpointDbPath;

      // Check if source database file exists
      if (!fs.existsSync(this.sourceDbPath)) {
        throw new Error(`Flashpoint database not found at: ${this.sourceDbPath}`);
      }

      // Determine which database path to use
      if (config.enableLocalDbCopy) {
        await this.setupLocalDatabaseCopy();
      } else {
        this.activeDbPath = this.sourceDbPath;
        this.isUsingLocalCopy = false;
        logger.info('Using database directly from source path (local copy disabled)');
      }

      // Open database connection
      this.db = this.openDatabase(this.activeDbPath);

      // Store initial modification time of source
      const stats = fs.statSync(this.sourceDbPath);
      this.lastModifiedTime = stats.mtimeMs;

      logger.info('Database connection opened successfully', {
        sourcePath: this.sourceDbPath,
        activePath: this.activeDbPath,
        usingLocalCopy: this.isUsingLocalCopy
      });

      // Start watching source database for changes
      this.startWatching();
    } catch (error) {
      logger.error('Failed to initialize database:', error);
      throw error;
    }
  }

  /**
   * Open database with optimized PRAGMA settings
   */
  private static openDatabase(dbPath: string): BetterSqlite3.Database {
    const db = new BetterSqlite3(dbPath, {
      fileMustExist: true,
    });

    // Apply SQLite optimizations
    this.applyPragmaOptimizations(db);

    return db;
  }

  /**
   * Apply PRAGMA settings to optimize SQLite performance
   * Settings are tuned differently for local vs network storage
   */
  private static applyPragmaOptimizations(db: BetterSqlite3.Database): void {
    const startTime = performance.now();

    try {
      // Journal mode: DELETE is better for network, WAL for local
      // Using DELETE for broader compatibility
      db.pragma('journal_mode = DELETE');

      // Synchronous: NORMAL is safe for read-heavy workloads
      // FULL is safest but slowest, OFF is fastest but risky
      db.pragma('synchronous = NORMAL');

      // Store temp tables and indices in memory (avoid disk/network I/O)
      db.pragma('temp_store = MEMORY');

      // Cache size: Larger cache = fewer disk reads
      // Negative value = size in KB, positive = number of pages
      // Default is -2000 (2MB), we use -64000 (64MB) for better performance
      db.pragma(`cache_size = ${config.sqliteCacheSize}`);

      // Memory-mapped I/O: Only beneficial for local storage
      // Disabled (0) for network storage as it can cause issues
      if (this.isUsingLocalCopy) {
        db.pragma(`mmap_size = ${config.sqliteMmapSize}`);
        logger.debug(`SQLite mmap enabled: ${config.sqliteMmapSize} bytes`);
      } else {
        db.pragma('mmap_size = 0');
        logger.debug('SQLite mmap disabled for network storage');
      }

      // Locking mode: NORMAL releases locks promptly (better for network)
      db.pragma('locking_mode = NORMAL');

      // Page size: 4096 is standard, matches most filesystem block sizes
      // Note: Can only be changed on empty database, so this is informational
      const pageSize = db.pragma('page_size', { simple: true });
      logger.debug(`SQLite page size: ${pageSize}`);

      // Run optimizer to update query planner statistics
      db.pragma('optimize');

      const duration = Math.round(performance.now() - startTime);
      logger.info(`SQLite PRAGMA optimizations applied in ${duration}ms`, {
        cacheSize: config.sqliteCacheSize,
        mmapSize: this.isUsingLocalCopy ? config.sqliteMmapSize : 0,
        tempStore: 'MEMORY',
        journalMode: 'DELETE',
        synchronous: 'NORMAL'
      });
    } catch (error) {
      logger.error('Failed to apply some PRAGMA optimizations:', error);
      // Non-fatal: continue with default settings
    }
  }

  /**
   * Setup local database copy for faster access
   * Copies database from network/source to local storage
   */
  private static async setupLocalDatabaseCopy(): Promise<void> {
    const localDir = path.dirname(config.localDbPath);

    // Ensure local directory exists
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
      logger.info(`Created local database directory: ${localDir}`);
    }

    // Check if we need to copy/update local database
    const needsCopy = await this.needsLocalDatabaseUpdate();

    if (needsCopy) {
      await this.copyDatabaseToLocal();
    } else {
      logger.info('Local database copy is up to date');
    }

    this.activeDbPath = config.localDbPath;
    this.isUsingLocalCopy = true;
  }

  /**
   * Check if local database needs to be copied/updated
   */
  private static async needsLocalDatabaseUpdate(): Promise<boolean> {
    // If local copy doesn't exist, we need to copy
    if (!fs.existsSync(config.localDbPath)) {
      logger.info('Local database copy does not exist, will create');
      return true;
    }

    try {
      // Compare modification times
      const sourceStats = fs.statSync(this.sourceDbPath);
      const localStats = fs.statSync(config.localDbPath);

      if (sourceStats.mtimeMs > localStats.mtimeMs) {
        logger.info('Source database is newer than local copy, will update', {
          sourceModified: new Date(sourceStats.mtimeMs).toISOString(),
          localModified: new Date(localStats.mtimeMs).toISOString()
        });
        return true;
      }

      // Also check file size as a sanity check
      if (sourceStats.size !== localStats.size) {
        logger.info('Source database size differs from local copy, will update', {
          sourceSize: sourceStats.size,
          localSize: localStats.size
        });
        return true;
      }

      return false;
    } catch (error) {
      logger.warn('Error comparing database files, will recopy:', error);
      return true;
    }
  }

  /**
   * Copy database from source to local storage
   */
  private static async copyDatabaseToLocal(): Promise<void> {
    const startTime = performance.now();
    const tempPath = `${config.localDbPath}.tmp`;

    try {
      logger.info('Copying database to local storage...', {
        source: this.sourceDbPath,
        destination: config.localDbPath
      });

      // Copy to temp file first (atomic operation)
      fs.copyFileSync(this.sourceDbPath, tempPath);

      // Rename temp to final (atomic on most filesystems)
      fs.renameSync(tempPath, config.localDbPath);

      const stats = fs.statSync(config.localDbPath);
      const duration = Math.round(performance.now() - startTime);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

      logger.info(`Database copied to local storage in ${duration}ms`, {
        size: `${sizeMB} MB`,
        path: config.localDbPath
      });
    } catch (error) {
      // Clean up temp file if it exists
      if (fs.existsSync(tempPath)) {
        try {
          fs.unlinkSync(tempPath);
        } catch (cleanupError) {
          logger.warn('Failed to clean up temp file:', cleanupError);
        }
      }
      throw error;
    }
  }

  /**
   * Start watching the source database file for changes
   * When source changes, update local copy and reload connection
   */
  private static startWatching(): void {
    if (this.watcher) {
      return; // Already watching
    }

    try {
      // Always watch the source path (network or local)
      this.watcher = fs.watch(this.sourceDbPath, (eventType) => {
        if (eventType === 'change') {
          // Debounce: wait 500ms after last change before reloading
          if (this.reloadTimeout) {
            clearTimeout(this.reloadTimeout);
          }

          this.reloadTimeout = setTimeout(() => {
            this.syncAndReload();
          }, 500);
        }
      });

      logger.info('Database file watcher started', {
        watching: this.sourceDbPath
      });
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
   * Sync local copy (if enabled) and reload database connection
   * Called when source database file changes
   */
  private static async syncAndReload(): Promise<void> {
    try {
      // Check if file was actually modified
      const stats = fs.statSync(this.sourceDbPath);
      if (stats.mtimeMs <= this.lastModifiedTime) {
        // File hasn't changed, skip reload
        return;
      }

      logger.info('Source database file changed, syncing...');

      // Close existing database connection
      if (this.db) {
        this.db.close();
        this.db = null;
      }

      // If using local copy, update it from source
      if (this.isUsingLocalCopy && config.enableLocalDbCopy) {
        await this.copyDatabaseToLocal();
      }

      // Reopen database connection
      this.db = this.openDatabase(this.activeDbPath);

      // Update modification time
      this.lastModifiedTime = stats.mtimeMs;

      // Invalidate game search cache since database changed
      if (GameSearchCache) {
        GameSearchCache.clearCache();
        logger.info('Game search cache invalidated due to database reload');
      }

      logger.info('Database connection reopened successfully');
    } catch (error) {
      logger.error('Failed to sync and reload database:', error);
      // Try to re-initialize if sync failed
      try {
        await this.initialize();
      } catch (reinitError) {
        logger.error('Failed to re-initialize database:', reinitError);
      }
    }
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use syncAndReload instead
   */
  private static async reloadFromDisk(): Promise<void> {
    return this.syncAndReload();
  }

  /**
   * Manually reload database from disk
   * Useful for API endpoints or when you know the database has changed
   */
  static async reload(): Promise<void> {
    return this.syncAndReload();
  }

  /**
   * Force sync from source to local copy and reload
   * Use this when you need to ensure the local copy is up to date
   */
  static async forceSync(): Promise<void> {
    if (this.isUsingLocalCopy && config.enableLocalDbCopy) {
      logger.info('Force syncing database from source...');

      // Close existing connection
      if (this.db) {
        this.db.close();
        this.db = null;
      }

      // Copy from source
      await this.copyDatabaseToLocal();

      // Reopen connection
      this.db = this.openDatabase(this.activeDbPath);

      // Update modification time
      const stats = fs.statSync(this.sourceDbPath);
      this.lastModifiedTime = stats.mtimeMs;

      // Invalidate cache
      if (GameSearchCache) {
        GameSearchCache.clearCache();
      }

      logger.info('Force sync completed');
    } else {
      // Just reload if not using local copy
      await this.syncAndReload();
    }
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

  /**
   * Get database status information
   */
  static getStatus(): {
    connected: boolean;
    sourcePath: string;
    activePath: string;
    usingLocalCopy: boolean;
    lastModified: Date | null;
  } {
    return {
      connected: this.db !== null,
      sourcePath: this.sourceDbPath,
      activePath: this.activeDbPath,
      usingLocalCopy: this.isUsingLocalCopy,
      lastModified: this.lastModifiedTime ? new Date(this.lastModifiedTime) : null
    };
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
