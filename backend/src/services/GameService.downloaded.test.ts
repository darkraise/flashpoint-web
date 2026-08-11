import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import BetterSqlite3 from 'better-sqlite3';

vi.mock('./DatabaseService', () => ({
  DatabaseService: {
    all: vi.fn(),
    get: vi.fn(),
    getDatabase: vi.fn(),
  },
}));

vi.mock('../utils/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}));

import { DatabaseService } from './DatabaseService';
import { GameService } from './GameService';

let db: BetterSqlite3.Database;

function seed(): void {
  db.exec(`
    CREATE TABLE game (
      id TEXT PRIMARY KEY, title TEXT, alternateTitles TEXT, series TEXT,
      developer TEXT, publisher TEXT, platformName TEXT, library TEXT,
      orderTitle TEXT, dateAdded TEXT, dateModified TEXT, releaseDate TEXT,
      playMode TEXT, language TEXT, tagsStr TEXT, broken INTEGER DEFAULT 0,
      extreme INTEGER DEFAULT 0, activeDataId INTEGER, activeDataOnDisk INTEGER,
      launchCommand TEXT, archiveState INTEGER
    );
    CREATE TABLE game_data (
      id INTEGER PRIMARY KEY, gameId TEXT, dateAdded TEXT, sha256 TEXT,
      path TEXT, presentOnDisk INTEGER DEFAULT 0, launchCommand TEXT
    );
    INSERT INTO game (id, title, orderTitle, platformName, library) VALUES
      ('11111111-1111-1111-1111-111111111111', 'Downloaded Game', 'downloaded game', 'HTML5', 'arcade'),
      ('22222222-2222-2222-2222-222222222222', 'Absent Game', 'absent game', 'HTML5', 'arcade');
    INSERT INTO game_data (id, gameId, dateAdded, presentOnDisk) VALUES
      (1, '11111111-1111-1111-1111-111111111111', '2020-01-01T00:00:00.000Z', 1),
      (2, '22222222-2222-2222-2222-222222222222', '2020-01-01T00:00:00.000Z', 0);
  `);
}

beforeEach(() => {
  db = new BetterSqlite3(':memory:');
  seed();
  vi.mocked(DatabaseService.all).mockImplementation(
    (sql: string, params: unknown[] = []) => db.prepare(sql).all(...params) as unknown[]
  );
  vi.mocked(DatabaseService.get).mockImplementation(
    (sql: string, params: unknown[] = []) => db.prepare(sql).get(...params) as unknown
  );
});

afterEach(() => {
  db.close();
  vi.clearAllMocks();
});

const baseQuery = {
  sortBy: 'title',
  sortOrder: 'asc' as const,
  page: 1,
  limit: 50,
  showBroken: false,
  showExtreme: false,
  fields: 'list' as const,
};

describe('GameService downloaded filter', () => {
  it('returns only games with presentOnDisk=1 when downloaded is true', async () => {
    const result = await new GameService().searchGames({ ...baseQuery, downloaded: true });
    expect(result.data.map((g) => g.title)).toEqual(['Downloaded Game']);
  });

  it('returns all games when downloaded is undefined', async () => {
    const result = await new GameService().searchGames(baseQuery);
    expect(result.data).toHaveLength(2);
  });

  it('returns all games when downloaded is false', async () => {
    const result = await new GameService().searchGames({ ...baseQuery, downloaded: false });
    expect(result.data).toHaveLength(2);
  });
});
