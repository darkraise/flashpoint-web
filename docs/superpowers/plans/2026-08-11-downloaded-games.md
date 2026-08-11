# Downloaded Games Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Downloaded games page, a downloaded filter on the browse pages, and
three admin settings controlling the page, guest access to it, and whether the
filter starts on.

**Architecture:** "Downloaded" means a `game_data` row with `presentOnDisk = 1`, so
the filter is a single SQL `EXISTS` clause. A reconciler service rebuilds that flag
from the ZIP files on disk to survive Launcher syncs and to backfill games that were
downloaded through the Play path, which previously never recorded anything. The
three settings are public boolean rows in the existing `features` settings category.

**Tech Stack:** Express + TypeScript + better-sqlite3 (backend, port 3100), React +
Vite + TanStack Query + Zustand + Tailwind (frontend), Zod for validation, Vitest for
tests on both sides.

**Spec:** `docs/superpowers/specs/2026-08-11-downloaded-games-design.md`

## Global Constraints

- No `any` types; use `unknown`, generics, or real interfaces.
- No non-null assertions (`!`); use `?? defaultValue` or explicit null checks.
- Use `??` not `||` for defaults.
- Throw `AppError`, not plain `Error`, from request paths.
- Every async Express handler is wrapped in `asyncHandler()`.
- Never write to `flashpoint.sqlite` except through `GameDatabaseUpdater`, which
  documents the deliberate exception at `backend/src/services/GameDatabaseUpdater.ts:19-25`.
- Frontend: `@/` imports, theme tokens (`text-muted-foreground`, not `text-gray-400`),
  `logger` not `console`, all API calls through `@/lib/api`.
- Fire-and-forget promises get a `.catch()`.
- Before each commit: `npx prettier --write <files>` then `npm run typecheck`.
- Backend tests: `cd backend && npx vitest run <file>`. Frontend tests:
  `cd frontend && npx vitest run <file>`.
- **Known pre-existing failure:** `frontend/src/components/auth/ProtectedRoute.test.tsx`
  fails all 13 tests on a clean checkout (zustand/localStorage in the test env). Do not
  try to fix it; do not treat it as caused by your change.

---

### Task 1: Backend search filter

**Files:**

- Modify: `backend/src/services/GameService.ts` (`GameSearchQuery` at line 5, `searchGames` WHERE-clause block around lines 390-470)
- Modify: `backend/src/services/GameSearchCache.ts:49-75` (`generateCacheKey`)
- Modify: `backend/src/routes/games.ts:28-50` (`searchBodySchema`), `:57-68` (logActivity filter list), `:84-105` (query pass-through)
- Test: `backend/src/services/GameService.downloaded.test.ts`

**Interfaces:**

- Consumes: nothing from earlier tasks.
- Produces: `GameSearchQuery.downloaded?: boolean` — `true` restricts results to games
  having a `game_data` row with `presentOnDisk = 1`; `false` and `undefined` both mean
  no restriction. Task 7 sends this field from the frontend.

- [ ] **Step 1: Write the failing test**

Create `backend/src/services/GameService.downloaded.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx vitest run src/services/GameService.downloaded.test.ts`
Expected: FAIL — the first test returns 2 games, because `downloaded` is ignored.

- [ ] **Step 3: Add the field to the query interface**

In `backend/src/services/GameService.ts`, inside `GameSearchQuery` after `library?: string;`:

```typescript
  /** true = only games with a game_data row where presentOnDisk = 1; false/undefined = no restriction */
  downloaded?: boolean;
```

- [ ] **Step 4: Add the SQL condition**

In `searchGames`, directly after the `if (query.library) { ... }` block:

```typescript
      if (query.downloaded === true) {
        sql += ` AND EXISTS (
          SELECT 1 FROM game_data gd
          WHERE gd.gameId = g.id AND gd.presentOnDisk = 1
        )`;
      }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && npx vitest run src/services/GameService.downloaded.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Include the field in the cache key**

In `backend/src/services/GameSearchCache.ts`, inside `generateCacheKey`'s
`normalizedQuery`, after the `library` line:

```typescript
      downloaded: query.downloaded ?? '',
```

`??` matters here: `||` would collapse `false` and `undefined` into the same key.

- [ ] **Step 7: Accept the field on the route**

In `backend/src/routes/games.ts`, add to `searchBodySchema` after the `library` line:

```typescript
  downloaded: z.boolean().optional(),
```

Add `'downloaded'` to the `filters` array in the `logActivity` callback, and pass it
through to `GameSearchCache.searchGames`:

```typescript
      downloaded: body.downloaded,
