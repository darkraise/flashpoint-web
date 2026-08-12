# Web App Update Check Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show an admin on Settings → Update whether a newer release of Flashpoint Web exists, what changed, and how to upgrade.

**Architecture:** A backend service reads the running version from `APP_VERSION`, fetches the latest GitHub release with axios, compares them, and serves a bare JSON object from `GET /api/updates/app`. A React card renders the result. The card notifies only — it never pulls, restarts, or writes anything.

**Tech Stack:** Express + TypeScript, axios, vitest + supertest, React + TanStack Query, react-markdown + remark-gfm, Tailwind theme tokens.

**Spec:** `docs/superpowers/specs/2026-08-12-web-app-update-design.md`

## Global Constraints

- The repository is hardcoded: `https://api.github.com/repos/darkraise/flashpoint-web/releases/latest`.
- The route always answers HTTP 200. Never throw `AppError` from this feature — the axios interceptor in `frontend/src/lib/api/client.ts` fires a global toast for any status at or above 500, which would double up with the card's own error state.
- The response is a **bare object**, `res.json(info)` — matching every endpoint in `backend/src/routes/updates.ts`. Do not use the `{success, data}` envelope from `routes/github.ts`.
- Cache TTL is 1 hour; a forced refresh is floored at 60 seconds; the axios timeout is 10 seconds.
- Strip a single leading `v` from **both** sides before comparing. GitHub tags are `v1.0.38`; `APP_VERSION` is `1.0.38`.
- A version is a release only if it is exactly three numeric parts. Everything else — unset, `dev`, `latest`, `1.1.0-rc1`, `1.0.38-5-gabc123` — is an **unreleased build** and never reports an update.
- Project standards in `CLAUDE.md` are mandatory: no `any`, no non-null assertions, `??` over `||` (one documented exception in Task 2), `asyncHandler` on async handlers, `logger` not `console`, theme tokens not hardcoded colors, `@/` imports, all frontend API calls through `frontend/src/lib/api`.
- Run `npx prettier --write <files>` before every commit. Backend tests run from `backend/`: `npx vitest run` (the repo's tests fail when run from the repo root — a fixture path issue unrelated to this work).

---

### Task 1: Version comparison utility

**Files:**

- Create: `backend/src/utils/version.ts`
- Test: `backend/src/utils/version.test.ts`

**Interfaces:**

- Consumes: nothing.
- Produces: `normalizeVersion(value: string): string`, `isReleaseVersion(value: string | null): boolean`, `compareVersions(a: string, b: string): number | null`.

- [ ] **Step 1: Write the failing test**

Create `backend/src/utils/version.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { compareVersions, isReleaseVersion, normalizeVersion } from './version';

describe('normalizeVersion', () => {
  it('strips a single leading v', () => {
    expect(normalizeVersion('v1.0.38')).toBe('1.0.38');
    expect(normalizeVersion('1.0.38')).toBe('1.0.38');
  });
});

describe('isReleaseVersion', () => {
  it('accepts three numeric parts with or without a v', () => {
    expect(isReleaseVersion('1.0.38')).toBe(true);
    expect(isReleaseVersion('v1.0.38')).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isReleaseVersion(null)).toBe(false);
    expect(isReleaseVersion('')).toBe(false);
    expect(isReleaseVersion('dev')).toBe(false);
    expect(isReleaseVersion('latest')).toBe(false);
    expect(isReleaseVersion('1.0')).toBe(false);
    expect(isReleaseVersion('1.1.0-rc1')).toBe(false);
    expect(isReleaseVersion('1.0.38-5-gabc123')).toBe(false);
  });
});

describe('compareVersions', () => {
  it('reports equality', () => {
    expect(compareVersions('1.0.38', '1.0.38')).toBe(0);
    expect(compareVersions('1.0.38', 'v1.0.38')).toBe(0);
  });

  it('reports a newer right side as negative', () => {
    expect(compareVersions('1.0.38', 'v1.0.42')).toBeLessThan(0);
    expect(compareVersions('1.0.38', 'v1.1.0')).toBeLessThan(0);
    expect(compareVersions('1.0.38', 'v2.0.0')).toBeLessThan(0);
  });

  it('reports an older right side as positive', () => {
    expect(compareVersions('1.0.38', 'v1.0.37')).toBeGreaterThan(0);
  });

  it('compares numerically, not as strings', () => {
    expect(compareVersions('1.0.38', 'v1.0.9')).toBeGreaterThan(0);
  });

  it('returns null when either side is not a release version', () => {
    expect(compareVersions('dev', 'v1.0.38')).toBeNull();
    expect(compareVersions('1.0.38-5-gabc123', 'v1.0.38')).toBeNull();
    expect(compareVersions('1.0.38', 'v2.0')).toBeNull();
    expect(compareVersions('', '')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run from `backend/`: `npx vitest run src/utils/version.test.ts`
Expected: FAIL — cannot resolve `./version`.

- [ ] **Step 3: Write the implementation**

Create `backend/src/utils/version.ts`:

```typescript
/** A release version is exactly three numeric parts, with an optional leading v. */
const RELEASE_VERSION = /^v?(\d+)\.(\d+)\.(\d+)$/;

/** GitHub tags carry a leading v that APP_VERSION does not. */
export function normalizeVersion(value: string): string {
  const trimmed = value.trim();
  return trimmed.startsWith('v') ? trimmed.slice(1) : trimmed;
}

export function isReleaseVersion(value: string | null): boolean {
  return typeof value === 'string' && RELEASE_VERSION.test(value.trim());
}

/**
 * Negative when a is older than b, positive when newer, zero when equal.
 * Null when either side is not a release version, which is what keeps an
 * unreleased build from claiming to be behind.
 */
export function compareVersions(a: string, b: string): number | null {
  const left = RELEASE_VERSION.exec(a.trim());
  const right = RELEASE_VERSION.exec(b.trim());

  if (!left || !right) {
    return null;
  }

  for (let part = 1; part <= 3; part++) {
    const difference = Number(left[part]) - Number(right[part]);
    if (difference !== 0) {
      return difference;
    }
  }

  return 0;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run from `backend/`: `npx vitest run src/utils/version.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
npx prettier --write backend/src/utils/version.ts backend/src/utils/version.test.ts
git add backend/src/utils/version.ts backend/src/utils/version.test.ts
git commit -m "feat(utils): add release version comparison"
```

---

### Task 2: Server reports its running version

**Files:**

- Modify: `backend/src/config.ts` (add `appVersion` beside the Flashpoint version fields, around line 150)
- Modify: `Dockerfile` (final stage, after the existing `ARG VERSION=dev` near line 56)
- Modify: `docs/09-deployment/environment-variables.md`

**Interfaces:**

- Consumes: nothing.
- Produces: `config.appVersion: string | null`.

- [ ] **Step 1: Add the config field**

In `backend/src/config.ts`, immediately after `flashpointPackagedAt`:

```typescript
  // Baked into the image from the VERSION build arg; unset elsewhere, which
  // marks the build as unreleased. `||` is deliberate: a whitespace-only value
  // must collapse to null, which `??` would not do.
  appVersion: process.env.APP_VERSION?.trim() || null,
```

- [ ] **Step 2: Pass the build arg into the running container**

In `Dockerfile`, the final stage already declares `ARG VERSION=dev` above the labels. Add directly below the `LABEL` lines:

```dockerfile
# An ARG does not survive into the running container; the server reads this to
# decide whether it is a released build.
ENV APP_VERSION=${VERSION}
```

- [ ] **Step 3: Verify both states**

Run from `backend/`:

```bash
npm run build
APP_VERSION=1.0.38 node -e "console.log(require('./dist/config.js').config.appVersion)"   # 1.0.38
APP_VERSION="   " node -e "console.log(require('./dist/config.js').config.appVersion)"    # null
node -e "console.log(require('./dist/config.js').config.appVersion)"                      # null
```

Expected: `1.0.38`, then `null`, then `null`.

- [ ] **Step 4: Document the variable**

In `docs/09-deployment/environment-variables.md`, add to the table under **Paths** a new row in the general/optional section (place it next to the other optional server variables):

```markdown
| `APP_VERSION` | set by the Docker build | Release version the server reports on Settings → Update. Baked into the official image from the release tag; set it by hand for a non-Docker deployment, or update checks stay off. |
```

- [ ] **Step 5: Commit**

```bash
npx prettier --write backend/src/config.ts docs/09-deployment/environment-variables.md
git add backend/src/config.ts Dockerfile docs/09-deployment/environment-variables.md
git commit -m "feat(config): report the running app version"
```

---

### Task 3: AppUpdateService — fetch and compare

**Files:**

- Create: `backend/src/services/AppUpdateService.ts`
- Test: `backend/src/services/AppUpdateService.test.ts`

**Interfaces:**

- Consumes: `compareVersions`, `isReleaseVersion`, `normalizeVersion` from `../utils/version`; `config.appVersion`.
- Produces: `AppUpdateService.getUpdateInfo(force?: boolean): Promise<AppUpdateInfo>`, `AppUpdateService.clearCache(): void`, and the exported `AppUpdateInfo` interface.

- [ ] **Step 1: Write the failing test**

Create `backend/src/services/AppUpdateService.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../utils/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}));

const configMock = vi.hoisted(() => ({ config: { appVersion: '1.0.38' as string | null } }));
vi.mock('../config', () => configMock);

vi.mock('axios', () => ({
  default: { get: vi.fn() },
}));

import axios from 'axios';
import { AppUpdateService } from './AppUpdateService';

/** The shape of the fields this service reads from a GitHub release. */
function release(tagName: string) {
  return {
    data: {
      tag_name: tagName,
      published_at: '2026-08-12T07:11:45Z',
      html_url: `https://github.com/darkraise/flashpoint-web/releases/tag/${tagName}`,
      body: '## Changes since v1.0.37\n\n- feat: something',
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  AppUpdateService.clearCache();
  configMock.config.appVersion = '1.0.38';
});

