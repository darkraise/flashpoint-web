import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import BetterSqlite3 from 'better-sqlite3';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { DbQueryPool } from './DbQueryPool';

let dbPath: string;

beforeAll(() => {
  dbPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'fp-pool-')), 'test.sqlite');
  const db = new BetterSqlite3(dbPath);
  db.exec(`
    CREATE TABLE game (id TEXT PRIMARY KEY, title TEXT);
    INSERT INTO game (id, title) VALUES ('a', 'Alpha'), ('b', 'Beta'), ('c', 'Gamma');
  `);
  db.close();

  DbQueryPool.start(dbPath);
});

afterAll(async () => {
  await DbQueryPool.shutdown();
  fs.rmSync(path.dirname(dbPath), { recursive: true, force: true });
});

describe('DbQueryPool', () => {
  it('starts workers that can serve queries off the main thread', async () => {
    expect(DbQueryPool.isAvailable()).toBe(true);

    const rows = await DbQueryPool.all<{ title: string }>(
      'SELECT title FROM game ORDER BY title ASC'
    );

    expect(rows.map((r) => r.title)).toEqual(['Alpha', 'Beta', 'Gamma']);
  });

  it('binds parameters', async () => {
    const rows = await DbQueryPool.all<{ title: string }>('SELECT title FROM game WHERE id = ?', [
      'b',
    ]);

    expect(rows).toEqual([{ title: 'Beta' }]);
  });

  it('serves more concurrent queries than it has workers', async () => {
    const results = await Promise.all(
      Array.from({ length: 24 }, () =>
        DbQueryPool.all<{ count: number }>('SELECT COUNT(*) as count FROM game')
      )
    );

    expect(results).toHaveLength(24);
    expect(results.every((rows) => rows[0].count === 3)).toBe(true);
  });

  it('rejects the in-flight query when its worker dies, instead of hanging', async () => {
    // Kill one worker while the pool still has others: the caller whose query it
    // was running must be rejected, not left waiting for a result that can never
    // arrive. A hung promise here means a hung HTTP request in production.
    const pool = DbQueryPool as unknown as {
      slots: Array<{
        worker: { terminate: () => Promise<number> };
        busy: boolean;
        queryId: number | null;
      }>;
      pending: Map<number, { reject: (e: Error) => void }>;
      drain: () => void;
    };

    const victim = pool.slots[0];
    victim.busy = true;
    victim.queryId = 999_999;

    const stranded = new Promise<void>((resolve, reject) => {
      pool.pending.set(999_999, { reject: (error: Error) => reject(error) } as never);
      setTimeout(resolve, 3000);
    });

    await victim.worker.terminate();

    await expect(stranded).rejects.toThrow(/stopped while running/);
  });

  it('rejects a bad statement without killing the worker', async () => {
    await expect(DbQueryPool.all('SELECT * FROM does_not_exist')).rejects.toThrow();

    // The pool must still serve the next query.
    const rows = await DbQueryPool.all<{ count: number }>('SELECT COUNT(*) as count FROM game');
    expect(rows[0].count).toBe(3);
  });
});
