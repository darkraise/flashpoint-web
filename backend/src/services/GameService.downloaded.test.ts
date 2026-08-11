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

describe('filter options honour the downloaded filter', () => {
  beforeEach(() => {
    db.exec(`
      UPDATE game SET series = 'Downloaded Series'
        WHERE id = '11111111-1111-1111-1111-111111111111';
      UPDATE game SET series = 'Absent Series'
        WHERE id = '22222222-2222-2222-2222-222222222222';
    `);
  });

  it('lists only series belonging to downloaded games', () => {
    const options = new GameService().getSeriesOptions({ downloaded: true });
    expect(options).toEqual(['Downloaded Series']);
  });

  it('lists every series when the filter is off', () => {
    const options = new GameService().getSeriesOptions({});
    expect(options).toHaveLength(2);
  });
});

describe('downloaded filter options use the durable cache', () => {
  function queryCount(): number {
    return (
      vi.mocked(DatabaseService.all).mock.calls.length +
      vi.mocked(DatabaseService.get).mock.calls.length
    );
  }

  beforeEach(() => {
    db.exec(`
      UPDATE game SET series = 'Downloaded Series'
        WHERE id = '11111111-1111-1111-1111-111111111111';
      UPDATE game SET series = 'Absent Series'
        WHERE id = '22222222-2222-2222-2222-222222222222';
    `);
    GameService.clearFilterOptionsCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    GameService.clearFilterOptionsCache();
  });

  it('does not recompute once the dynamic cache TTL has elapsed', async () => {
    const service = new GameService();
    const now = Date.now();
    const clock = vi.spyOn(Date, 'now').mockReturnValue(now);

    await service.getFilterOptions({ downloaded: true });
    const afterFirstCall = queryCount();
    expect(afterFirstCall).toBeGreaterThan(0);

    // Well past DYNAMIC_FILTER_CACHE_TTL (30s), which a dynamic entry would not survive.
    clock.mockReturnValue(now + 120_000);
    await service.getFilterOptions({ downloaded: true });

    expect(queryCount()).toBe(afterFirstCall);
  });

  it('still expires a genuinely dynamic filter after the TTL', async () => {
    const service = new GameService();
    const now = Date.now();
    const clock = vi.spyOn(Date, 'now').mockReturnValue(now);

    await service.getFilterOptions({ tags: ['Action'] });
    const afterFirstCall = queryCount();

    clock.mockReturnValue(now + 120_000);
    await service.getFilterOptions({ tags: ['Action'] });

    expect(queryCount()).toBeGreaterThan(afterFirstCall);
  });

  it('keeps downloaded and unfiltered options in separate cache entries', async () => {
    const service = new GameService();

    const downloadedOptions = await service.getFilterOptions({ downloaded: true });
    const allOptions = await service.getFilterOptions({});

    expect(downloadedOptions.series).toEqual(['Downloaded Series']);
    expect(allOptions.series).toHaveLength(2);
  });
});