```

- [ ] **Step 8: Verify and commit**

```bash
cd backend && npx vitest run src/services/GameService.downloaded.test.ts
cd .. && npx prettier --write backend/src/services/GameService.ts backend/src/services/GameSearchCache.ts backend/src/routes/games.ts backend/src/services/GameService.downloaded.test.ts
npm run typecheck
git add backend/src
git commit -m "feat(games): filter search results by downloaded state"
```

---

### Task 2: Downloaded-aware filter options

Without this, the dropdowns on the Downloaded page list values from the whole
catalog and most selections return nothing.

**Files:**

- Modify: `backend/src/services/GameService.ts` (`FilterOptionsParams` at lines 86-98, `getFilterOptionsCacheKey` at lines 135-168, `buildFilterOptionsConditions` at lines 836+)
- Modify: `backend/src/routes/games.ts:113-129` (`filterOptionsQuerySchema`) and the params object it builds around line 148
- Test: `backend/src/services/GameService.downloaded.test.ts` (extend Task 1's file)

**Interfaces:**

- Consumes: Task 1's `downloaded` semantics.
- Produces: `FilterOptionsParams.downloaded?: boolean`, honoured by every
  `get*Options` method and by `getYearRange`.

- [ ] **Step 1: Write the failing test**

Append to `backend/src/services/GameService.downloaded.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx vitest run src/services/GameService.downloaded.test.ts`
Expected: FAIL — the first new test returns both series.

- [ ] **Step 3: Add the field and the shared condition**

In `FilterOptionsParams`, after `library?: string;`:

```typescript
  downloaded?: boolean;
```

In `buildFilterOptionsConditions`, after the `params?.library` block:

```typescript
    if (params?.downloaded === true) {
      // These queries select `FROM game` with no alias, and game_data has its own
      // `id` column, so the outer column must be qualified as game.id.
      conditions.push(
        'EXISTS (SELECT 1 FROM game_data gd WHERE gd.gameId = game.id AND gd.presentOnDisk = 1)'
      );
    }
```

- [ ] **Step 4: Add it to the options cache key**

In `getFilterOptionsCacheKey`, add `params?.downloaded === true` as another
`hasDynamicFilters` disjunct, add `downloaded: params?.downloaded ?? false` to the
dynamic key object, and extend the static key so the two populations never share an
entry:

```typescript
    return {
      key: `${params?.platform ?? ''}_${params?.library ?? ''}_${params?.downloaded === true ? 'dl' : ''}`,
      isDynamic: false,
    };
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && npx vitest run src/services/GameService.downloaded.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Accept the param on the route**

In `filterOptionsQuerySchema` add `downloaded: booleanSchema.optional(),` (the
`booleanSchema` preprocessor already defined at the top of the file handles the
`'false'` string correctly), and pass `downloaded: query.downloaded` into the params
object built for the service call.

- [ ] **Step 7: Verify and commit**

```bash
cd backend && npx vitest run src/services/GameService.downloaded.test.ts
cd .. && npx prettier --write backend/src/services/GameService.ts backend/src/routes/games.ts backend/src/services/GameService.downloaded.test.ts
npm run typecheck
git add backend/src
git commit -m "feat(games): narrow filter options to downloaded games"
```

---

### Task 3: Downloaded reconciler

Rebuilds `presentOnDisk` from the ZIPs actually on disk. This is what backfills
games downloaded through the Play path and what restores the flag after a Launcher
sync overwrites the local database copy.

**Files:**

- Create: `backend/src/services/DownloadedReconciler.ts`
- Modify: `backend/src/services/DatabaseService.ts` (add `noteSelfWrite`, call the reconciler at the end of `syncAndReload` around line 352)
- Modify: `backend/src/server.ts:246` (run once after `DatabaseService.initialize()`)
- Test: `backend/src/services/DownloadedReconciler.test.ts`

**Interfaces:**

- Consumes: `GameDataDownloader.getFilename(gameId, dateAdded)` from
  `backend/src/game/services/GameDataDownloader.ts:75`.
- Produces:
  - `DownloadedReconciler.reconcile(): Promise<{ scanned: number; marked: number }>`
  - `DatabaseService.noteSelfWrite(): void` — re-stats the source database and
    advances `lastModifiedTime` so the file watcher does not treat our own write as a
    Launcher change. Task 4 calls it.

- [ ] **Step 1: Write the failing test**

Create `backend/src/services/DownloadedReconciler.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx vitest run src/services/DownloadedReconciler.test.ts`
Expected: FAIL — cannot resolve `./DownloadedReconciler`.

- [ ] **Step 3: Implement the reconciler**

Create `backend/src/services/DownloadedReconciler.ts`:

```typescript
import fs from 'fs/promises';
import path from 'path';
import { config } from '../config';
import { logger } from '../utils/logger';
import { DatabaseService } from './DatabaseService';

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
      logger.warn(
        { error, path: config.flashpointGamesPath },
        '[DownloadedReconciler] Games directory unreadable, skipping reconciliation'
      );
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

    logger.info(
      { scanned: files.length, marked: toMark.length },
      '[DownloadedReconciler] Reconciled downloaded game data'
    );

    return { scanned: files.length, marked: toMark.length };
  }
}
```

