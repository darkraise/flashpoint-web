import fs from 'fs/promises';
import { config } from '../config';
import { logger } from '../utils/logger';
import { DatabaseService } from './DatabaseService';
import { GameDataDownloader } from '../game/services/GameDataDownloader';
import { GameSearchCache } from './GameSearchCache';
import { GameService } from './GameService';

const ZIP_NAME_PATTERN =
  /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})-(\d+)\.zip$/i;

/** SQLite's error code when the database or its filesystem is read-only. */
function isReadOnlyError(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    typeof (error as { code?: unknown }).code === 'string' &&
    ((error as { code: string }).code.startsWith('SQLITE_READONLY') ||
      (error as { code: string }).code === 'SQLITE_CANTOPEN')
  );
}

interface PendingRow {
  id: number;
  gameId: string;
  dateAdded: string;
}

/**
 * Rebuilds game_data.presentOnDisk from the ZIP files actually present in the games
 * directory. Marks only: a missing ZIP is not proof of absence, because the Launcher
 * may store game data outside config.flashpointGamesPath.
 */
export class DownloadedReconciler {
  static async reconcile(): Promise<{ scanned: number; marked: number }> {
    let files: string[];
    try {
      files = await fs.readdir(config.flashpointGamesPath);
    } catch (error: unknown) {
      logger.warn('[DownloadedReconciler] Games directory unreadable, skipping reconciliation', {
        error,
        path: config.flashpointGamesPath,
      });
      return { scanned: 0, marked: 0 };
    }

    // Index by exact filename and compare against what GameDataDownloader would
    // generate for each row. Re-deriving the timestamp here instead would miss
    // rows whose dateAdded uses one of the formats that helper normalizes.
    const onDisk = new Set<string>();
    const onDiskGameIds = new Set<string>();
    for (const file of files) {
      const match = ZIP_NAME_PATTERN.exec(file);
      if (!match) continue;
      onDisk.add(file);
      onDiskGameIds.add(match[1].toLowerCase());
    }

    if (onDisk.size === 0) {
      return { scanned: files.length, marked: 0 };
    }

    const db = DatabaseService.getDatabase();
    const pending = db
      .prepare(
        `SELECT id, gameId, dateAdded FROM game_data WHERE presentOnDisk = 0 OR presentOnDisk IS NULL`
      )
      .all() as PendingRow[];

    const toMark = pending.filter((row) => {
      if (!onDiskGameIds.has(row.gameId.toLowerCase())) {
        return false;
      }

      try {
        return onDisk.has(GameDataDownloader.getFilename(row.gameId, row.dateAdded));
      } catch {
        // A row whose dateAdded cannot produce a filename simply has no match.
        return false;
      }
    });

    if (toMark.length === 0) {
      return { scanned: files.length, marked: 0 };
    }

    const markData = db.prepare('UPDATE game_data SET presentOnDisk = 1 WHERE id = ?');
    const markGame = db.prepare(
      'UPDATE game SET activeDataOnDisk = 1 WHERE id = ? AND activeDataId = ?'
    );

    try {
      db.transaction(() => {
        for (const row of toMark) {
          markData.run(row.id);
          markGame.run(row.gameId, row.id);
        }
      })();
    } catch (error: unknown) {
      if (isReadOnlyError(error)) {
        // The shipped compose mounts Flashpoint read-only. Say so once, clearly,
        // instead of failing every startup with a stack trace.
        logger.warn(
          '[DownloadedReconciler] Database is read-only, cannot record downloaded state. ' +
            'Mount Flashpoint read-write or set ENABLE_LOCAL_DB_COPY=true.'
        );
        return { scanned: files.length, marked: 0 };
      }
      throw error;
    }

    DatabaseService.noteSelfWrite();
    GameSearchCache.clearCache();
    GameService.clearFilterOptionsCache();

    logger.info('[DownloadedReconciler] Reconciled downloaded game data', {
      scanned: files.length,
      marked: toMark.length,
    });

    return { scanned: files.length, marked: toMark.length };
  }
}
