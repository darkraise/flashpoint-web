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

A version counts as a release build only when it is three clean numbers, with an
optional leading `v` — `1.0.38` or `v1.0.38`. Anything else is an **unreleased
build**: the variable unset, `dev` from a local `docker build`, `latest` from a
`workflow_dispatch` run, a release candidate like `1.1.0-rc1`, or a
`git describe` string like `1.0.38-5-gabc123`. An unreleased build never claims
to be behind, because its commits may already include everything in the latest
release.

The comparison target is GitHub's
`/repos/darkraise/flashpoint-web/releases/latest`, which excludes prereleases by
definition. No prerelease filtering is needed, and release candidates never
surface.

Verified against the live endpoint on 2026-08-12: it answers 200 with
`tag_name: "v1.0.38"`, `prerelease: false`, `published_at`, `html_url`, and a
markdown `body`. The tag carries a leading `v` that `APP_VERSION` does not, so
both sides are stripped before comparing — the tag always has one, and a manual
`docker build --build-arg VERSION=v1.0.38` would otherwise be misread as
unreleased.

## The two version sources must not contradict each other

The frontend already resolves its own version at build time
(`frontend/vite.config.ts`, `frontend/src/lib/version.ts`) and shows it on the
General tab as "Web App Version". This design adds a second, server-side source,
and the two sit one tab apart.

In Docker they agree: both build stages receive the same `VERSION` build arg. In
a source checkout they can differ — the frontend falls back to `git describe`,
while the backend has no `APP_VERSION` at all — so the General tab could read
`1.0.38` while the card reads "unreleased build". The card's copy therefore
attributes the state to the server rather than to the operator: "The server did
not report a released version, so update checks are off."

`APP_VERSION` is documented in `docs/09-deployment/environment-variables.md` as
an optional operator-settable variable, so a non-Docker deployment can opt into
update checks.

## Backend

### `compareVersions(a, b)` — `backend/src/utils/version.ts`

Returns a negative number, zero, or a positive number by comparing major, minor,
and patch numerically, after stripping an optional leading `v` from each side.
Returns `null` when either input is not exactly three numeric parts, which is
what routes an unreleased build away from the comparison. Numeric comparison
matters: string ordering puts `1.0.9` above `1.0.38`.

A `null` result from a malformed *latest* tag — a hand-cut release tagged `v2.0`
— yields `updateAvailable: false`. Reporting nothing is preferable to reporting
a wrong direction.

### `AppUpdateService` — `backend/src/services/AppUpdateService.ts`

One public method, `getUpdateInfo(force = false)`, returning:

```ts
interface AppUpdateInfo {
  currentVersion: string | null; // null when APP_VERSION is unset
  latestVersion: string | null; // null when GitHub has never been reached
  updateAvailable: boolean;
  isUnreleasedBuild: boolean;
  publishedAt: string | null;
  releaseUrl: string | null;
  changelog: string | null;
  checkedAt: string | null; // when the held result was fetched
  lastCheckFailed: boolean;
}
```

The result is cached in memory for one hour and shared by every admin. The cache
holds the last *successful* result; a failed check returns that result with
`lastCheckFailed: true` rather than discarding it.

**Concurrency.** The in-flight fetch promise is stored and returned to
concurrent callers, so a cold cache hit by several requests at once produces one
GitHub call, not several.

**Forced refresh.** `force` bypasses the one-hour cache but not a 60-second
floor: a forced check within 60 seconds of the last fetch returns the held
result. `rateLimitStandard` is 100 requests per 60-second window
(`backend/src/config.ts`, `RATE_LIMIT_MAX_REQUESTS`), which is no protection for
a 60-per-hour unauthenticated GitHub quota that this feature shares with the
star-count proxy and the Ruffle update check. The floor is what keeps the quota
intact.

`isUnreleasedBuild: true` still fetches and reports `latestVersion` and the
changelog for reference, but forces `updateAvailable: false`.

### Failure handling

The route always answers 200. A total failure — no cached result and GitHub
unreachable — returns `latestVersion: null` with `lastCheckFailed: true`, and
the card renders its failed state.

It does **not** throw `AppError(502)`, because the axios interceptor in
`frontend/src/lib/api/client.ts` fires a global "Server error occurred" toast for
any status at or above 500. A card that renders its own inline error would
double up with that toast, which is what the Ruffle card does today.

`backend/src/routes/github.ts` is the precedent for serving a stale result, but
it is a weaker version of this design and should not be copied line for line: it
throws a plain `Error`, has no request timeout, and its stale path covers only a
non-OK response, so a network failure or hang bypasses the cache entirely. Here
the `try` wraps the whole fetch, and the request carries an explicit timeout.

