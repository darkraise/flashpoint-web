import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import BetterSqlite3 from 'better-sqlite3';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

vi.mock('../utils/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}));

let gamesDir: string;

vi.mock('../config', () => ({
  config: {
    get flashpointGamesPath() {
      return gamesDir;
    },
    flashpointPath: 'C:/Flashpoint',
  },
}));

vi.mock('./DatabaseService', () => ({
  DatabaseService: { getDatabase: vi.fn(), noteSelfWrite: vi.fn() },
}));

import { DatabaseService } from './DatabaseService';
import { DownloadedReconciler } from './DownloadedReconciler';

const GAME_ID = '11111111-1111-1111-1111-111111111111';
const DATE_ADDED = '2020-01-01T00:00:00.000Z';
let db: BetterSqlite3.Database;

beforeEach(async () => {
  gamesDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fp-games-'));
  db = new BetterSqlite3(':memory:');
  db.exec(`
    CREATE TABLE game (id TEXT PRIMARY KEY, activeDataId INTEGER, activeDataOnDisk INTEGER);
    CREATE TABLE game_data (
      id INTEGER PRIMARY KEY, gameId TEXT, dateAdded TEXT, path TEXT,
      presentOnDisk INTEGER DEFAULT 0
    );
    INSERT INTO game (id, activeDataId, activeDataOnDisk) VALUES ('${GAME_ID}', 1, 0);
    INSERT INTO game_data (id, gameId, dateAdded, presentOnDisk)
      VALUES (1, '${GAME_ID}', '${DATE_ADDED}', 0);
  `);
  vi.mocked(DatabaseService.getDatabase).mockReturnValue(db);
});

afterEach(async () => {
  db.close();
  await fs.rm(gamesDir, { recursive: true, force: true });
  vi.clearAllMocks();
});

describe('DownloadedReconciler', () => {
  it('marks a game whose ZIP is present on disk', async () => {
    const timestamp = new Date(DATE_ADDED).getTime();
    await fs.writeFile(path.join(gamesDir, `${GAME_ID}-${timestamp}.zip`), 'x');

    const result = await DownloadedReconciler.reconcile();

    expect(result.marked).toBe(1);
    const row = db.prepare('SELECT presentOnDisk FROM game_data WHERE id = 1').get() as {
      presentOnDisk: number;
    };
    expect(row.presentOnDisk).toBe(1);
    const game = db.prepare(`SELECT activeDataOnDisk FROM game WHERE id = '${GAME_ID}'`).get() as {
      activeDataOnDisk: number;
    };
    expect(game.activeDataOnDisk).toBe(1);
  });

  it('ignores files that are not game ZIPs', async () => {
    await fs.writeFile(path.join(gamesDir, 'notes.txt'), 'x');
    await fs.writeFile(path.join(gamesDir, 'random-name.zip'), 'x');

    const result = await DownloadedReconciler.reconcile();

    expect(result.marked).toBe(0);
  });

  it('marks nothing and does not throw when the directory is unreadable', async () => {
    await fs.rm(gamesDir, { recursive: true, force: true });

    const result = await DownloadedReconciler.reconcile();

    expect(result).toEqual({ scanned: 0, marked: 0 });
  });

  it('never clears the flag for a game whose ZIP is missing', async () => {
    db.prepare('UPDATE game_data SET presentOnDisk = 1 WHERE id = 1').run();

    await DownloadedReconciler.reconcile();

    const row = db.prepare('SELECT presentOnDisk FROM game_data WHERE id = 1').get() as {
      presentOnDisk: number;
    };
    expect(row.presentOnDisk).toBe(1);
  });
});
