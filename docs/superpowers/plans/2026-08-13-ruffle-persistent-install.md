# Persistent Ruffle Installation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Implementer assignments:** each task names its implementer agent in an
> `**Implementer:**` line. When executing with
> superpowers:subagent-driven-development, REQUIRED SUB-SKILL:
> dcc-superpower-companions:dispatching-tiered-implementers. Under
> superpowers:executing-plans these lines are inert; ignore them.

**Goal:** A Ruffle version installed through Settings → Update survives container recreation.

**Architecture:** Ruffle installs into `/app/data/ruffle`, which sits on the already-mounted data volume, instead of `/app/frontend/dist/ruffle`, which lives in the container's throwaway writable layer. A fresh volume is seeded from the copy baked into the image, so Flash works immediately and offline. Express serves the persisted directory at `/ruffle`, ahead of the dist handler and with cache headers that let an updated loader actually reach browsers.

**Tech Stack:** Express + TypeScript, vitest + supertest, Docker Compose.

**Spec:** `docs/superpowers/specs/2026-08-13-ruffle-persistent-install-design.md`

## Global Constraints

- Backend tests run from the `backend/` directory with `npx vitest run`. Do **not** use `npm test` from the repository root — it enters watch mode and hangs.
- Never introduce `any` types or non-null assertions (`!`). Use `??` for defaults, never `||`.
- Use `logger` from `../utils/logger`, never `console`.
- Run `npx prettier --write <files>` on every changed file before committing.
- The environment variable name is exactly `RUFFLE_DATA_PATH`. The production default is exactly `/app/data/ruffle`.
- `config.ruffleDataPath` is the install directory itself, not its parent. `path.join(config.ruffleDataPath, 'ruffle')` is always wrong.
- Ruffle's content-hashed files are detected by a hex run of **16 or more** characters in the basename (`core.ruffle.4ca82b563e9711217164.js`, `f2a570ccf4468b20d95a.wasm`). Everything else — `ruffle.js`, `ruffle.js.map`, `package.json` — is stable-named and must revalidate.
- Do not delete `frontend/public/ruffle/`. It is the seed source, and Vite serves it in development.
- Do not add a release-note entry to `docs/09-deployment/upgrade-guide.md`. That file gains a version heading only when a release is cut, and inventing a version number here would be wrong.

---

### Task 1: Persisted install path

**Files:**

- Modify: `backend/src/config.ts:118-119`
- Modify: `backend/src/services/RuffleService.ts:41-52`
- Test: `backend/src/services/RuffleService.test.ts:7,78-85,124-126,138-157`

**Interfaces:**

