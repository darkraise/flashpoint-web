# Persistent Ruffle installation

Date: 2026-08-13

## Goal

A Ruffle version installed through Settings → Update survives container
recreation. Today it does not: the update lands in the container's writable
layer, and the next `docker compose up -d` after an image pull or a config
change throws it away.

## Why it reverts

`RuffleService` installs into `config.frontendDistPath/ruffle` — `/app/frontend/dist/ruffle`
inside the container. The only mounted volumes are `/data/flashpoint`,
`/app/data`, and `/app/logs`, so that path lives entirely in the overlay
writable layer.

`frontend/public/ruffle/` is committed to the repository at
`0.2.0-nightly.2026.1.29`. Vite copies `public/` into `frontend/dist/` at build
time and the Dockerfile bakes that directory into the image. When a recreate
discards the writable layer, the baked copy is what remains.

Startup only downloads when `verifyInstallation()` is false
(`backend/src/server.ts:302`). The baked copy satisfies that check, so the
server logs the stale version and keeps it. The scheduled `ruffle-update` job
would eventually re-apply the update, but only if that job is enabled.

A plain `docker restart` preserves the writable layer and does not trigger this.
The recreate paths do: `docker compose up -d` after an image pull or any change
to the resolved service config, `down` then `up`, `--force-recreate`, and the
update actions in Portainer and Unraid.

## Install location

A new `config.ruffleDataPath` names the install directory:

```
process.env.RUFFLE_DATA_PATH ??
  (NODE_ENV === 'production' ? '/app/data/ruffle' : <repo>/backend/data/ruffle)
```

`RuffleService` swaps only its `serveFrontend` branch to this path. The other
branch keeps writing to `frontend/public/ruffle`, because in a source checkout
Vite serves `public/` and an install anywhere else would not be reachable.

`docker-compose.dev.yml` sets `RUFFLE_DATA_PATH=/app/data/ruffle` explicitly. It
runs `NODE_ENV=development` with `SERVE_FRONTEND=true`, so the production-keyed
default would miss its `backend-db:/app/data` volume. The file already sets
`FLASHPOINT_PATH` for exactly this reason, and the new variable follows that
precedent. Production compose needs no change: `NODE_ENV=production` already
resolves to the right path.

The entrypoint chowns `/app/data` to the app user on every start, so a non-default
`PUID` can write the new directory without further work.

## Seeding a fresh install

`RuffleService.ensureInstalled()` replaces the inline block at
`backend/src/server.ts:299-314` and resolves in three steps:

1. `ruffle.js` exists at the data path — log the version and stop.
2. Otherwise the image's bundled `frontend/dist/ruffle` exists — copy it into
   the data path via the existing private `copyDirectory`.
3. Otherwise — download the latest release from GitHub, which is the current
   behaviour.

Seeding from the bundle rather than downloading means Flash works the moment a
fresh container is up, and works at all on a host that cannot reach GitHub. The
copy is roughly 20 MB and happens once per persisted volume, not once per
container.

The call stays fire-and-forget in the background. Awaiting it would hold the
port closed for the duration of a download, which is the regression the current
comment at `server.ts:296-298` records.

## Serving

`registerFrontendServing` mounts the data path at `/ruffle` **before**
`express.static(distPath)`, so the persisted copy shadows the baked one. The
mount uses `fallthrough: true`: if the persisted tree is missing a file, the
baked `dist/ruffle` still answers rather than 404ing into a dead player.

The frontend needs no change. `RufflePlayer.tsx` already loads
`/ruffle/ruffle.js` and sets `publicPath: '/ruffle/'`, both of which the new
mount serves.

## Cache headers

The dist handler currently serves everything with `maxAge: '1y', immutable: true`,
including `ruffle/ruffle.js`, which is not content-hashed. A browser that has
loaded the page once will therefore keep the old loader for a year, so
persistence alone would not make an update visible to returning users.

A shared helper decides the policy from the basename: `immutable, max-age=1y`
when it contains a hex run of 16 or more characters, otherwise
`no-cache, no-store, must-revalidate`. Ruffle's chunks carry such a run
(`core.ruffle.4ca82b563e9711217164.js`, `f2a570ccf4468b20d95a.wasm`) while its
stable entry points do not (`ruffle.js`, `ruffle.js.map`, `package.json`).
Detecting the hash rather than listing the stable names keeps the rule correct
when a future Ruffle release adds a file.

The helper applies to both the new `/ruffle` mount and to `ruffle/` paths under
the dist handler, so the fallback cannot reintroduce a stale loader.

## Testing

`RuffleService.test.ts` mocks `../config`; that mock gains `ruffleDataPath` and
the existing `ruffleDir()` helper points at it. The update tests are otherwise
unchanged — they exercise the rename and copy fallbacks, which the new path does
not alter.

New cases cover `ensureInstalled()`:

- an existing install is left alone and no download is attempted;
- an empty data path with a bundled copy present is seeded from the bundle, and
  no download is attempted;
- an empty data path with no bundle falls through to the download.

A new `frontendServing` test asserts the `/ruffle` mount is registered ahead of
the dist handler, that `ruffle.js` comes back revalidating, and that a hashed
chunk comes back immutable.

## Out of scope

`config.userDbPath` and `config.tempDownloadPath` use the same
`NODE_ENV === 'production'` keying as the new variable. In the dev compose
container that evaluates to `development`, so `user.db` lands at
`/app/backend/user.db` and the `backend-db:/app/data` volume goes unused — dev
container app data is not persisted today. Real, but unrelated to Ruffle, and
touching database paths carries risk this change does not need.