describe('AppUpdateService.getUpdateInfo', () => {
  it('reports an update when the release is newer', async () => {
    vi.mocked(axios.get).mockResolvedValue(release('v1.0.42'));

    const info = await AppUpdateService.getUpdateInfo();

    expect(info.updateAvailable).toBe(true);
    expect(info.currentVersion).toBe('1.0.38');
    expect(info.latestVersion).toBe('1.0.42');
    expect(info.isUnreleasedBuild).toBe(false);
    expect(info.lastCheckFailed).toBe(false);
    expect(info.publishedAt).toBe('2026-08-12T07:11:45Z');
    expect(info.releaseUrl).toContain('/releases/tag/v1.0.42');
    expect(info.changelog).toContain('Changes since');
    expect(info.checkedAt).not.toBeNull();
  });

  it('reports no update when the versions match', async () => {
    vi.mocked(axios.get).mockResolvedValue(release('v1.0.38'));

    const info = await AppUpdateService.getUpdateInfo();

    expect(info.updateAvailable).toBe(false);
    expect(info.latestVersion).toBe('1.0.38');
  });

  it('reports no update when the running build is newer than the release', async () => {
    configMock.config.appVersion = '1.0.42';
    vi.mocked(axios.get).mockResolvedValue(release('v1.0.38'));

    const info = await AppUpdateService.getUpdateInfo();

    expect(info.updateAvailable).toBe(false);
  });

  it('never claims an update on an unreleased build, but still reports the release', async () => {
    configMock.config.appVersion = '1.0.38-5-gabc123';
    vi.mocked(axios.get).mockResolvedValue(release('v1.0.42'));

    const info = await AppUpdateService.getUpdateInfo();

    expect(info.isUnreleasedBuild).toBe(true);
    expect(info.updateAvailable).toBe(false);
    expect(info.latestVersion).toBe('1.0.42');
    expect(info.changelog).toContain('Changes since');
  });

  it('treats an unset version as an unreleased build', async () => {
    configMock.config.appVersion = null;
    vi.mocked(axios.get).mockResolvedValue(release('v1.0.42'));

    const info = await AppUpdateService.getUpdateInfo();

    expect(info.currentVersion).toBeNull();
    expect(info.isUnreleasedBuild).toBe(true);
    expect(info.updateAvailable).toBe(false);
  });

  it('reports no update when the release tag is malformed', async () => {
    vi.mocked(axios.get).mockResolvedValue(release('v2.0'));

    const info = await AppUpdateService.getUpdateInfo();

    expect(info.updateAvailable).toBe(false);
    expect(info.latestVersion).toBe('2.0');
  });

  it('requests the latest release with a timeout', async () => {
    vi.mocked(axios.get).mockResolvedValue(release('v1.0.38'));

    await AppUpdateService.getUpdateInfo();

    expect(axios.get).toHaveBeenCalledWith(
      'https://api.github.com/repos/darkraise/flashpoint-web/releases/latest',
      expect.objectContaining({ timeout: 10000 })
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run from `backend/`: `npx vitest run src/services/AppUpdateService.test.ts`
Expected: FAIL — cannot resolve `./AppUpdateService`.

- [ ] **Step 3: Write the implementation**

Create `backend/src/services/AppUpdateService.ts`:

```typescript
import axios from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';
import { compareVersions, isReleaseVersion, normalizeVersion } from '../utils/version';

const LATEST_RELEASE_URL =
  'https://api.github.com/repos/darkraise/flashpoint-web/releases/latest';
const CACHE_TTL_MS = 60 * 60 * 1000;
const FORCED_REFRESH_FLOOR_MS = 60 * 1000;
const REQUEST_TIMEOUT_MS = 10000;

export interface AppUpdateInfo {
  currentVersion: string | null;
  latestVersion: string | null;
  updateAvailable: boolean;
  isUnreleasedBuild: boolean;
  publishedAt: string | null;
  releaseUrl: string | null;
  changelog: string | null;
  checkedAt: string | null;
  lastCheckFailed: boolean;
}

interface CachedRelease {
  version: string;
  publishedAt: string | null;
  releaseUrl: string | null;
  changelog: string | null;
  fetchedAt: number;
}

interface GitHubRelease {
  tag_name?: unknown;
  published_at?: unknown;
  html_url?: unknown;
  body?: unknown;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/**
 * Reports whether a newer release of this app exists. Notify-only: nothing here
 * downloads, installs, or restarts anything.
 */
export class AppUpdateService {
  private static cached: CachedRelease | null = null;
  private static inFlight: Promise<CachedRelease> | null = null;
  private static lastCheckFailed = false;

  static async getUpdateInfo(force = false): Promise<AppUpdateInfo> {
    // A forced check still respects a 60s floor. Express rate limiting allows
    // 100 requests a minute, which is no protection for a GitHub quota of 60 an
    // hour that this shares with the star count and the Ruffle update check.
    const maxAge = force ? FORCED_REFRESH_FLOOR_MS : CACHE_TTL_MS;
    const age = this.cached === null ? Infinity : Date.now() - this.cached.fetchedAt;

    if (age >= maxAge) {
      try {
        await this.fetchLatestRelease();
        this.lastCheckFailed = false;
      } catch (error: unknown) {
        this.lastCheckFailed = true;
        logger.warn('[AppUpdate] Could not reach GitHub for the latest release', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return this.buildInfo();
  }

  /** Concurrent callers on a cold cache share one request. */
  private static async fetchLatestRelease(): Promise<CachedRelease> {
    if (this.inFlight !== null) {
      return this.inFlight;
    }

    this.inFlight = this.requestLatestRelease();

    try {
      const release = await this.inFlight;
      this.cached = release;
      return release;
    } finally {
      this.inFlight = null;
    }
  }

  private static async requestLatestRelease(): Promise<CachedRelease> {
    const response = await axios.get(LATEST_RELEASE_URL, {
      timeout: REQUEST_TIMEOUT_MS,
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Flashpoint-Web',
      },
    });

    const release = (response.data ?? {}) as GitHubRelease;
    const tagName = asString(release.tag_name);

    if (tagName === null) {
      throw new Error('GitHub release response carried no tag_name');
    }

    return {
      version: normalizeVersion(tagName),
      publishedAt: asString(release.published_at),
      releaseUrl: asString(release.html_url),
      changelog: asString(release.body),
      fetchedAt: Date.now(),
    };
  }

  private static buildInfo(): AppUpdateInfo {
    const currentVersion = config.appVersion;
    const isUnreleasedBuild = !isReleaseVersion(currentVersion);
    const latest = this.cached;

    const comparison =
      latest !== null && currentVersion !== null && !isUnreleasedBuild
        ? compareVersions(currentVersion, latest.version)
        : null;

    return {
      currentVersion,
      latestVersion: latest?.version ?? null,
      updateAvailable: comparison !== null && comparison < 0,
      isUnreleasedBuild,
      publishedAt: latest?.publishedAt ?? null,
      releaseUrl: latest?.releaseUrl ?? null,
      changelog: latest?.changelog ?? null,
      checkedAt: latest === null ? null : new Date(latest.fetchedAt).toISOString(),
      lastCheckFailed: this.lastCheckFailed,
    };
  }

  /** Drops the held release. Used by tests. */
  static clearCache(): void {
    this.cached = null;
    this.inFlight = null;
    this.lastCheckFailed = false;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run from `backend/`: `npx vitest run src/services/AppUpdateService.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
npx prettier --write backend/src/services/AppUpdateService.ts backend/src/services/AppUpdateService.test.ts
git add backend/src/services/AppUpdateService.ts backend/src/services/AppUpdateService.test.ts
git commit -m "feat(updates): compare the app version against the latest release"
```

---

### Task 4: AppUpdateService — caching and failure handling

**Files:**

- Modify: `backend/src/services/AppUpdateService.test.ts` (append a describe block)
- Modify: `backend/src/services/AppUpdateService.ts` only if a test fails

**Interfaces:**

- Consumes: everything from Task 3.
- Produces: no new API. This task proves the caching, floor, dedupe, and failure behaviour written in Task 3.

- [ ] **Step 1: Write the failing test**

Append to `backend/src/services/AppUpdateService.test.ts`:

```typescript
describe('AppUpdateService caching', () => {
  it('serves the cached release inside the hour', async () => {
    vi.mocked(axios.get).mockResolvedValue(release('v1.0.42'));

    await AppUpdateService.getUpdateInfo();
    await AppUpdateService.getUpdateInfo();

    expect(axios.get).toHaveBeenCalledTimes(1);
  });

  it('refetches after the cache expires', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-08-12T00:00:00Z'));
      vi.mocked(axios.get).mockResolvedValue(release('v1.0.42'));

      await AppUpdateService.getUpdateInfo();
      vi.setSystemTime(new Date('2026-08-12T01:00:01Z'));
      await AppUpdateService.getUpdateInfo();

      expect(axios.get).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('ignores a forced refresh inside the 60 second floor', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-08-12T00:00:00Z'));
      vi.mocked(axios.get).mockResolvedValue(release('v1.0.42'));

      await AppUpdateService.getUpdateInfo();
      vi.setSystemTime(new Date('2026-08-12T00:00:30Z'));
      await AppUpdateService.getUpdateInfo(true);

      expect(axios.get).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('honours a forced refresh past the floor', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-08-12T00:00:00Z'));
      vi.mocked(axios.get).mockResolvedValue(release('v1.0.42'));

      await AppUpdateService.getUpdateInfo();
      vi.setSystemTime(new Date('2026-08-12T00:01:01Z'));
      await AppUpdateService.getUpdateInfo(true);

      expect(axios.get).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('makes one request for concurrent callers on a cold cache', async () => {
    vi.mocked(axios.get).mockResolvedValue(release('v1.0.42'));

    await Promise.all([
      AppUpdateService.getUpdateInfo(),
      AppUpdateService.getUpdateInfo(),
      AppUpdateService.getUpdateInfo(),
    ]);

    expect(axios.get).toHaveBeenCalledTimes(1);
  });
});

describe('AppUpdateService failures', () => {
  it('keeps serving the held release and flags the failed check', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-08-12T00:00:00Z'));
      vi.mocked(axios.get).mockResolvedValue(release('v1.0.42'));
      await AppUpdateService.getUpdateInfo();

      vi.setSystemTime(new Date('2026-08-12T02:00:00Z'));
      vi.mocked(axios.get).mockRejectedValue(new Error('getaddrinfo ENOTFOUND'));
      const info = await AppUpdateService.getUpdateInfo();

      expect(info.lastCheckFailed).toBe(true);
      expect(info.latestVersion).toBe('1.0.42');
      expect(info.updateAvailable).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('reports a failed check with no release when it has never succeeded', async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error('getaddrinfo ENOTFOUND'));

    const info = await AppUpdateService.getUpdateInfo();

    expect(info.lastCheckFailed).toBe(true);
    expect(info.latestVersion).toBeNull();
    expect(info.checkedAt).toBeNull();
    expect(info.updateAvailable).toBe(false);
    expect(info.currentVersion).toBe('1.0.38');
  });

  it('treats a response with no tag_name as a failed check', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: { body: 'no tag here' } });

    const info = await AppUpdateService.getUpdateInfo();

    expect(info.lastCheckFailed).toBe(true);
    expect(info.latestVersion).toBeNull();
  });

  it('clears the failure flag once a later check succeeds', async () => {
    vi.mocked(axios.get).mockRejectedValueOnce(new Error('offline'));
    const failed = await AppUpdateService.getUpdateInfo();
    expect(failed.lastCheckFailed).toBe(true);

    vi.mocked(axios.get).mockResolvedValue(release('v1.0.42'));
    const recovered = await AppUpdateService.getUpdateInfo();

    expect(recovered.lastCheckFailed).toBe(false);
    expect(recovered.latestVersion).toBe('1.0.42');
  });
});
```

- [ ] **Step 2: Run the tests**

Run from `backend/`: `npx vitest run src/services/AppUpdateService.test.ts`
Expected: PASS, 16 tests total. If any fail, fix `AppUpdateService.ts` — the tests define the contract, not the other way around.

Note on the recovery test: a failed check leaves `cached` null, so the next call refetches immediately with no TTL to wait out. That is intended — there is nothing to serve, so nothing to protect.

- [ ] **Step 3: Run the whole backend suite**

Run from `backend/`: `npx vitest run`
Expected: all files pass.

- [ ] **Step 4: Commit**

```bash
npx prettier --write backend/src/services/AppUpdateService.test.ts
git add backend/src/services/AppUpdateService.test.ts backend/src/services/AppUpdateService.ts
git commit -m "test(updates): cover app update caching and failures"
```

---

### Task 5: The endpoint and its API client

**Files:**

- Modify: `backend/src/routes/updates.ts` (add the route directly after `const metadataSyncService = ...`, before the `/check` route)
- Create: `backend/src/routes/updates.test.ts`
- Modify: `frontend/src/lib/api/updates.ts`
- Modify: `frontend/src/lib/api/index.ts:44`

**Interfaces:**

- Consumes: `AppUpdateService.getUpdateInfo`, `AppUpdateInfo` from Task 3.
- Produces: `GET /api/updates/app`; `updatesApi.getAppUpdate(refresh?: boolean): Promise<AppUpdateInfo>`; the frontend `AppUpdateInfo` type exported from `@/lib/api`.

- [ ] **Step 1: Write the failing test**

Create `backend/src/routes/updates.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';

vi.mock('../utils/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}));

// The route's own behaviour is what is under test, not the middleware stack.
vi.mock('../middleware/auth', () => ({
  authenticate: (_req: unknown, _res: unknown, next: () => void) => next(),
}));
vi.mock('../middleware/rbac', () => ({
  requirePermission: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));
vi.mock('../middleware/activityLogger', () => ({
  logActivity: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));
vi.mock('../middleware/rateLimiter', () => ({
  rateLimitStandard: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

const getUpdateInfo = vi.hoisted(() => vi.fn());
vi.mock('../services/AppUpdateService', () => ({
  AppUpdateService: { getUpdateInfo },
}));

// Imported for their side effects only; the route under test does not use them.
vi.mock('../services/UpdateService', () => ({ updateService: {} }));
vi.mock('../services/MetadataUpdateService', () => ({ MetadataUpdateService: class {} }));
vi.mock('../services/MetadataSyncService', () => ({ MetadataSyncService: class {} }));
vi.mock('../services/AssetDownloadService', () => ({ AssetDownloadService: {} }));
vi.mock('../services/SyncStatusService', () => ({ SyncStatusService: { getInstance: () => ({}) } }));

import updatesRouter from './updates';

const INFO = {
  currentVersion: '1.0.38',
  latestVersion: '1.0.42',
  updateAvailable: true,
  isUnreleasedBuild: false,
  publishedAt: '2026-08-12T07:11:45Z',
  releaseUrl: 'https://github.com/darkraise/flashpoint-web/releases/tag/v1.0.42',
  changelog: '## Changes',
  checkedAt: '2026-08-12T08:00:00.000Z',
  lastCheckFailed: false,
};

let app: Express;

beforeEach(() => {
  vi.clearAllMocks();
  getUpdateInfo.mockResolvedValue(INFO);
  app = express();
  app.use('/api/updates', updatesRouter);
});

describe('GET /api/updates/app', () => {
  it('returns the update info as a bare object', async () => {
    const response = await request(app).get('/api/updates/app');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(INFO);
  });

  it('does not force a refresh by default', async () => {
    await request(app).get('/api/updates/app');

    expect(getUpdateInfo).toHaveBeenCalledWith(false);
  });

  it('forces a refresh for refresh=true', async () => {
    await request(app).get('/api/updates/app?refresh=true');

    expect(getUpdateInfo).toHaveBeenCalledWith(true);
  });

  it('ignores any other refresh value', async () => {
    await request(app).get('/api/updates/app?refresh=1');
    await request(app).get('/api/updates/app?refresh=yes');
    await request(app).get('/api/updates/app?refresh[]=true');

    expect(getUpdateInfo).toHaveBeenNthCalledWith(1, false);
    expect(getUpdateInfo).toHaveBeenNthCalledWith(2, false);
    expect(getUpdateInfo).toHaveBeenNthCalledWith(3, false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run from `backend/`: `npx vitest run src/routes/updates.test.ts`
Expected: FAIL — 404, because the route does not exist yet.

- [ ] **Step 3: Add the route**

In `backend/src/routes/updates.ts`, add the import beside the other service imports:

```typescript
import { AppUpdateService } from '../services/AppUpdateService';
```

and add this route immediately before the existing `/check` route:

```typescript
router.get(
  '/app',
  authenticate,
  requirePermission('settings.update'),
  asyncHandler(async (req, res) => {
    // Any value other than the exact string is falsy here, so no schema is
    // warranted; the service's own 60s floor is what guards the GitHub quota.
    const info = await AppUpdateService.getUpdateInfo(req.query.refresh === 'true');
    res.json(info);
  })
);
```

- [ ] **Step 4: Run test to verify it passes**

Run from `backend/`: `npx vitest run src/routes/updates.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Add the API client method**

In `frontend/src/lib/api/updates.ts`, add the interface after `AssetDownloadProgress`:

```typescript
export interface AppUpdateInfo {
  currentVersion: string | null;
  latestVersion: string | null;
  updateAvailable: boolean;
  isUnreleasedBuild: boolean;
  publishedAt: string | null;
  releaseUrl: string | null;
  changelog: string | null;
  checkedAt: string | null;
  lastCheckFailed: boolean;
}
```

and add this method inside `updatesApi`:

```typescript
  getAppUpdate: async (refresh = false): Promise<AppUpdateInfo> => {
    const { data } = await apiClient.get<AppUpdateInfo>('/updates/app', {
      params: refresh ? { refresh: 'true' } : undefined,
    });
    return data;
  },
```

In `frontend/src/lib/api/index.ts`, extend the existing type re-export on line 44:

```typescript
export type {
  MetadataUpdateInfo,
  MetadataSyncStatus,
  AssetDownloadProgress,
  AppUpdateInfo,
} from './updates';
```

- [ ] **Step 6: Typecheck**

Run from the repo root: `npm run typecheck`
Expected: no errors in either workspace.

- [ ] **Step 7: Commit**

```bash
npx prettier --write backend/src/routes/updates.ts backend/src/routes/updates.test.ts frontend/src/lib/api/updates.ts frontend/src/lib/api/index.ts
git add backend/src/routes/updates.ts backend/src/routes/updates.test.ts frontend/src/lib/api/updates.ts frontend/src/lib/api/index.ts
git commit -m "feat(updates): serve the app update check"
```

---

### Task 6: The card

**Files:**

- Create: `frontend/src/components/settings/AppUpdateCard.tsx`
- Modify: `frontend/src/components/settings/UpdateSettingsTab.tsx`
- Modify: `docs/10-features/09-system-settings.md`

**Interfaces:**

- Consumes: `updatesApi.getAppUpdate`, `AppUpdateInfo` from Task 5.
- Produces: `<AppUpdateCard />`.

- [ ] **Step 1: Write the card**

Create `frontend/src/components/settings/AppUpdateCard.tsx`:

```tsx
import { useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  RefreshCw,
  Rocket,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { FormattedDate } from '@/components/common/FormattedDate';
import { useDialog } from '@/contexts/DialogContext';
import { updatesApi, type AppUpdateInfo } from '@/lib/api';

const UPGRADE_COMMAND = 'docker compose pull && docker compose up -d';

export function AppUpdateCard() {
  const { showToast } = useDialog();
  const queryClient = useQueryClient();
  const [showChangelog, setShowChangelog] = useState(false);

  const { data: info, isLoading } = useQuery({
    queryKey: ['appUpdate'],
    queryFn: () => updatesApi.getAppUpdate(),
    staleTime: 5 * 60 * 1000,
  });

  // A refetch would reuse the original query function, so it cannot ask for a
  // forced check; the mutation writes its result into the same cache entry.
  const checkNow = useMutation({
    mutationFn: () => updatesApi.getAppUpdate(true),
    onSuccess: (result: AppUpdateInfo) => {
      queryClient.setQueryData(['appUpdate'], result);

      if (result.lastCheckFailed) {
        showToast('Could not reach GitHub to check for updates', 'error');
      } else if (result.updateAvailable) {
        showToast(`Flashpoint Web ${result.latestVersion} is available`, 'success');
      } else if (!result.isUnreleasedBuild) {
        showToast('Flashpoint Web is up to date', 'success');
      }
    },
    onError: () => showToast('Could not check for updates', 'error'),
  });

  const checkFailedEntirely = info?.lastCheckFailed === true && info.latestVersion === null;

  return (
    <div className="bg-card rounded-lg p-6 border border-border shadow-md">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Rocket size={24} className="text-primary" aria-hidden="true" />
          <h2 className="text-xl font-semibold">Flashpoint Web</h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => checkNow.mutate()}
          disabled={checkNow.isPending || isLoading}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${checkNow.isPending ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          {checkNow.isPending ? 'Checking...' : 'Check for Updates'}
        </Button>
      </div>

      <div className="space-y-4">
        <div className="space-y-1">
          <Label className="text-sm text-muted-foreground">Current Version</Label>
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold">{info?.currentVersion ?? 'Unknown'}</span>
            {info && !info.isUnreleasedBuild && !info.updateAvailable && !info.lastCheckFailed ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" aria-hidden="true" />
            ) : null}
          </div>
        </div>

        {isLoading ? (
          <div className="h-20 bg-muted rounded-lg animate-pulse" />
        ) : null}

        {checkFailedEntirely ? (
          <div className="p-4 border border-border rounded-lg bg-muted/50 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-medium">Could not check for updates</p>
              <p className="text-sm text-muted-foreground mt-1">
                GitHub could not be reached. This does not affect anything else.
              </p>
            </div>
          </div>
        ) : null}

        {info && !checkFailedEntirely && info.isUnreleasedBuild ? (
          <div className="p-4 border border-border rounded-lg bg-muted/50 space-y-1">
            <p className="font-medium">Update checks are off</p>
            <p className="text-sm text-muted-foreground">
              The server did not report a released version, so there is nothing to compare
              against. Latest release: {info.latestVersion ?? 'unknown'}
              {info.publishedAt ? (
                <>
                  {' '}
                  (<FormattedDate date={info.publishedAt} type="date" />)
                </>
              ) : null}
              .
            </p>
          </div>
        ) : null}

        {info && !checkFailedEntirely && !info.isUnreleasedBuild ? (
          <div className="p-4 border border-border rounded-lg bg-muted/50 space-y-3">
            <div>
              <p className="font-medium">
                {info.updateAvailable
                  ? `Update available: ${info.latestVersion}`
                  : "You're up to date!"}
              </p>
              {info.publishedAt ? (
                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" aria-hidden="true" />
                  <span>
                    Released <FormattedDate date={info.publishedAt} type="date" />
                  </span>
                </div>
              ) : null}
              {info.lastCheckFailed && info.checkedAt ? (
                <p className="text-xs text-muted-foreground mt-2">
                  The last check failed. Showing the result from{' '}
                  <FormattedDate date={info.checkedAt} type="datetime" />.
                </p>
              ) : null}
            </div>

            {info.updateAvailable ? (
              <div className="space-y-2 border-t border-border pt-3">
                <p className="text-sm text-muted-foreground">To upgrade, on the server:</p>
                <pre className="bg-background border border-border rounded-lg p-3 text-xs overflow-x-auto">
                  <code>{UPGRADE_COMMAND}</code>
                </pre>
                <p className="text-xs text-muted-foreground">
                  If you pinned <span className="font-mono">IMAGE_TAG</span> in your{' '}
                  <span className="font-mono">.env</span>, raise it first — otherwise the pull
                  fetches the version you pinned.
                </p>
                {info.releaseUrl ? (
                  <a
                    href={info.releaseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    View release on GitHub
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                ) : null}
              </div>
            ) : null}

            {info.updateAvailable && info.changelog ? (
              <div className="border-t border-border pt-3">
                <button
                  onClick={() => setShowChangelog(!showChangelog)}
                  className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors w-full"
                >
                  {showChangelog ? (
                    <ChevronUp className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  )}
                  <span>{showChangelog ? 'Hide' : 'View'} Changelog</span>
                </button>
                {showChangelog ? (
                  <div className="mt-3 p-3 bg-background border border-border rounded-lg">
                    <div className="text-sm text-foreground/90 max-h-96 overflow-y-auto prose prose-sm dark:prose-invert max-w-none prose-headings:mt-3 prose-headings:mb-2 prose-p:my-2 prose-ul:my-2 prose-li:my-0.5 prose-code:text-xs prose-pre:text-xs">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{info.changelog}</ReactMarkdown>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Auto-expand the changelog when an update appears**

Add below the `checkNow` mutation, so a fresh update opens its notes without a click:

```tsx
  const [expandedFor, setExpandedFor] = useState<string | null>(null);

  if (info?.updateAvailable && info.changelog && expandedFor !== info.latestVersion) {
    setExpandedFor(info.latestVersion);
    setShowChangelog(true);
  }
```

This is the render-phase state-adjustment pattern React documents for deriving state from props, and it avoids the effect-plus-dependency loop the project's guidelines warn about.

- [ ] **Step 3: Mount the card**

In `frontend/src/components/settings/UpdateSettingsTab.tsx`, import it and render it first:

```tsx
import { AppUpdateCard } from './AppUpdateCard';
```

```tsx
      {/* Web App Updates (Admin Only) */}
      {isAdmin ? <AppUpdateCard /> : null}

      {/* Game Metadata Updates Section (Admin Only) */}
      {isAdmin ? <MetadataUpdateCard /> : null}
```

- [ ] **Step 4: Typecheck and build**

Run from the repo root: `npm run typecheck && npm run build`
Expected: both clean.

- [ ] **Step 5: Verify in the running app**

```bash
npm run dev
```

Open http://localhost:5173/settings → Update as an admin. With no `APP_VERSION` set, the card must show "Update checks are off" naming the latest release — not an update prompt. Then restart the backend with `APP_VERSION=1.0.1` and confirm the card reports an update, renders the changelog, and shows the upgrade command. Stop the dev servers when done.

- [ ] **Step 6: Document the tab**

In `docs/10-features/09-system-settings.md`, add a section after the App Tab section:

```markdown
#### Update Tab

- **Flashpoint Web** - Compares the running version against the latest GitHub
  release and shows the changelog and upgrade command. Notify only: it never
  pulls or restarts anything. A build with no release version — a source
  checkout, or an image built without the `VERSION` build arg — reports that
  checks are off rather than claiming to be behind.
- **Game Metadata** - Sync game metadata from a configured source
- **Ruffle Emulator Management** - Check for and install Ruffle updates
```

Note: the tab list under "Settings Tabs" in that file is already stale — it names Metadata and Game tabs that the UI no longer has. Leave that alone; correcting it is not this feature's job.

- [ ] **Step 7: Commit**

```bash
npx prettier --write frontend/src/components/settings/AppUpdateCard.tsx frontend/src/components/settings/UpdateSettingsTab.tsx docs/10-features/09-system-settings.md
git add frontend/src/components/settings/AppUpdateCard.tsx frontend/src/components/settings/UpdateSettingsTab.tsx docs/10-features/09-system-settings.md
git commit -m "feat(settings): add the web app update card"
```

---

## Final verification

- [ ] From `backend/`: `npx vitest run` — every test passes.
- [ ] From the repo root: `npm run typecheck` — clean.
- [ ] From the repo root: `npm run build` — clean.
- [ ] `git log --oneline` shows six commits, one per task.