- Consumes: nothing.
- Produces: `config.ruffleDataPath: string` — the absolute directory Ruffle is installed into. `RuffleService` gains a private `installPath` (the install target) and a private `bundledPath` (the image's baked copy at `<frontendDistPath>/ruffle`), both read by Task 2.

**Implementer:** dcc-superpower-companions:impl-sonnet-max
**Evaluation:** files 1 - spec 0 - coupling 2 - risk 2 = 5

- [ ] **Step 1: Add the config value**

In `backend/src/config.ts`, find this block:

```typescript
  // __dirname is backend/dist at runtime, so this resolves to the frontend build
  // copied next to the backend in the image (/app/frontend/dist).
  frontendDistPath:
    process.env.FRONTEND_DIST_PATH ?? path.resolve(__dirname, '../../frontend/dist'),
```

Insert directly after it:

```typescript
  // Ruffle installs here rather than under the served frontend build. That build
  // is part of the image, so it lives in the container's writable layer and an
  // in-app update was discarded whenever the container was recreated.
  ruffleDataPath:
    process.env.RUFFLE_DATA_PATH ??
    (process.env.NODE_ENV === 'production'
      ? '/app/data/ruffle'
      : path.resolve(__dirname, '../data/ruffle')),
```

- [ ] **Step 2: Update the test fixtures to a separate data directory**

In `backend/src/services/RuffleService.test.ts`, change the declaration on line 7:

```typescript
let distDir: string;
```

to:

```typescript
let distDir: string;
let dataDir: string;
```

Replace the config mock (lines 78-85):

```typescript
vi.mock('../config', () => ({
  config: {
    serveFrontend: true,
    get frontendDistPath() {
      return distDir;
    },
  },
}));
```

with:

```typescript
vi.mock('../config', () => ({
  config: {
    serveFrontend: true,
    get frontendDistPath() {
      return distDir;
    },
    get ruffleDataPath() {
      return nodePath.join(dataDir, 'ruffle');
    },
  },
}));
```

Replace the `ruffleDir` helper (lines 124-126):

```typescript
function ruffleDir(): string {
  return nodePath.join(distDir, 'ruffle');
}
```

with:

```typescript
function ruffleDir(): string {
  return nodePath.join(dataDir, 'ruffle');
}
```

In `beforeEach`, replace the single `distDir` assignment:

```typescript
  distDir = nodeFs.mkdtempSync(nodePath.join(os.tmpdir(), 'fp-ruffle-'));
```

with:

```typescript
  distDir = nodeFs.mkdtempSync(nodePath.join(os.tmpdir(), 'fp-ruffle-dist-'));
  dataDir = nodeFs.mkdtempSync(nodePath.join(os.tmpdir(), 'fp-ruffle-data-'));
```

In `afterEach`, replace:

```typescript
  nodeFs.rmSync(distDir, { recursive: true, force: true });
```

with:

```typescript
  nodeFs.rmSync(distDir, { recursive: true, force: true });
  nodeFs.rmSync(dataDir, { recursive: true, force: true });
```

- [ ] **Step 3: Run the tests to verify they fail**

Run from `backend/`: `npx vitest run src/services/RuffleService.test.ts`

Expected: FAIL. The suite now asserts against `dataDir/ruffle` while the service still installs into `distDir/ruffle`, so assertions such as `expect(nodeFs.readFileSync(nodePath.join(ruffleDir(), 'ruffle.js'), 'utf-8')).toBe('new build')` throw ENOENT.

- [ ] **Step 4: Point the service at the persisted path**

In `backend/src/services/RuffleService.ts`, replace the field declaration and constructor (lines 41-52):

```typescript
  private readonly frontendPublicPath: string;
  private readonly githubApiUrl = 'https://api.github.com/repos/ruffle-rs/ruffle/releases';

  constructor() {
    // Install into the directory that is actually served. In a built deployment
    // that is the frontend's dist output; in development Vite serves public/.
    // Pointing at public/ in a container made every fresh start re-download
    // Ruffle even though the image already ships it in dist/.
    this.frontendPublicPath = config.serveFrontend
      ? path.join(config.frontendDistPath, 'ruffle')
      : path.resolve(__dirname, '../../../frontend/public/ruffle');
  }
```

with:

```typescript
  private readonly installPath: string;
  private readonly bundledPath: string;
  private readonly githubApiUrl = 'https://api.github.com/repos/ruffle-rs/ruffle/releases';

  constructor() {
    // A built deployment installs onto the mounted data volume and serves it
    // from there: the frontend build is part of the image, so anything written
    // into it is discarded when the container is recreated. In development Vite
    // serves public/, which is the only directory reachable there.
    this.installPath = config.serveFrontend
      ? config.ruffleDataPath
      : path.resolve(__dirname, '../../../frontend/public/ruffle');
    this.bundledPath = path.join(config.frontendDistPath, 'ruffle');
  }
```

Then rename the remaining nine references. Every other occurrence of `this.frontendPublicPath` in the file becomes `this.installPath` — lines 81, 447, 495, 520, 526, 527, 532, 546, and 576. A whole-word replace of `frontendPublicPath` with `installPath` across the file is exact; there are no other matches.

- [ ] **Step 5: Run the tests to verify they pass**

Run from `backend/`: `npx vitest run src/services/RuffleService.test.ts`

Expected: PASS, all existing cases green. They now exercise install, backup, rollback, and the rename/copy fallbacks against the persisted directory.

- [ ] **Step 6: Typecheck**

Run from the repository root: `npm run typecheck`

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
npx prettier --write backend/src/config.ts backend/src/services/RuffleService.ts backend/src/services/RuffleService.test.ts
git add backend/src/config.ts backend/src/services/RuffleService.ts backend/src/services/RuffleService.test.ts
git commit -m "fix(ruffle): install onto the persisted data volume"
```

---

### Task 2: Seed a fresh volume from the bundled copy

**Files:**

- Modify: `backend/src/services/RuffleService.ts` (add two methods after `verifyInstallation`)
- Modify: `backend/src/server.ts:296-314`
- Test: `backend/src/services/RuffleService.test.ts` (append a new `describe` block)

**Interfaces:**

- Consumes: `this.installPath` and `this.bundledPath` from Task 1; the existing private `copyDirectory(source: string, target: string): void`.
- Produces: `RuffleService.ensureInstalled(): Promise<'present' | 'seeded' | 'downloaded'>`, called by `backend/src/server.ts`.

**Implementer:** dcc-superpower-companions:impl-sonnet-xhigh
**Evaluation:** files 1 - spec 0 - coupling 2 - risk 1 = 4

- [ ] **Step 1: Write the failing tests**

Append to `backend/src/services/RuffleService.test.ts`:

```typescript
function installBundledRuffle(): void {
  const bundled = nodePath.join(distDir, 'ruffle');
  nodeFs.mkdirSync(bundled, { recursive: true });
  nodeFs.writeFileSync(nodePath.join(bundled, 'ruffle.js'), 'bundled build');
  nodeFs.writeFileSync(
    nodePath.join(bundled, 'package.json'),
    JSON.stringify({ version: '0.2.0-nightly.2026.1.29' })
  );
}

describe('RuffleService.ensureInstalled', () => {
  it('leaves an existing installation alone', async () => {
    installExistingRuffle();
    installBundledRuffle();

    const result = await new RuffleService().ensureInstalled();

    expect(result).toBe('present');
    expect(nodeFs.readFileSync(nodePath.join(ruffleDir(), 'ruffle.js'), 'utf-8')).toBe('old build');
    expect(axios.get).not.toHaveBeenCalled();
  });

  it('seeds from the bundled copy when nothing is installed', async () => {
    installBundledRuffle();
    const service = new RuffleService();

    const result = await service.ensureInstalled();

    expect(result).toBe('seeded');
    expect(nodeFs.readFileSync(nodePath.join(ruffleDir(), 'ruffle.js'), 'utf-8')).toBe(
      'bundled build'
    );
    expect(service.getCurrentVersion()).toBe('0.2.0-nightly.2026.1.29');
    expect(axios.get).not.toHaveBeenCalled();
  });

  it('downloads when neither an installation nor a bundled copy exists', async () => {
    const result = await new RuffleService().ensureInstalled();

    expect(result).toBe('downloaded');
    expect(nodeFs.readFileSync(nodePath.join(ruffleDir(), 'ruffle.js'), 'utf-8')).toBe('new build');
    expect(axios.get).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run from `backend/`: `npx vitest run src/services/RuffleService.test.ts -t ensureInstalled`

Expected: FAIL with `ensureInstalled is not a function`.

- [ ] **Step 3: Implement the methods**

In `backend/src/services/RuffleService.ts`, add both methods directly after `verifyInstallation()`, inside the class:

```typescript
  /**
   * Copy the Ruffle shipped inside the image into the install directory. A fresh
   * data volume otherwise has no player at all until a download finishes — and
   * never gets one on a host that cannot reach GitHub.
   */
  private seedFromBundle(): boolean {
    if (this.bundledPath === this.installPath) {
      return false;
    }
    if (!fs.existsSync(path.join(this.bundledPath, 'ruffle.js'))) {
      return false;
    }
    try {
      this.copyDirectory(this.bundledPath, this.installPath);
      logger.info(
        `✅ Ruffle seeded from the bundled copy (version: ${this.getCurrentVersion() ?? 'unknown'})`
      );
      return true;
    } catch (error: unknown) {
      logger.warn('[RuffleService] Could not seed Ruffle from the bundled copy:', error);
      return false;
    }
  }

  /**
   * Make a Ruffle available, preferring what is already installed, then the copy
   * baked into the image, and only then a download.
   */
  async ensureInstalled(): Promise<'present' | 'seeded' | 'downloaded'> {
    if (this.verifyInstallation()) {
      logger.info(`✅ Ruffle verified (version: ${this.getCurrentVersion() ?? 'unknown'})`);
      return 'present';
    }

    if (this.seedFromBundle()) {
      return 'seeded';
    }

    logger.info('🎮 Ruffle not found, downloading latest version...');
    await this.updateRuffle();
    logger.info('✅ Ruffle installation complete');
    return 'downloaded';
  }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run from `backend/`: `npx vitest run src/services/RuffleService.test.ts`

Expected: PASS, including the three new cases and every pre-existing one.

- [ ] **Step 5: Call it from startup**

In `backend/src/server.ts`, replace lines 296-314:

```typescript
  // Ruffle installs in the background: it downloads from GitHub, and awaiting it
  // here kept the port closed for minutes on slow storage — indefinitely if the
  // download stalled. Flash games need it, everything else does not.
  void (async () => {
    try {
      const ruffleService = new RuffleService();
      if (!ruffleService.verifyInstallation()) {
        logger.info('🎮 Ruffle not found, downloading latest version...');
        await ruffleService.updateRuffle();
        logger.info('✅ Ruffle installation complete');
      } else {
        const version = ruffleService.getCurrentVersion();
        logger.info(`✅ Ruffle verified (version: ${version || 'unknown'})`);
      }
    } catch (error) {
      logger.error('Failed to install Ruffle:', error);
      logger.warn('⚠️  Continuing without Ruffle - Flash games will not work');
    }
  })();
```

with:

```typescript
  // Ruffle resolves in the background: seeding copies ~20 MB and the download
  // fallback reaches GitHub, and awaiting either here kept the port closed for
  // minutes on slow storage. Flash games need it, everything else does not.
  void (async () => {
    try {
      await new RuffleService().ensureInstalled();
    } catch (error) {
      logger.error('Failed to install Ruffle:', error);
      logger.warn('⚠️  Continuing without Ruffle - Flash games will not work');
    }
  })();
```

- [ ] **Step 6: Typecheck and run the full backend suite**

Run from the repository root: `npm run typecheck`

Then run from `backend/`: `npx vitest run`

Expected: no type errors, no new test failures.

- [ ] **Step 7: Commit**

```bash
npx prettier --write backend/src/services/RuffleService.ts backend/src/services/RuffleService.test.ts backend/src/server.ts
git add backend/src/services/RuffleService.ts backend/src/services/RuffleService.test.ts backend/src/server.ts
git commit -m "feat(ruffle): seed a fresh data volume from the bundled copy"
```

---

### Task 3: Serve the persisted directory with correct cache headers

**Files:**

- Modify: `backend/src/middleware/frontendServing.ts:20-55`
- Modify: `backend/src/middleware/startupOrdering.test.ts:12-17`
- Create: `backend/src/middleware/ruffleServing.test.ts`

**Interfaces:**

- Consumes: `config.ruffleDataPath` from Task 1.
- Produces: nothing consumed by later tasks. `registerFrontendServing(app, distPath?)` keeps its existing signature; the Ruffle mount reads `config.ruffleDataPath` directly.

**Implementer:** dcc-superpower-companions:impl-sonnet-max
**Evaluation:** files 1 - spec 0 - coupling 2 - risk 2 = 5

- [ ] **Step 1: Write the failing test**

Create `backend/src/middleware/ruffleServing.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';
import fs from 'fs';
import os from 'os';
import path from 'path';

vi.mock('../utils/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}));

let ruffleDir: string;

vi.mock('../config', () => ({
  config: {
    serveFrontend: true,
    get ruffleDataPath() {
      return ruffleDir;
    },
  },
}));

import { registerFrontendServing } from './frontendServing';

const HASHED_CHUNK = 'core.ruffle.4ca82b563e9711217164.js';

let distDir: string;
let app: Express;

beforeEach(() => {
  distDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fp-serve-dist-'));
  ruffleDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fp-serve-ruffle-'));

  fs.writeFileSync(path.join(distDir, 'index.html'), '<!doctype html><div id="root"></div>');
  fs.mkdirSync(path.join(distDir, 'ruffle'));
  fs.writeFileSync(path.join(distDir, 'ruffle', 'ruffle.js'), 'bundled loader');
  fs.writeFileSync(path.join(distDir, 'ruffle', 'only-in-bundle.js'), 'bundled extra');

  fs.writeFileSync(path.join(ruffleDir, 'ruffle.js'), 'updated loader');
  fs.writeFileSync(path.join(ruffleDir, HASHED_CHUNK), 'updated chunk');

  app = express();
  registerFrontendServing(app, distDir);
});

afterEach(() => {
  fs.rmSync(distDir, { recursive: true, force: true });
  fs.rmSync(ruffleDir, { recursive: true, force: true });
});

describe('Ruffle serving', () => {
  it('serves the persisted copy in preference to the bundled one', async () => {
    const response = await request(app).get('/ruffle/ruffle.js');

    expect(response.status).toBe(200);
    expect(response.text).toBe('updated loader');
  });

  it('falls back to the bundled copy for a file the persisted copy lacks', async () => {
    const response = await request(app).get('/ruffle/only-in-bundle.js');

    expect(response.status).toBe(200);
    expect(response.text).toBe('bundled extra');
  });

  it('makes the stable-named loader revalidate', async () => {
    const response = await request(app).get('/ruffle/ruffle.js');

    expect(response.headers['cache-control']).toBe('no-cache, no-store, must-revalidate');
  });

  it('makes a content-hashed chunk immutable', async () => {
    const response = await request(app).get(`/ruffle/${HASHED_CHUNK}`);

    expect(response.headers['cache-control']).toBe('public, max-age=31536000, immutable');
  });

  it('makes the bundled fallback loader revalidate too', async () => {
    const response = await request(app).get('/ruffle/only-in-bundle.js');

    expect(response.headers['cache-control']).toBe('no-cache, no-store, must-revalidate');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run from `backend/`: `npx vitest run src/middleware/ruffleServing.test.ts`

Expected: FAIL. `/ruffle/ruffle.js` returns `bundled loader` because no persisted mount exists, and its `Cache-Control` is `public, max-age=31536000, immutable`.

- [ ] **Step 3: Add the mount and the cache policy**

In `backend/src/middleware/frontendServing.ts`, add this import alongside the existing ones:

```typescript
import type { Response } from 'express';
```

Add these two declarations directly above `export function registerFrontendServing`:

```typescript
/**
 * Ruffle content-hashes its chunks (`core.ruffle.4ca82b563e9711217164.js`,
 * `f2a570ccf4468b20d95a.wasm`) but not its entry points. Detecting the hash
 * rather than listing the stable names keeps this correct when a release adds a
 * file.
 */
const HASHED_RUFFLE_ASSET = /[0-9a-f]{16,}/i;

/**
 * `ruffle.js` keeps its name across versions, so serving it immutable pinned
 * every returning browser to the loader it first saw — an update reached the
 * disk and nothing else.
 */
function setRuffleCacheControl(res: Response, filePath: string): void {
  res.setHeader(
    'Cache-Control',
    HASHED_RUFFLE_ASSET.test(path.basename(filePath))
      ? 'public, max-age=31536000, immutable'
      : 'no-cache, no-store, must-revalidate'
  );
}
```

Inside `registerFrontendServing`, insert this immediately after the `index.html` existence guard and before the existing `app.use(express.static(distPath, ...))` call:

```typescript
  // Ahead of the dist handler so an updated Ruffle shadows the one baked into
  // the image. `fallthrough` lets the baked copy answer for anything the
  // persisted directory is missing, including before the first seed finishes.
  app.use(
    '/ruffle',
    express.static(config.ruffleDataPath, {
      index: false,
      fallthrough: true,
      setHeaders: setRuffleCacheControl,
    })
  );
```

Then replace the `setHeaders` option on the existing dist handler:

```typescript
      setHeaders: (res, filePath) => {
        // Hashed assets are immutable; index.html must always be revalidated.
        if (filePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
      },
```

with:

```typescript
      setHeaders: (res, filePath) => {
        // Hashed assets are immutable; index.html must always be revalidated.
        if (filePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          return;
        }
        if (filePath.startsWith(bundledRufflePath + path.sep)) {
          setRuffleCacheControl(res, filePath);
        }
      },
```

and declare `bundledRufflePath` at the top of the function body, directly below the existing `const indexHtml = path.join(distPath, 'index.html');`:

```typescript
  const bundledRufflePath = path.join(distPath, 'ruffle');
```

- [ ] **Step 4: Run the test to verify it passes**

Run from `backend/`: `npx vitest run src/middleware/ruffleServing.test.ts`

Expected: PASS, all five cases.

- [ ] **Step 5: Repair the sibling middleware test's config mock**

`backend/src/middleware/startupOrdering.test.ts` mocks `../config` without `ruffleDataPath`, and `express.static(undefined)` throws `TypeError: root path required`. Replace its mock (lines 12-17):

```typescript
vi.mock('../config', () => ({
  config: {
    serveFrontend: true,
    frontendDistPath: '/unused-in-tests',
  },
}));
```

with:

```typescript
vi.mock('../config', () => ({
  config: {
    serveFrontend: true,
    frontendDistPath: '/unused-in-tests',
    ruffleDataPath: '/unused-in-tests/ruffle',
  },
}));
```

- [ ] **Step 6: Run the full backend suite and typecheck**

Run from `backend/`: `npx vitest run`

Then run from the repository root: `npm run typecheck`

Expected: no failures and no type errors. `startupOrdering.test.ts` in particular must stay green — a missing-directory static mount with `fallthrough: true` calls `next()` instead of throwing.

- [ ] **Step 7: Commit**

```bash
npx prettier --write backend/src/middleware/frontendServing.ts backend/src/middleware/ruffleServing.test.ts backend/src/middleware/startupOrdering.test.ts
git add backend/src/middleware/frontendServing.ts backend/src/middleware/ruffleServing.test.ts backend/src/middleware/startupOrdering.test.ts
git commit -m "fix(ruffle): serve the persisted install ahead of the bundled one"
```

---

### Task 4: Deployment configuration and documentation

**Files:**

- Modify: `docker-compose.dev.yml:28-40`
- Modify: `docker-compose.yml:29-33`
- Modify: `docs/09-deployment/environment-variables.md:113-116`

**Interfaces:**

- Consumes: the `RUFFLE_DATA_PATH` variable name and the `/app/data/ruffle` default from Task 1.
- Produces: nothing.

**Implementer:** dcc-superpower-companions:impl-sonnet-medium
**Evaluation:** files 1 - spec 0 - coupling 1 - risk 0 = 2

- [ ] **Step 1: Set the variable in the dev compose file**

`docker-compose.dev.yml` runs `NODE_ENV=development` with `SERVE_FRONTEND=true`, so the production-keyed default resolves to a relative path inside the container and misses the `backend-db:/app/data` volume. In `docker-compose.dev.yml`, find:

```yaml
      # Matches the read-only mount above. Set explicitly because the backend's
      # fallback only points here when NODE_ENV=production.
      - FLASHPOINT_PATH=/data/flashpoint
```

Insert directly after it:

```yaml
      # Same reason as FLASHPOINT_PATH above: this container runs
      # NODE_ENV=development, so the production default would put Ruffle outside
      # the data volume and lose every update on recreate.
      - RUFFLE_DATA_PATH=/app/data/ruffle
```

- [ ] **Step 2: Update both volume comments**

In `docker-compose.yml`, find:

```yaml
      - ${FLASHPOINT_HOST_PATH:?FLASHPOINT_HOST_PATH is required}:/data/flashpoint
      - ${DATA_PATH:-./data}:/app/data
```

Replace with:

```yaml
      - ${FLASHPOINT_HOST_PATH:?FLASHPOINT_HOST_PATH is required}:/data/flashpoint
      # Holds user.db and the installed Ruffle. Without this mount an in-app
      # Ruffle update is lost the next time the container is recreated.
      - ${DATA_PATH:-./data}:/app/data
```

In `docker-compose.dev.yml`, find:

```yaml
      - ${FLASHPOINT_HOST_PATH:?FLASHPOINT_HOST_PATH is required}:/data/flashpoint
      - backend-db:/app/data
```

Replace with:

```yaml
      - ${FLASHPOINT_HOST_PATH:?FLASHPOINT_HOST_PATH is required}:/data/flashpoint
      # Holds user.db and the installed Ruffle. Without this mount an in-app
      # Ruffle update is lost the next time the container is recreated.
      - backend-db:/app/data
```

- [ ] **Step 3: Document the variable**

In `docs/09-deployment/environment-variables.md`, find this table:

```markdown
| Variable             | Default                       | Description                                                    |
| -------------------- | ----------------------------- | -------------------------------------------------------------- |
| `SERVE_FRONTEND`     | true in production, else false | Serve the built frontend and SPA fallback from the backend    |
| `FRONTEND_DIST_PATH` | `<backend>/../frontend/dist`  | Location of the built frontend (rarely needed)                 |
```

Add one row to it:

```markdown
| `RUFFLE_DATA_PATH`   | `/app/data/ruffle` in production | Where Ruffle is installed. Must sit on a mounted volume, or an in-app update is lost when the container is recreated |
```

- [ ] **Step 4: Verify both compose files still parse**

Run from the repository root:

```bash
docker compose -f docker-compose.yml config --quiet
docker compose -f docker-compose.dev.yml config --quiet
```

Expected: both exit 0 and print nothing. Each file requires `FLASHPOINT_HOST_PATH` and `JWT_SECRET`; if the repository has no `.env`, supply throwaway values inline:

```bash
FLASHPOINT_HOST_PATH=/tmp/fp JWT_SECRET=x docker compose -f docker-compose.yml config --quiet
FLASHPOINT_HOST_PATH=/tmp/fp JWT_SECRET=x docker compose -f docker-compose.dev.yml config --quiet
```

If the Docker CLI is unavailable in this environment, say so rather than skipping silently, and parse both files directly instead:

```bash
node -e "const y=require('yaml');const fs=require('fs');for(const f of ['docker-compose.yml','docker-compose.dev.yml']){y.parse(fs.readFileSync(f,'utf8'));console.log(f,'ok')}"
```

The `yaml` package is already present in the repository's `node_modules` as a transitive dependency. This proves the YAML parses; it does not check Compose semantics, so report which of the two checks you ran.

- [ ] **Step 5: Commit**

```bash
npx prettier --write docker-compose.yml docker-compose.dev.yml docs/09-deployment/environment-variables.md
git add docker-compose.yml docker-compose.dev.yml docs/09-deployment/environment-variables.md
git commit -m "docs(ruffle): document the persisted install path"
```

---

## Verification

After Task 4, confirm the whole change from the repository root:

```bash
npm run typecheck
npm run build
```

Then from `backend/`: `npx vitest run`

Expected: typecheck clean, build succeeds, backend suite green.

Manual confirmation in a container, which is what the reported bug needs:

1. `docker compose -f docker-compose.dev.yml up -d --build`
2. Settings → Update → update Ruffle, and note the version.
3. `docker compose -f docker-compose.dev.yml up -d --force-recreate`
4. Settings → Update still reports the updated version, and a hard-refreshed
   browser loads it.
