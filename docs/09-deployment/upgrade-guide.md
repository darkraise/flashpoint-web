# Upgrade Guide and Release Notes

How to move an existing deployment to a newer version, and what changed in each
release. Versions follow the git tags published on Docker Hub.

> **Upgrading from 1.0.31 or earlier?** The deployment model changed in 1.0.32:
> the separate backend and frontend containers were replaced by a single image.
> Read [Upgrading from 1.0.31](#upgrading-from-1031) before pulling.

---

## Upgrading from 1.0.31

### What changed

Up to 1.0.31 a deployment ran two containers: `darkraise/flashpoint-backend`
(Node/Express, port 3100) and `darkraise/flashpoint-frontend` (nginx serving the
built React app on port 8080, proxying `/api` to the backend).

From 1.0.32 there is one image, `darkraise/flashpoint-web`. The Express backend
serves the built React UI and its SPA fallback alongside the API and game
content, so the whole app lives on one origin and one port.

```
Before (<= 1.0.31)                     After (>= 1.0.32)
  flashpoint-frontend  :80  -> nginx     flashpoint-web  :80 -> :3100
  flashpoint-backend   :3100 -> Express    /            built React UI
                                           /api, /game-proxy, /game-zip
```

The old `flashpoint-backend` and `flashpoint-frontend` images are no longer
built or published. 1.0.31 is the last version available under those names.

### Migration steps

1. **Stop and remove the old stack.** From the directory holding your existing
   compose file:

   ```bash
   docker compose down
   ```

   This removes the `flashpoint-backend` and `flashpoint-frontend` containers.
   Named volumes and bind mounts are kept.

2. **Replace `docker-compose.yml`** with the single-service version from the
   [README](../../README.md#2-create-docker-composeyml). The service is now named
   `flashpoint-web`, maps `${WEB_PORT:-80}` to container port `3100`, and has no
   `frontend` service and no `depends_on`.

3. **Update `.env`** — see the variable tables below. At minimum, delete
   `API_PORT`, `BACKEND_HOST`, and `BACKEND_PORT`; they are no longer read by
   anything.

4. **Check the Flashpoint mount.** As of 1.0.36 the shipped compose mounts it
   read-write (no `:ro`). Downloading games, recording downloaded state in
   `flashpoint.sqlite`, and metadata sync all write into that directory. Leaving
   `:ro` in place still allows browsing and playing already-downloaded games, but
   the Downloaded page will stay empty and the reconciler logs a warning on every
   boot.

5. **Update your reverse proxy, if you have one.** Configurations that defined
   two upstreams — the UI on the web port and the API on port 3100 — must be
   collapsed into a single upstream on `WEB_PORT`. Any rule routing `/api` to
   port 3100 will break, because nothing listens there on the host anymore.
   Firewall rules opening port 3100 can be removed.

6. **Pull and start.**

   ```bash
   docker compose pull && docker compose up -d
   ```

### What is preserved

Application data is untouched by the migration. `user.db` (accounts, playlists,
favourites, play history, settings) lives in the `DATA_PATH` bind mount at
`/app/data` and is used unchanged by the new image. Log and Flashpoint mounts
keep their paths. No database migration is required beyond the ones the backend
applies on startup.

### Environment variable changes

**Removed** — delete these from `.env`; they have no effect:

| Variable       | Replacement                                          |
| -------------- | ---------------------------------------------------- |
| `API_PORT`     | `WEB_PORT` — one port now serves both the UI and API |
| `BACKEND_HOST` | none — there is no cross-container proxy             |
| `BACKEND_PORT` | none — same reason                                   |

`PORT` and `HOST` were documented as configurable before 1.0.32 but never were:
the backend binds `0.0.0.0:3100` unconditionally, and the Docker `EXPOSE` and
healthcheck depend on that. The docs were corrected rather than the code.

**Added:**

| Variable                       | Default                          | Since  | Description                                                     |
| ------------------------------ | -------------------------------- | ------ | --------------------------------------------------------------- |
| `SERVE_FRONTEND`               | `true` in production, else false | 1.0.32 | Serve the built UI and SPA fallback from the backend            |
| `FRONTEND_DIST_PATH`           | `/app/frontend/dist` in image    | 1.0.32 | Where the built UI lives; rarely needs overriding               |
| `FLASHPOINT_GAMES_PATH`        | `<FLASHPOINT_PATH>/Data/Games`   | 1.0.32 | Override the game ZIP directory                                 |
| `OTEL_METRICS_EXPORT_INTERVAL` | `60000`                          | 1.0.32 | Metrics export interval in milliseconds                         |
| `OTEL_LOG_LEVEL`               | `info`                           | 1.0.32 | OpenTelemetry SDK log level                                     |
| `COOKIE_SECURE`                | `auto`                           | 1.0.34 | Secure flag on auth cookies: `auto`, `true`, `false`            |
| `UV_THREADPOOL_SIZE`           | `16`                             | 1.0.36 | File I/O threads; Node's own default of 4 throttles image reads |
| `DB_WORKER_COUNT`              | `4`                              | 1.0.36 | Read-only SQLite query worker threads (1–16)                    |

`UV_THREADPOOL_SIZE=16` is baked into the image, so it applies whether or not
your compose file passes it.

**Changed:**

| Variable            | Change                                                                                                                                                                       |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DOMAIN`            | Now accepts a comma-separated list of origins. Same-origin requests are always allowed, so a standard single-image install needs no value at all. Default ports are normalized: `http://host:80` and `http://host` are treated as the same origin. |
| `IMAGE_TAG`         | Selects the tag of `darkraise/flashpoint-web` instead of the two old images.                                                                                                 |
| `OTEL_SERVICE_NAME` | Default changed from `flashpoint-web-backend` to `flashpoint-web`. Update dashboards and alert queries that filter on the old name.                                           |
| `LOGS_PATH`         | Dev compose mounts it at `/app/logs` directly; it previously mounted `${LOGS_PATH}/backend`.                                                                                  |

**Newly passed through compose** (these already existed in the backend, but the
shipped compose files now forward them with documented defaults):
`JWT_EXPIRES_IN`, `BCRYPT_SALT_ROUNDS`, `RATE_LIMIT_WINDOW_MS`,
`RATE_LIMIT_MAX_REQUESTS`, `HOME_RECENT_HOURS`, `ENABLE_CGI`.

`FLASHPOINT_PATH=/data/flashpoint` is now set explicitly in the dev compose file.
The backend's fallback only points there when `NODE_ENV=production`, so a
development container previously looked at the wrong path.

### Rolling back

Pin the old images (`darkraise/flashpoint-backend:1.0.31` and
`darkraise/flashpoint-frontend:1.0.31`) and restore the two-service compose file
and the `.env` entries removed in step 3. Application data written by 1.0.32+ is
readable by 1.0.31. Downloaded state is recorded in Flashpoint's own
`presentOnDisk` and `path` columns, which the Launcher already understands;
1.0.31 simply does not surface it.

---

## [1.0.36] — 2026-08-12

### Fixed

- **Flashpoint directory is mounted read-write by default.** The shipped compose
  files mounted it `:ro`, which silently failed every write the app makes:
  downloaded-state flags in `flashpoint.sqlite`, downloaded game data under
  `Data/Games`, and metadata sync. If you copied an earlier compose file, drop
  the `:ro` suffix.
- Image preloads are cancelled when a request is abandoned, so scrolling a large
  library no longer queues work for images that left the viewport.

### Added

- A metadata sync can optionally download game images afterwards.

### Performance

- Heavy read-only queries run in SQLite worker threads (`DB_WORKER_COUNT`,
  default 4). `better-sqlite3` is synchronous, and a filter-options query over a
  slow mount was measured blocking the entire server for 167 seconds — `/health`
  timed out along with everything else.
- `UV_THREADPOOL_SIZE` is set to 16 in the image. libuv's default of 4 throttled
  every image and ZIP read in the process, which dominates on network storage.

## [1.0.35] — 2026-08-12

### Added

- Admins can choose the metadata source used for syncs.

### Fixed

- Ruffle installs in the background and into the directory that is actually
  served (`frontend/dist/ruffle`). Startup previously awaited the download, so
  the port stayed closed for minutes on slow storage — indefinitely if the
  download stalled — and a fresh container re-downloaded the Ruffle it already
  shipped.
- Locally served images are cached and no longer block on `stat`.
- `npm test` runs the backend suite once instead of entering watch mode.

## [1.0.34] — 2026-08-11

### Fixed

- **Auth cookies are marked `Secure` per connection, not per `NODE_ENV`.**
  Production builds previously always set `Secure`, and browsers discard such a
  cookie when it arrives over plain HTTP — logging LAN users straight back out
  after login. The new default, `COOKIE_SECURE=auto`, decides per request based
  on TLS (reading `X-Forwarded-Proto` when behind a proxy), so one deployment can
  serve HTTP on a LAN and HTTPS through a proxy at once. Set `COOKIE_SECURE=true`
  if your TLS-terminating proxy does not send that header.

### Documentation

- README carries a minimal working `.env` example and refreshed sections.

## [1.0.33] — 2026-08-11

### Fixed

- **CORS origins are normalized and same-origin requests are always allowed.**
  With the UI and API on one origin, most deployments no longer need `DOMAIN` at
  all. `DOMAIN` also accepts a comma-separated list, and explicit default ports
  (`:80`, `:443`) match the port-less origin a browser actually sends.
- The dev compose file passes `FLASHPOINT_PATH=/data/flashpoint` explicitly.

### Performance

- Downloaded filter options are cached indefinitely.

## [1.0.32] — 2026-08-11

### Breaking

- **Single image deployment.** The backend and frontend images were collapsed
  into `darkraise/flashpoint-web`, which serves the API, game content, and the
  built UI from one Express process on port 3100. The `frontend` service, its
  nginx config and entrypoint, and the per-service Dockerfiles are gone; the
  release workflow builds one image instead of a two-service matrix. See
  [Upgrading from 1.0.31](#upgrading-from-1031).
- `API_PORT`, `BACKEND_HOST`, and `BACKEND_PORT` were removed. Map a host port
  with `WEB_PORT` instead.

### Added

- Downloaded games page, filter, and settings: browse games whose data is already
  on disk, with the filter encoded in the URL and downloaded state reconciled
  from disk at startup.
- 5-star game rating system.
- Setting to toggle the "I'm Feeling Lucky" button.

### Security

- The SPA-oriented CSP was ported from nginx into Helmet and hardened, dropping
  `unsafe-inline` and `unsafe-eval`. The strict API-only policy still applies
  when `SERVE_FRONTEND` is off.

### Fixed

- Guest browsing survives auth-only 401s instead of falling into a redirect loop
  (thanks @MaxfieldKassel).
- Invalid `SQLITE_CACHE_SIZE` and `SQLITE_MMAP_SIZE` values fall back to their
  defaults instead of becoming `NaN`.