### `GET /api/updates/app`

Added to `backend/src/routes/updates.ts` behind `authenticate` and
`requirePermission('settings.update')` from `../middleware/rbac`. That matches
the tab's own gate in `UpdateSettingsTab.tsx`; note that two GETs in that file
use `settings.read`, so "the same as its neighbours" is not exact.

The handler returns the bare `AppUpdateInfo` object — `res.json(info)` — as
every endpoint in `updates.ts` does and as `updatesApi` expects. The
`{success, data}` envelope in `github.ts` is that router's convention, not this
one.

`?refresh=true` sets `force`, read as `req.query.refresh === 'true'`. Any other
value, array, or object is falsy, so no schema or bounds check is warranted; the
60-second floor is the real control. `rateLimitStandard` already applies to the
whole router.

### `config.appVersion`

`process.env.APP_VERSION?.trim() || null`, added to `backend/src/config.ts`
beside the Flashpoint version fields. `||` is deliberate here and must not be
"corrected" to `??`: an empty or whitespace-only variable has to collapse to
`null`, which `??` would not do.

### Dockerfile

The final stage already declares `ARG VERSION=dev` for the image label. It gains
`ENV APP_VERSION=$VERSION`, since an `ARG` alone does not survive into the
running container.

## Frontend

`AppUpdateCard` — `frontend/src/components/settings/AppUpdateCard.tsx` — renders
first in `UpdateSettingsTab`, above the metadata and Ruffle cards, admin-only
like both of them.

A `useQuery` on mount performs the check. The Check button cannot be a
`refetch()`, which reuses the original query function and so cannot add
`refresh=true`; it is a `useMutation` calling the endpoint with the flag, writing
its result back through `queryClient.setQueryData`. This is the shape the Ruffle
card already uses.

The card reuses the vocabulary of `RuffleManagementCard`: a collapsible
changelog rendered with `react-markdown` and `remark-gfm`, `FormattedDate` for
the release date, the same button placement and toast behaviour. No sanitizer is
added — without `rehype-raw`, react-markdown escapes raw HTML, and the source is
the project's own CI-generated release notes.

Five states:

| State            | Condition                                | Shows                                                                                                    |
| ---------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Update available | `updateAvailable`                        | Both versions, release date, changelog expanded, link to the release, upgrade commands                   |
| Up to date       | versions match                           | Current version and when it was checked                                                                  |
| Unreleased build | `isUnreleasedBuild`                      | "The server did not report a released version, so update checks are off", plus the latest release for reference |
| Stale            | `lastCheckFailed` with a `latestVersion` | The held result, labelled as a check that failed at `checkedAt`                                          |
| Check failed     | `lastCheckFailed`, no `latestVersion`    | A muted error and a retry button                                                                         |

The upgrade command is `docker compose pull && docker compose up -d`, matching
the deployment `docker-compose.yml` documents. That file pins
`image: darkraise/flashpoint-web:${IMAGE_TAG:-latest}`, so the card adds one
line: an operator who set `IMAGE_TAG` to a fixed version must raise it first, or
the pull is a no-op.

The release body generated by CI opens with its own "## Docker Image" section
carrying a `docker pull` line, so the changelog repeats part of this. The card
still states the commands itself, because the compose commands are the actual
upgrade and the changelog is collapsible.

The API call goes through `updatesApi` in `frontend/src/lib/api/updates.ts`, with
`AppUpdateInfo` declared there and re-exported from `lib/api/index.ts`, as the
other update types are.

## Testing

Backend unit tests in the repo's existing style, with no test for the card —
`components/settings` has no test coverage today and this change does not
introduce the pattern.

- `compareVersions`: equal, newer, older, multi-digit ordering (`1.0.38` above
  `1.0.9`), a leading `v` on either or both sides, and malformed inputs (`dev`,
  `latest`, `1.0.38-5-gabc123`, `1.0`, empty).
- `AppUpdateService` with a mocked fetch: update available, up to date,
  unreleased build, malformed latest tag, cache hit inside the hour, forced
  refresh honoured after the 60-second floor and ignored inside it, one GitHub
  call for concurrent cold-cache requests, a held result returned with
  `lastCheckFailed` after a failure, and a 200 with `latestVersion: null` when a
  failure has no cache to fall back on.

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

## Known limitation, not addressed here

A `workflow_dispatch` run of the build workflow tags the image `:latest` and
passes `VERSION=latest`, so that image reports an unreleased build. The card
makes a pre-existing CI wart visible; fixing it means changing what the manual
trigger publishes, which is out of scope for this feature.
