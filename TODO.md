# TODO - Deferred Improvements

Items skipped during code review fixes due to architectural risk. These require
careful design and testing beyond a batch fix.

## Phase 2

## M3. Consolidate two independent download systems

- **Files:** `backend/src/routes/downloads.ts`,
  `backend/src/game/gamezipserver.ts`
- **Problem:** `DownloadManager` and `GameDataDownloader` operate independently
  with no coordination. `MAX_CONCURRENT_DOWNLOADS = 3` only limits
  gamezipserver. The same game could be downloaded by both simultaneously.
- **Fix:** Consolidate into a single download orchestration layer, or add a
  shared registry to prevent duplicate downloads and enforce a global
  concurrency limit.

## M4. SSE progress endpoint can't track game-zip-server downloads

- **Files:** `backend/src/routes/downloads.ts:195-273`
- **Problem:** Progress SSE calls `DownloadManager.isDownloadActive()` which
  only tracks `DownloadManager` downloads. `GameDataDownloader` downloads are
  invisible to the progress endpoint.
- **Fix:** Wire `GameDataDownloader` events into the SSE endpoint, or use a
  unified download status source.

## M7. Repeated filesystem scanning during download polling

- **Files:** `backend/src/game/gamezipserver.ts`,
  `backend/src/services/GameDataService.ts:65-72`
- **Problem:** Each 2s poll from the frontend calls `fs.readdir(gamesPath)`. The
  file being downloaded uses a `.temp` path so it doesn't exist yet, causing a
  full readdir on every poll.
- **Fix:** Add a fast-path check against the `downloadsInProgress` map before
  doing filesystem operations.

## M13. No caching for filesystem playlist reads

- **Files:** `backend/src/services/PlaylistService.ts:60-108`
- **Problem:** `getAllPlaylists()` does `readdir` + `readFile` + `JSON.parse`
  per file on every request. No caching.
- **Fix:** Add in-memory cache with file watcher invalidation (similar to
  `DatabaseService` hot-reload pattern).

## M17. Change-password uses ad-hoc auth instead of RBAC middleware

- **Files:** `backend/src/routes/users.ts:231-265`
- **Problem:** Manually checks `req.user?.permissions.includes('users.update')`
  instead of using `requirePermission()` middleware. Inconsistent with all other
  endpoints.
- **Fix:** Split into separate self-change and admin-reset endpoints, or apply
  the standard RBAC middleware pattern.

## Phase 3

### M1. Activity filters do not sync to URL search params

- **File:** `frontend/src/hooks/useActivityFilters.ts:21-51`
- **Problem:** Filter state is stored in `useState` only. Filters are lost on
  page refresh and cannot be shared via URL. Admins investigating a specific
  user's activity cannot bookmark or share the filtered view.
- **Fix:** Use React Router's `useSearchParams` to persist filter state in the
  URL query string.

### M2. Duplicated `categorizeAction` function across frontend and backend

- **Files:** `backend/src/utils/activityUtils.ts:15-31`,
  `frontend/src/utils/activityUtils.ts:8-24`
- **Problem:** Identical `categorizeAction` function in both codebases. If
  categorization rules change, both files must be updated in sync.
- **Fix:** Create a shared package or shared types directory. At minimum, add
  cross-reference comments and a test verifying they produce the same results.

### M3. Duplicated time range button pattern across 5 dashboard components

- **Files:** `ActivityDashboard.tsx`, `ActivityTrendChart.tsx`,
  `TopActionsChart.tsx`, `ResourceDistributionChart.tsx`, `UserLeaderboard.tsx`
- **Problem:** The same three-button time range selector (24h/7d/30d) with
  identical styling is copy-pasted across all 5 dashboard components (~150 lines
  total).
- **Fix:** Extract a shared `TimeRangeSelector` component.

### M7. Remove async from all ActivityService methods

- **File:** `backend/src/services/ActivityService.ts`
- **Problem:** All methods are declared `async` but use only synchronous
  `UserDatabaseService` calls (better-sqlite3). Creates unnecessary Promise
  wrapping and is misleading about the execution model.
- **Fix:** Remove `async` from all methods and update return types. Broader
  refactor that may affect many callers.

### M8. Correlated subqueries in `getTopActions()` — N+1-like performance

