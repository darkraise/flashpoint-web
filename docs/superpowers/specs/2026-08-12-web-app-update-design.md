# Web app update check on the Update page

Date: 2026-08-12

## Goal

An admin opening Settings → Update sees whether a newer release of Flashpoint
Web exists, what changed in it, and how to upgrade.

The card notifies only. It never pulls an image, restarts a container, or writes
anything: self-updating from inside the container needs the Docker socket
mounted, which hands the container root-equivalent control of the host.

## What counts as an update

The running version comes from `APP_VERSION`, an environment variable baked into
the image from the `VERSION` build arg that CI already passes (see
`.github/workflows/docker-build-push.yml`). This mirrors `VITE_APP_VERSION`,
which the frontend build consumes for the same value.

A version counts as a release build only when it is three clean numbers —
`1.0.38`. Anything else is a development build: the variable unset, `dev` from a
local `docker build`, or a `git describe` string like `1.0.38-5-gabc123`. A
development build never claims to be behind, because its commits may already
include everything in the latest release.

The comparison target is GitHub's
`/repos/darkraise/flashpoint-web/releases/latest`, which excludes prereleases by
definition. No prerelease filtering is needed, and release candidates never
surface.

Verified against the live endpoint on 2026-08-12: it answers 200 with
`tag_name: "v1.0.38"`, `prerelease: false`, `published_at`, `html_url`, and a
markdown `body`. The tag carries a leading `v` that `APP_VERSION` does not, so
the service strips it before comparing.

## Backend

### `compareVersions(a, b)` — `backend/src/utils/version.ts`

Returns a negative number, zero, or a positive number by comparing major, minor,
and patch numerically. Returns `null` when either input is not exactly three
numeric parts, which is what routes a development build away from the
comparison. Numeric comparison matters: string ordering puts `1.0.9` above
`1.0.38`.

### `AppUpdateService` — `backend/src/services/AppUpdateService.ts`

One public method, `getUpdateInfo(force = false)`, returning:

```ts
interface AppUpdateInfo {
  currentVersion: string | null; // null on a development build with no APP_VERSION
  latestVersion: string | null; // null when GitHub has never been reached
  updateAvailable: boolean;
  isDevBuild: boolean;
  publishedAt: string | null;
  releaseUrl: string | null;
  changelog: string | null;
  checkedAt: string; // when the cached result was fetched
  stale: boolean; // the last check failed; this is an older result
}
```

The result is cached in memory for one hour and shared by every admin, so the
server makes at most 24 GitHub calls a day against the unauthenticated limit of
60 per hour per IP. `force` bypasses the cache for the manual Check button.

Failure handling follows `routes/github.ts`, which already serves a stale star
count when GitHub rate-limits it: a failed call with a cached result returns
that result with `stale: true`; a failed call with no cache throws
`AppError(502)`. The request carries an explicit timeout so a hung call cannot
tie up the handler.

`isDevBuild: true` short-circuits nothing — the service still reports
`latestVersion` and the changelog for reference — but forces
`updateAvailable: false`.

### `GET /api/updates/app`

Added to `backend/src/routes/updates.ts` behind `authenticate` and
`requirePermission('settings.update')`, matching every other endpoint in that
file. `?refresh=true` sets `force`. `rateLimitStandard` guards it, as it does the
other update endpoints.

### `config.appVersion`

`process.env.APP_VERSION?.trim() || null`, added to `backend/src/config.ts`
beside the Flashpoint version fields.

### Dockerfile

The final stage already declares `ARG VERSION=dev` for the image label. It gains
`ENV APP_VERSION=$VERSION` so the running server can read it.

## Frontend

`AppUpdateCard` — `frontend/src/components/settings/AppUpdateCard.tsx` — renders
first in `UpdateSettingsTab`, above the metadata and Ruffle cards, admin-only
like both of them.

It fetches through TanStack Query on mount, so opening the tab performs the
check; the Check button refetches with `refresh=true`. The card reuses the
vocabulary of `RuffleManagementCard`: a collapsible changelog rendered with
`react-markdown` and `remark-gfm`, `FormattedDate` for the release date, the
same button placement and toast behavior.

Four states:

| State             | Shows                                                                                                                        |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Update available  | Both versions, release date, changelog expanded, link to the GitHub release, and the upgrade command in a copyable code block |
| Up to date        | Current version and when it was checked                                                                                      |
| Development build | "Development build — update checks are off", with the latest release named for reference                                     |
| Check failed      | A muted error and a retry button; a stale result stays visible and is labelled as such                                       |

The upgrade command is `docker compose pull && docker compose up -d`, matching
the deployment `docker-compose.yml` documents. The release body generated by CI
opens with its own "## Docker Image" section carrying a `docker pull` line, so
the changelog repeats part of this; the card still states the command itself,
because the compose commands are the actual upgrade and the changelog is
collapsible. The API call goes through
`updatesApi` in `frontend/src/lib/api/updates.ts`, like every other update
endpoint.

## Testing

Backend unit tests in the repo's existing style, with no test for the card —
`components/settings` has no test coverage today and this change does not
introduce the pattern.

- `compareVersions`: equal, newer, older, multi-digit ordering (`1.0.38` above
  `1.0.9`), and malformed inputs (`dev`, `1.0.38-5-gabc123`, `1.0`, empty).
- `AppUpdateService` with a mocked fetch: update available, up to date,
  development build, cache hit inside the hour, forced refresh, stale result
  after a failed call, and `AppError(502)` on a failed call with no cache.

## Decisions taken

- **Notify only.** Self-update requires the Docker socket; a restart-only button
  cannot pull, so it would only ever help someone who had already pulled.
- **The repository is hardcoded** to `darkraise/flashpoint-web`, as it already is
  in the star-count proxy. A fork wanting its own release feed would need this
  made configurable; nothing here is designed to prevent that later.
- **Docker Compose is the documented deployment**, so it is the only upgrade
  command shown.
- **No notification badge** elsewhere in the UI, and no scheduled background
  check. The cached on-open check covers the stated goal; a `JobScheduler` job
  would be the way to add a badge later.