- [ ] **Step 4: Add `noteSelfWrite` to DatabaseService**

In `backend/src/services/DatabaseService.ts`, add a public static method near
`syncAndReload`:

```typescript
  /**
   * Record that this process just wrote to the database, so the file watcher does not
   * mistake our own write for a Launcher change and trigger a full reload plus cache flush.
   */
  static noteSelfWrite(): void {
    try {
      const stats = fs.statSync(this.sourceDbPath);
      if (stats.mtimeMs > this.lastModifiedTime) {
        this.lastModifiedTime = stats.mtimeMs;
      }
    } catch (error: unknown) {
      logger.debug('[DatabaseService] Could not stat source database after self-write:', error);
    }
  }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && npx vitest run src/services/DownloadedReconciler.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Wire the reconciler into startup and sync**

In `backend/src/server.ts`, immediately after `await DatabaseService.initialize();`:

```typescript
    DownloadedReconciler.reconcile().catch((error: unknown) =>
      logger.error('[Startup] Downloaded reconciliation failed:', error)
    );
```

with `import { DownloadedReconciler } from './services/DownloadedReconciler';` added
to the imports.

In `DatabaseService.syncAndReload`, after the cache invalidation block (the
`logger.info('Database reloaded, caches invalidated')` line), re-run reconciliation
because a local-copy sync overwrites our flags. Use a lazy `require` to match the
existing cycle-avoidance pattern used for `GameSearchCache` in this file:

```typescript
      const { DownloadedReconciler } = require('./DownloadedReconciler') as {
        DownloadedReconciler: { reconcile: () => Promise<{ scanned: number; marked: number }> };
      };
      DownloadedReconciler.reconcile().catch((error: unknown) =>
        logger.error('[DatabaseService] Post-sync reconciliation failed:', error)
      );
```

- [ ] **Step 7: Verify and commit**

```bash
cd backend && npx vitest run src/services/DownloadedReconciler.test.ts
cd .. && npx prettier --write backend/src/services/DownloadedReconciler.ts backend/src/services/DownloadedReconciler.test.ts backend/src/services/DatabaseService.ts backend/src/server.ts
npm run typecheck
git add backend/src
git commit -m "feat(games): reconcile downloaded state from disk"
```

---

### Task 4: Mark downloads from the Play path

**Files:**

- Modify: `backend/src/game/gamezipserver.ts` (`mountZip` params at lines 57-64, the `downloadAndMountInBackground` signature at line 328 and its call site at line 152, the success block at lines 364-386)
- Modify: `backend/src/services/GameDataService.ts:92-98` (pass the id into `mountZip`)

**Interfaces:**

- Consumes: `GameDatabaseUpdater.markAsDownloaded(gameDataId: number, filePath: string): Promise<GameData>`, `DatabaseService.noteSelfWrite()` from Task 3.
- Produces: no new exports; the Play path now records `presentOnDisk = 1`.

- [ ] **Step 1: Thread the game_data id through the mount call**

`GameDataService.getGameDataEntry` already selects `id`, so no extra query is needed.
In `backend/src/services/GameDataService.ts`, extend the `mountZip` call:

```typescript
      const result = await gameZipServer.mountZip({
        id: mountId,
        zipPath,
        gameId: gameDataEntry?.gameId ?? gameId,
        dateAdded: gameDataEntry?.dateAdded,
        sha256: gameDataEntry?.sha256,
        gameDataId: gameDataEntry?.id,
      });
```

In `backend/src/game/gamezipserver.ts`, add `gameDataId?: number;` to the `mountZip`
params type, destructure it, and pass it as a new trailing argument to
`downloadAndMountInBackground` (add `gameDataId: number | undefined` as the last
parameter of that method).

- [ ] **Step 2: Mark the row on successful download**

In `downloadAndMountInBackground`, inside `if (result.success && result.filePath)`,
after the successful `zipManager.mount(...)` and `DownloadRegistry.complete(gameId)`
calls:

```typescript
          if (gameDataId !== undefined) {
            try {
              await GameDatabaseUpdater.markAsDownloaded(gameDataId, result.filePath);
              DatabaseService.noteSelfWrite();
              GameSearchCache.clearCache();
              GameService.clearFilterOptionsCache();
            } catch (error: unknown) {
              // A failed flag update must not fail the download: the game is mounted and
              // playable, and the reconciler will mark it on the next run.
              logger.warn(
                `[GameZipServer] Could not record downloaded state for ${gameId}: ${
                  error instanceof Error ? error.message : 'unknown error'
                }`
              );
            }
          }
