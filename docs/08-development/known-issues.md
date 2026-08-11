# Known Issues

Open defects found but not yet fixed. Each entry records the symptom, the
verified root cause, and the agreed approach where one has been decided.

---

## 1. Ultimate edition cannot update metadata

**Symptom:** On an Ultimate install, Settings → Metadata Update shows "No
metadata source is configured" with no way to proceed.

**Root cause:** Ultimate's `preferences.json` has no `gameMetadataSources` key at
all (verified: the Infinity install ships one entry pointing at
`https://fpfss.flashpointarchive.org`; the Ultimate install has the key absent).
`PreferencesService.hasMetadataSource()` reads that key and correctly reports
nothing. The Launcher's own default is `gameMetadataSources: []`
(`launcher/src/shared/preferences/util.ts:161`), so this is not specific to one
install. flashpoint-web only ever reads the value, so there is no way out.

**Why it is not simply enabled:** syncing on Ultimate is a different trade than
on Infinity, because the files are already on disk.

- `syncDeletedGames` runs `DELETE FROM game WHERE id IN (...)` with foreign keys
  disabled (`MetadataSyncService.ts:692-710`). A game removed upstream is deleted
  from the local database even though the file is still on disk — it becomes
  invisible and unplayable in both flashpoint-web and the Launcher, and its
  `game_data` and tag rows are orphaned.
- The upsert inserts games added upstream since the snapshot. Ultimate has no
  files for them, so they appear in the library and fail to launch.
- No backup of `flashpoint.sqlite` is taken before any of this.
- With `ENABLE_LOCAL_DB_COPY=true`, the writes land on the container's copy and
  are wiped the next time the Launcher touches the source.

**Status: implemented** (advanced override, edition-aware message, confirmation
on enable). The remaining safety work — making the deletion pass opt-in and
snapshotting `flashpoint.sqlite` before a sync — is still open.

**Agreed approach:** the mixed library that results is acceptable, but the
capability stays behind an explicit opt-in.

- Add an advanced admin setting that lets an admin set the metadata source URL,
  validated against `MetadataSyncService.ALLOWED_HOSTS`.
- While that setting is off, Metadata Update shows an informational message: the
  Ultimate edition does not support metadata updates, and updating requires
  re-downloading the full package; advanced users can enable updates through the
  admin setting.
- Enabling the setting must raise a confirmation dialog first.

---

## 2. Ruffle installation blocks the server from listening

**Symptom:** After `docker compose up`, the published port refuses connections
for several minutes and the container reports `unhealthy`. Observed: 11.5 minutes
from start to the port opening.

**Root cause:** `await ruffleService.updateRuffle()` runs before
`app.listen()` (`server.ts`, ~line 283 versus 378), so nothing is served until
Ruffle finishes installing. The download itself is fast — measured 7.8 MB/s from
inside the container — but it competes for I/O with cache pre-warming and can
take minutes on slow storage. A GitHub outage would keep the port shut
indefinitely.

Contributing bug: `RuffleService` checks `frontend/public/ruffle` while the image
ships Ruffle at `frontend/dist/ruffle`, so a fresh container always re-downloads
something it already has.

**Approach:** move the Ruffle install after `listen()` as fire-and-forget with a
`.catch()`, matching how cache pre-warming already works, and point the
installation check at the directory the image actually ships.

---

## 3. Synchronous SQLite freezes the entire server

**Symptom:** Opening the Downloaded page on a slow filesystem made the whole app
unresponsive — `/health` timed out — for minutes at a time.

**Root cause:** `better-sqlite3` has no async API, so every query blocks the Node
event loop for its full duration. A filter-options request runs ~9 full-table
queries; on a Docker Desktop bind mount each took 8-50 seconds, and one request
was measured at 167 seconds of frozen event loop.

Measured on a 460 MB database: one filter-options query took 8.58 s across the
bind mount versus 0.08 s from the container's own volume and 0.147 s on the host.
Sequential throughput is fine (a full copy streams at ~132 MB/s); it is random
4 KB page access that collapses.

**Approach:** move database work to `worker_threads` with their own read-only
connections so a slow query can never freeze the server. `ENABLE_LOCAL_DB_COPY`
mitigates the symptom on slow storage but does not remove the blocking.

---

## 4. Images from a local mount are served without cache headers

**Symptom:** Image loading is slow when Flashpoint is mounted over SMB.

**Root cause:** in `routes/proxy.ts`, the CDN-fallback branch sets
`Cache-Control: public, max-age=86400` (line 135) but the local-file branch
(line 71) sets none. `sendFile` still emits `ETag`/`Last-Modified`, so browsers
revalidate every image on every page view instead of serving from cache.

Each of those requests costs four or more metadata round trips to the share:
`fs.existsSync` (line 49 — synchronous, so it blocks the event loop), `realpath`
on the file, `realpath` on the base directory, then `sendFile`'s own `stat`.

**Approach:** send the same cache header on the local branch, replace the
synchronous `existsSync` with a single async check, and resolve the base
directory once at startup instead of per request.

---

## 5. `npm test` never exits

**Symptom:** The documented `npm test` hangs until killed and leaves a process
holding resources.

**Root cause:** `backend/package.json` sets `"test": "vitest"` — watch mode — and
the root script forwards to it. `frontend/package.json` correctly uses
`vitest run`.

**Approach:** change the backend script to `vitest run`.

---

## 6. Frontend test suite fails on a clean checkout

**Symptom:** `cd frontend && npx vitest run` reports 69 failures across 6 files
(`ProtectedRoute`, `GameCard`, `PlaylistCard`, `useGames`, `lib/api/client`,
`store/auth`).

**Root cause:** every failure is `TypeError: localStorage.setItem is not a
function`, raised by zustand's persist middleware in the test environment. It
predates current work.

**Why it matters:** with that many failures as the normal state, a real
regression in those files would go unnoticed.

**Approach:** provide a `localStorage` implementation in the frontend test setup.
