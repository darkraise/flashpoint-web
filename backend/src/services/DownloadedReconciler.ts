import fs from 'fs/promises';
import { config } from '../config';
import { logger } from '../utils/logger';
import { DatabaseService } from './DatabaseService';
import { GameSearchCache } from './GameSearchCache';
import { GameService } from './GameService';

const ZIP_NAME_PATTERN =
  /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})-(\d+)\.zip$/i;

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

    const onDisk = new Map<string, Set<number>>();
    for (const file of files) {
      const match = ZIP_NAME_PATTERN.exec(file);
      if (!match) continue;
      const gameId = match[1].toLowerCase();
      const timestamp = Number(match[2]);
      const timestamps = onDisk.get(gameId) ?? new Set<number>();
      timestamps.add(timestamp);
      onDisk.set(gameId, timestamps);
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
      const timestamps = onDisk.get(row.gameId.toLowerCase());
      if (!timestamps) return false;
      const parsed = new Date(row.dateAdded).getTime();
      return !isNaN(parsed) && timestamps.has(parsed);
    });

    if (toMark.length === 0) {
      return { scanned: files.length, marked: 0 };
    }

    const markData = db.prepare('UPDATE game_data SET presentOnDisk = 1 WHERE id = ?');
    const markGame = db.prepare(
      'UPDATE game SET activeDataOnDisk = 1 WHERE id = ? AND activeDataId = ?'
    );

    db.transaction(() => {
      for (const row of toMark) {
        markData.run(row.id);
        markGame.run(row.gameId, row.id);
      }
    })();

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