```

Add the four imports at the top of the file
(`GameDatabaseUpdater`, `DatabaseService`, `GameSearchCache`, `GameService` — all from
`../services/...`). The file already imports from `../services`, so this introduces no
cycle.

Note the checksum caveat: `GameDataDownloader` only verifies SHA-256 when the
`game_data` row carries one. We mark regardless, because the ZIP mounted successfully,
which is a stronger signal than an absent checksum.

- [ ] **Step 3: Verify the whole backend still compiles and tests pass**

```bash
npm run typecheck
cd backend && npx vitest run
```

Expected: typecheck clean; the backend suite passes.

- [ ] **Step 4: Commit**

```bash
cd .. && npx prettier --write backend/src/game/gamezipserver.ts backend/src/services/GameDataService.ts
git add backend/src
git commit -m "fix(games): record downloaded state after play-path download"
```

---

### Task 5: Settings plumbing

**Files:**

- Create: `backend/src/migrations/004_downloaded_settings.sql`
- Modify: `frontend/src/types/settings.ts:12-21` (`FeatureSettings`)
- Modify: `frontend/src/hooks/useFeatureFlags.ts`
- Modify: `frontend/src/components/settings/FeaturesSettingsTab.tsx`

**Interfaces:**

- Produces, from `useFeatureFlags()`:
  - `enableDownloadedPage: boolean` — admin bypass applies, defaults true.
  - `enableDownloadedPageForGuests: boolean` — no bypass, defaults false.
  - `enableDownloadedFilterDefault: boolean` — no bypass, defaults false.
  Tasks 7 and 8 consume all three.

- [ ] **Step 1: Write the migration**

Create `backend/src/migrations/004_downloaded_settings.sql`:

```sql
-- ===================================
-- Migration 004: Downloaded games page and filter settings
-- ===================================

INSERT OR IGNORE INTO system_settings (key, value, data_type, category, description, is_public, default_value, validation_schema)
VALUES
  ('features.enable_downloaded_page', '1', 'boolean', 'features', 'Show the Downloaded games page', 1, '1', '{"type":"boolean"}'),
  ('features.enable_downloaded_page_for_guests', '0', 'boolean', 'features', 'Allow guests to see the Downloaded games page', 1, '0', '{"type":"boolean"}'),
  ('features.enable_downloaded_filter_default', '0', 'boolean', 'features', 'Turn the downloaded filter on by default when browsing', 1, '0', '{"type":"boolean"}');
```

`SystemSettingsService` maps `enable_downloaded_page` to `enableDownloadedPage`
automatically via its `snakeToCamel`/`camelToSnake` helpers, so no service change is
needed.

- [ ] **Step 2: Extend the frontend settings type**

In `frontend/src/types/settings.ts`, add to `FeatureSettings`:

```typescript
  enableDownloadedPage: boolean;
  enableDownloadedPageForGuests: boolean;
  enableDownloadedFilterDefault: boolean;
```

- [ ] **Step 3: Expose the flags**

In `frontend/src/hooks/useFeatureFlags.ts`, add to the returned object:

```typescript
    enableDownloadedPage: isAdmin || (features.enableDownloadedPage ?? true),
    // Default-off flags are read strictly: the `?? true` fallback used above would
    // invert them while public settings are still loading or if the key is missing.
    enableDownloadedPageForGuests: features.enableDownloadedPageForGuests === true,
    enableDownloadedFilterDefault: features.enableDownloadedFilterDefault === true,