- **File:** `backend/src/services/ActivityService.ts:323-360`
- **Problem:** Three correlated subqueries (topResource, exampleUsername,
  exampleTimestamp) each rescan `activity_logs` for every action group. Slow on
  large tables. `exampleUsername` subquery lacks ORDER BY (non-deterministic).
- **Fix:** Use CTEs or window functions to reduce scans. Add ORDER BY to
  exampleUsername subquery.

### M37. No hash/integrity validation on downloaded Ruffle ZIP

- **File:** `backend/src/services/RuffleService.ts:134-146`
- **Problem:** Downloaded Ruffle ZIP is extracted and installed without any
  hash/checksum validation. If HTTPS is compromised (e.g., corporate proxy),
  arbitrary files could be written to `frontend/public/ruffle`.
- **Fix:** Compute SHA-256 hash after download and validate against expected
  value from the GitHub release API or a separately-fetched checksum file.

### M38. GitHub release query does not filter for nightly/prerelease

- **File:** `backend/src/services/RuffleService.ts:60-98`
- **Problem:** Queries `?per_page=1` without filtering for prereleases. If
  Ruffle publishes a stable release, this code would pick it up even though it
  expects nightly format.
- **Fix:** Filter for nightly tags explicitly (e.g.,
  `r.tag_name.startsWith('nightly-')`).

## Phase 4

### M1. `useIsMobile` hook should replace inline `window.innerWidth` checks

- **Files:** `Sidebar.tsx`, `Header.tsx`, and other components
- **Problem:** Multiple components check `window.innerWidth < 1024` inline
  instead of using the existing `useIsMobile` hook. This duplicates breakpoint
  logic and doesn't react to window resize.
- **Fix:** Refactor all inline `window.innerWidth` checks to use the
  `useIsMobile` hook.

### M7-M8. Zustand selectors should use `useShallow` in 30+ files

- **Files:** All components using `useUIStore`, `useAuthStore`, etc.
- **Problem:** Most Zustand store subscriptions destructure the entire store
  (e.g., `const { x, y } = useStore()`) causing unnecessary re-renders when
  unrelated state changes.
- **Fix:** Audit all Zustand usages and add `useShallow` selectors for
  components that only need a subset of state. ~30+ files affected.

### M16. Add TypeScript generics to ~24 API calls missing explicit types

- **Files:** Various files in `frontend/src/lib/api/`
- **Problem:** ~24 API calls use `api.get(...)` without explicit response type
  generics, relying on `any` inference.
- **Fix:** Add explicit type parameters to all API calls (e.g.,
  `api.get<{ success: boolean; data: T }>(...)`).

### M29. Streaming log reader for large error logs

- **File:** `frontend/src/components/error/ErrorReporter.ts`
- **Problem:** Error log display loads the entire log into memory. For large
  logs, this can cause performance issues.
- **Fix:** Implement a streaming/virtual log reader.

### M30. ErrorReporter should use authenticated client when available

- **File:** `frontend/src/components/error/ErrorReporter.ts`
- **Problem:** `reportError` uses raw `fetch()` instead of the authenticated API
  client. Error reports from authenticated users lose their identity context.
- **Fix:** Use `apiClient` when available, fall back to `fetch()` for errors
  during auth flow.

### L4/L19. Replace `window.location.href = '/'` with React Router navigation

- **Files:** `ErrorBoundary.tsx`, other error components
- **Problem:** Using `window.location.href` for navigation causes a full page
  reload instead of a client-side transition.
- **Fix:** Use React Router's `useNavigate` or `<Link>` component. Note: class
  components can't use hooks directly — requires wrapper or conversion to
  functional component.

### L7/L37. DRY error boundary components into a shared base

- **Files:** All 5 error boundary components
- **Problem:** `ErrorBoundary`, `GameLibraryErrorBoundary`,
  `GamePlayerErrorBoundary`, `PlaylistErrorBoundary`, and
  `ActivityErrorBoundary` share ~70% identical code (state shape, error
  reporting, retry logic, theme patterns).
- **Fix:** Extract a shared `BaseErrorBoundary` class or create a higher-order
  component factory that accepts configuration for title, retry behavior, and
  troubleshooting tips.