```

- [ ] **Step 4: Add the three switches**

In `frontend/src/components/settings/FeaturesSettingsTab.tsx`, after the existing
"I'm Feeling Lucky" block, add the page switch, then the guest switch rendered only
when the page flag is on, then the default switch:

```tsx
            {/* Downloaded page */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enable-downloaded-page" className="text-base">
                  Enable Downloaded Page
                </Label>
                <p className="text-sm text-muted-foreground">
                  Show a page listing only games whose files are downloaded.
                </p>
              </div>
              <Switch
                id="enable-downloaded-page"
                checked={featureSettings.enableDownloadedPage !== false}
                onCheckedChange={(checked: boolean) => {
                  updateSystemSettings.mutate({
                    category: 'features',
                    settings: { enableDownloadedPage: checked },
                  });
                }}
                disabled={updateSystemSettings.isPending}
              />
            </div>

            {featureSettings.enableDownloadedPage !== false ? (
              <div className="flex items-center justify-between pl-6 border-l-2 border-border">
                <div className="space-y-0.5">
                  <Label htmlFor="enable-downloaded-page-guests" className="text-base">
                    Show Downloaded Page To Guests
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Let signed-out guests open the Downloaded page.
                  </p>
                </div>
                <Switch
                  id="enable-downloaded-page-guests"
                  checked={featureSettings.enableDownloadedPageForGuests === true}
                  onCheckedChange={(checked: boolean) => {
                    updateSystemSettings.mutate({
                      category: 'features',
                      settings: { enableDownloadedPageForGuests: checked },
                    });
                  }}
                  disabled={updateSystemSettings.isPending}
                />
              </div>
            ) : null}

            {/* Downloaded filter default */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enable-downloaded-filter-default" className="text-base">
                  Filter To Downloaded By Default
                </Label>
                <p className="text-sm text-muted-foreground">
                  Browse pages start with the downloaded filter on. This one also applies to
                  admins; anyone can still switch it off per page.
                </p>
              </div>
              <Switch
                id="enable-downloaded-filter-default"
                checked={featureSettings.enableDownloadedFilterDefault === true}
                onCheckedChange={(checked: boolean) => {
                  updateSystemSettings.mutate({
                    category: 'features',
                    settings: { enableDownloadedFilterDefault: checked },
                  });
                }}
                disabled={updateSystemSettings.isPending}
              />
            </div>
```

- [ ] **Step 5: Verify the migration applies**

```bash
cd backend && npm run dev
```

Watch for `[UserDB] Running migration: 004_downloaded_settings` in the log, then stop
the server with Ctrl+C. Confirm the process is gone before continuing.

- [ ] **Step 6: Commit**

```bash
npx prettier --write frontend/src/types/settings.ts frontend/src/hooks/useFeatureFlags.ts frontend/src/components/settings/FeaturesSettingsTab.tsx
npm run typecheck
git add backend/src/migrations frontend/src
git commit -m "feat(settings): add downloaded page and filter settings"
```

---

### Task 6: Tri-state URL parameter

**Files:**

- Modify: `frontend/src/lib/filterUrlCompression.ts` (`FilterUrlParams` at lines 6-21, `CATEGORY_TO_ABBR` at lines 24-34, `toUrlSafeFormat` at lines 92-111, `fromUrlSafeFormat` at lines 116-173, `parseFilterParams` legacy branch at lines 355-370, `hasLegacyParams` at lines 403-418)
- Test: `frontend/src/lib/filterUrlCompression.test.ts`

**Interfaces:**

- Produces: `FilterUrlParams.downloaded?: '0' | '1'` encoded under the key `w`.
  `'1'` on, `'0'` off, absent means "use the admin default". Task 7 resolves it.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/lib/filterUrlCompression.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  buildFilterSearchParams,
  parseFilterParams,
  compressFilters,
  decompressFilters,
} from './filterUrlCompression';

describe('downloaded filter URL round-trip', () => {
  it('round-trips an explicit on', () => {
    const encoded = compressFilters({ downloaded: '1' });
    expect(encoded).not.toBeNull();
    expect(decompressFilters(encoded ?? '')?.downloaded).toBe('1');
  });

  it('round-trips an explicit off rather than dropping it', () => {
    const encoded = compressFilters({ downloaded: '0' });
    expect(encoded).not.toBeNull();
    expect(decompressFilters(encoded ?? '')?.downloaded).toBe('0');
  });

  it('survives buildFilterSearchParams and parseFilterParams', () => {
    const params = buildFilterSearchParams({ downloaded: '0', search: 'sonic' });
    const parsed = parseFilterParams(params);
    expect(parsed.downloaded).toBe('0');
    expect(parsed.search).toBe('sonic');
  });

  it('leaves downloaded undefined when absent', () => {
    const parsed = parseFilterParams(new URLSearchParams());
    expect(parsed.downloaded).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/lib/filterUrlCompression.test.ts`
Expected: FAIL — `downloaded` is not a known param, so it is dropped.

- [ ] **Step 3: Implement the encoding**

In `frontend/src/lib/filterUrlCompression.ts`:

Add to `FilterUrlParams`:

```typescript
  /** '1' = downloaded only, '0' = explicitly off, undefined = use the admin default */
  downloaded?: '0' | '1';
```

Add to `CATEGORY_TO_ABBR`:

```typescript
  Downloaded: 'W',
```

In `toUrlSafeFormat`, before the `fo` line — note the `!== undefined` guard, since a
truthiness check would silently drop `'0'`:

```typescript
  if (params.downloaded !== undefined) parts.push(`w.${params.downloaded}`);
```

In `fromUrlSafeFormat`'s switch:

```typescript
        case 'w':
          if (value === '0' || value === '1') params.downloaded = value;
          break;
```

In the legacy branch of `parseFilterParams`, add:

```typescript
    downloaded: searchParams.get('downloaded') === '1'
      ? '1'
      : searchParams.get('downloaded') === '0'
        ? '0'
        : undefined,
```

and add `'downloaded'` to the `legacyKeys` array in `hasLegacyParams`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/lib/filterUrlCompression.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
cd .. && npx prettier --write frontend/src/lib/filterUrlCompression.ts frontend/src/lib/filterUrlCompression.test.ts
npm run typecheck
git add frontend/src/lib
git commit -m "feat(filters): encode downloaded filter in the URL"
```

---

### Task 7: Filter UI and default resolution

**Files:**

- Modify: `frontend/src/types/game.ts:48-66` (`GameFilters`)
- Modify: `frontend/src/lib/api/games.ts:11-38` (search POST body) and `:39-57` (`getFilterOptions` params type)
- Modify: `frontend/src/hooks/useFilterOptions.ts:6-18` (`FilterOptionsParams`)
- Modify: `frontend/src/components/library/GameBrowseLayout.tsx` (filters memo lines 70-89, filterOptionsParams lines 93-108, chips memo lines 164-294, `handleRemoveChip` lines 306-360, `handleRemoveWithChildren` lines 363-399, `handleClearAllFilters` lines 401-407)
- Modify: `frontend/src/components/search/FilterPanel.tsx` (props at lines 17-32, desktop row at lines 224-233, mobile row at lines 236-246)

**Interfaces:**

- Consumes: `FilterUrlParams.downloaded` (Task 6), `enableDownloadedFilterDefault`
  (Task 5), `GameSearchQuery.downloaded` (Task 1).
- Produces: `GameBrowseLayoutProps.library?: 'arcade' | 'theatre'` and
  `GameBrowseLayoutProps.forceDownloaded?: boolean`, both consumed by Task 8.

- [ ] **Step 1: Add the field to the API layer**

In `frontend/src/types/game.ts`, add to `GameFilters`:

```typescript
  downloaded?: boolean;
```

In `frontend/src/lib/api/games.ts`, add to the `body` object inside `search`, directly
after the `library` line:

```typescript
      downloaded: filters.downloaded,
```

and add `downloaded?: boolean;` to the inline params type of `getFilterOptions`, which
already forwards the whole object as query params.

In `frontend/src/hooks/useFilterOptions.ts`, add `downloaded?: boolean;` to
`FilterOptionsParams` after `library?: string;`. The hook builds its query key from
this object, so the new field participates in cache invalidation automatically.

- [ ] **Step 2: Resolve the tri-state in GameBrowseLayout**

Add the props and resolution:

```tsx
interface GameBrowseLayoutProps {
  title: string;
  library?: 'arcade' | 'theatre';
  platform?: string;
  headerContent?: ReactNode;
  breadcrumbContext?: BreadcrumbContext;
  sectionKey?: string | null;
  /** Pin the downloaded filter on and hide its switch (used by the Downloaded page) */
  forceDownloaded?: boolean;
}
```

```tsx
  const { enableDownloadedFilterDefault } = useFeatureFlags();

  const downloaded = useMemo(() => {
    if (forceDownloaded) return true;
    if (urlParams.downloaded === '1') return true;
    if (urlParams.downloaded === '0') return false;
    return enableDownloadedFilterDefault;
  }, [forceDownloaded, urlParams.downloaded, enableDownloadedFilterDefault]);
```

Add `downloaded: downloaded ? true : undefined` to the `filters` memo (and its
dependency array) and `downloaded: filters.downloaded` to `filterOptionsParams`.
Sending `undefined` rather than `false` keeps the request body and the backend cache
key clean.

- [ ] **Step 3: Add the chip**

In the `filterChips` memo, after the platform chip:

```tsx
    if (filters.downloaded && !forceDownloaded) {
      chips.push({
        id: 'downloaded',
        label: 'Downloaded',
        value: 'Downloaded only',
        category: 'Downloaded',
        order: getOrder('Downloaded'),
      });
    }
```

Add `forceDownloaded` to the memo's dependency array.

- [ ] **Step 4: Make removal write an explicit off**

This is the critical case: when the admin default is on, clearing the param means
"use the default", which immediately re-applies the filter. In `handleRemoveChip`,
alongside the existing `chipId === 'platform'` branch:

```tsx
      } else if (chipId === 'downloaded') {
        // Clearing the param would fall back to the admin default and re-apply the
        // filter, so an explicit off is required when the default is on.
        newParams.downloaded = enableDownloadedFilterDefault ? '0' : undefined;
        categoryRemoved = 'Downloaded';
```

Add `Downloaded: ['downloaded']` to `categoryToParamKeys` in
`handleRemoveWithChildren`, and after that function's param-clearing loop:

```tsx
      if (categoriesToRemove.includes('Downloaded') && enableDownloadedFilterDefault) {
        newParams.downloaded = '0';
      }
```

In `handleClearAllFilters`:

```tsx
  const handleClearAllFilters = useCallback(() => {
    const newParams: FilterUrlParams = {
      sortBy: urlParams.sortBy,
      sortOrder: urlParams.sortOrder,
      downloaded: enableDownloadedFilterDefault ? '0' : undefined,
    };
    setSearchParams(buildFilterSearchParams(newParams));
  }, [urlParams.sortBy, urlParams.sortOrder, enableDownloadedFilterDefault, setSearchParams]);
```

Add `enableDownloadedFilterDefault` to the dependency arrays of the two callbacks
above as well.

- [ ] **Step 5: Add the switch to the filter panel**

In `FilterPanel`, add two props:

```tsx
  /** Current resolved value of the downloaded filter */
  downloaded?: boolean;
  /** Hide the downloaded switch (the Downloaded page pins it on) */
  showDownloadedFilter?: boolean;
```

Default `showDownloadedFilter = true`, and render this beside `YearRangeFilter` in
both the desktop and mobile rows (give the two instances distinct ids):

```tsx
            {showDownloadedFilter ? (
              <div className="flex items-center gap-2">
                <Switch
                  id="downloaded-filter-desktop"
                  checked={downloaded === true}
                  onCheckedChange={(checked: boolean) => {
                    const newParams: FilterUrlParams = {
                      ...urlParams,
                      downloaded: checked ? '1' : '0',
                      page: undefined,
                      fo: getUpdatedFilterOrder(urlParams.fo, 'Downloaded', checked ? 'add' : 'remove'),
                    };
                    setSearchParams(buildFilterSearchParams(newParams));
                  }}
                />
                <Label htmlFor="downloaded-filter-desktop" className="text-sm whitespace-nowrap">
                  Downloaded only
                </Label>
              </div>
            ) : null}
```

Always write an explicit `'1'` or `'0'` here — never clear the key — so the control
reflects the user's choice rather than snapping back to the admin default. Import
`Switch` from `@/components/ui/switch` and `Label` from `@/components/ui/label`.

Pass both new props from `GameBrowseLayout`:

```tsx
          downloaded={downloaded}
          showDownloadedFilter={!forceDownloaded}
```

- [ ] **Step 6: Verify manually**

```bash
npm run dev
```

Open `http://localhost:5173/browse`. Confirm: the switch turns the filter on and the
result count drops; the chip appears; removing the chip turns it off; with
`Filter To Downloaded By Default` enabled in Settings, removing the chip still turns
the filter off and Clear All does not re-apply it. Stop the dev server with Ctrl+C and
confirm the processes are gone.

- [ ] **Step 7: Commit**

```bash
npx prettier --write frontend/src/types/game.ts frontend/src/lib/api/games.ts frontend/src/components/library/GameBrowseLayout.tsx frontend/src/components/search/FilterPanel.tsx
npm run typecheck
git add frontend/src
git commit -m "feat(filters): add downloaded filter to browse pages"
```

---

### Task 8: Downloaded page, route, and sidebar

**Files:**

- Create: `frontend/src/views/DownloadedView.tsx`
- Modify: `frontend/src/App.tsx` (lazy import block and the route list near `/favorites` at line 439)
- Modify: `frontend/src/components/auth/ProtectedRoute.tsx:7-17` (props), `:67-79` (feature check)
- Modify: `frontend/src/components/layout/Sidebar.tsx:48` (flags), `:78-86` (library items), `:179-190` (section gate)

**Interfaces:**

- Consumes: `GameBrowseLayout` props from Task 7, the three flags from Task 5.
- Produces: route `/downloaded`; `ProtectedRouteProps.requireFeatureForGuests?: 'enableDownloadedPageForGuests'`.

- [ ] **Step 1: Create the view**

Create `frontend/src/views/DownloadedView.tsx`:

```tsx
import { GameBrowseLayout } from '@/components/library/GameBrowseLayout';

export function DownloadedView() {
  return (
    <GameBrowseLayout
      title="Downloaded"
      forceDownloaded
      sectionKey={null}
      breadcrumbContext={{ label: 'Downloaded', href: '/downloaded' }}
    />
  );
}
```

`BreadcrumbContext` is `{ label: string; href: string; icon?: SectionIcon; parent?: BreadcrumbContext }`
(`frontend/src/components/common/Breadcrumbs.tsx:6-12`) — the key is `href`, not `path`.

- [ ] **Step 2: Extend ProtectedRoute for guests**

Guests satisfy `requireAuth`, so a feature flag alone does not keep them out. Add to
`ProtectedRouteProps`:

```typescript
  requireFeature?:
    | 'enablePlaylists'
    | 'enableFavorites'
    | 'enableStatistics'
    | 'enableDownloadedPage';
  /** Checked only when the viewer is a guest; the named flag must be true */
  requireFeatureForGuests?: 'enableDownloadedPageForGuests';
```

Destructure `requireFeatureForGuests` and add the check immediately after the existing
`requireFeature` block:

```tsx
  if (requireFeatureForGuests && isGuest && !featureFlags[requireFeatureForGuests]) {
    return (
      <Navigate
        to="/unauthorized"
        state={{ requiredFeature: requireFeatureForGuests, fromPath: location.pathname }}
        replace
      />
    );
  }
```

- [ ] **Step 3: Register the route**

In `frontend/src/App.tsx`, add the lazy import next to the other views:

```tsx
const DownloadedView = lazy(() =>
  import('@/views/DownloadedView').then((m) => ({ default: m.DownloadedView }))
);
```

Match the exact lazy-import style already used in the file. Add the route beside
`/favorites`:

```tsx
            <Route
              path="/downloaded"
              element={
                <ProtectedRoute
                  requireFeature="enableDownloadedPage"
                  requireFeatureForGuests="enableDownloadedPageForGuests"
                >
                  <Suspense fallback={<RouteLoadingFallback />}>
                    <DownloadedView />
                  </Suspense>
                </ProtectedRoute>
              }
            />
```

- [ ] **Step 4: Add the sidebar entry without leaking the others**

The Library block is currently hidden wholesale for guests, so its items never check
guest status themselves. Give each item its own predicate before relaxing the block. In
`Sidebar.tsx`, extend the flags destructure with `enableDownloadedPage` and
`enableDownloadedPageForGuests`, then:

```tsx
  const libraryNavItems: NavItem[] = [
    enableDownloadedPage &&
      (!isGuest || enableDownloadedPageForGuests) && {
        path: '/downloaded',
        icon: HardDriveDownload,
        label: 'Downloaded',
      },
    !isGuest && enableFavorites && { path: '/favorites', icon: Heart, label: 'Favorites' },
    !isGuest && enablePlaylists && { path: '/playlists', icon: ListVideo, label: 'My Playlists' },
    !isGuest &&
      enablePlaylists && {
        path: '/flashpoint-playlists',
        icon: ListIcon,
        label: 'Flashpoint Playlists',
      },
  ].filter((item): item is Exclude<typeof item, false> => Boolean(item));
```

Import `HardDriveDownload` from `lucide-react`. Change the section gate from
`!isGuest && libraryNavItems.length > 0` to `libraryNavItems.length > 0`, since each
item now carries its own guest rule.

- [ ] **Step 5: Verify manually**

```bash
npm run dev
```

Check, stopping the server afterwards with Ctrl+C:

1. `/downloaded` lists only downloaded games and shows no downloaded switch.
2. Turning off `Enable Downloaded Page` hides the sidebar entry for a non-admin and
   redirects `/downloaded` to `/unauthorized`.
3. As a guest with the guest flag off, the entry is hidden and `/downloaded`
   redirects; with it on, both work, and Favorites and Playlists stay hidden.

- [ ] **Step 6: Commit**

```bash
npx prettier --write frontend/src/views/DownloadedView.tsx frontend/src/App.tsx frontend/src/components/auth/ProtectedRoute.tsx frontend/src/components/layout/Sidebar.tsx
npm run typecheck
git add frontend/src
git commit -m "feat(games): add downloaded games page"
```

---

### Task 9: Documentation

**Files:**

- Modify: `docs/06-api-reference/games-api.md`
- Modify: `docs/06-api-reference/settings-api.md`
- Modify: `docs/10-features/02-game-browsing-filtering.md`

- [ ] **Step 1: Document the API parameter**

In `docs/06-api-reference/games-api.md`, add `downloaded` (boolean, optional) to both
the search request body table and the filter-options query table, described as
"restrict to games whose data is present on disk".

- [ ] **Step 2: Document the settings**

In `docs/06-api-reference/settings-api.md`, add three rows to the settings table:

```markdown
| features | enableDownloadedPage           | boolean | true           | -                                      |
| features | enableDownloadedPageForGuests  | boolean | false          | -                                      |
| features | enableDownloadedFilterDefault  | boolean | false          | -                                      |
```

- [ ] **Step 3: Document the feature**

In `docs/10-features/02-game-browsing-filtering.md`, add a short section covering the
Downloaded page, the filter, the tri-state URL parameter, and the two limitations from
the spec: games with no `game_data` rows never appear, and the reconciler only ever
sets the flag, never clears it.

- [ ] **Step 4: Commit**

```bash
npx prettier --write docs/06-api-reference/games-api.md docs/06-api-reference/settings-api.md docs/10-features/02-game-browsing-filtering.md
git add docs
git commit -m "docs: document downloaded games page and filter"
```

---

## Final verification

- [ ] `npm run typecheck` passes.
- [ ] `cd backend && npx vitest run` passes.
- [ ] `cd frontend && npx vitest run src/lib/filterUrlCompression.test.ts` passes
      (the pre-existing `ProtectedRoute.test.tsx` failures remain; they are unrelated).
- [ ] `npm run build` succeeds.
- [ ] No dev servers or watchers left running.
