# Downloaded games: page, filter, and settings

Date: 2026-08-11

## Goal

1. A "Downloaded" sidebar entry and page listing only downloaded games.
2. A downloaded filter in the filter panel on the existing browse pages.
3. An admin setting to show or hide the Downloaded page.
4. An admin setting that lets guests see the Downloaded page, offered only when
   the page itself is enabled.
5. An admin setting that turns the downloaded filter on by default.

## Definition of "downloaded"

A game is downloaded when it has at least one `game_data` row with
`presentOnDisk = 1`.

Games with no `game_data` rows at all — legacy titles served from htdocs — can
never be downloaded under this definition and never appear on the page. This
matches the existing per-game badge, which reads the same flag through the
`MAX(presentOnDisk)` post-processing in `GameService.searchGames`.

## Keeping the flag truthful

`presentOnDisk` is currently written only by the Flashpoint Launcher and by the
explicit Download button (`DownloadManager` → `GameDatabaseUpdater.markAsDownloaded`).
Three gaps must close before the flag can drive a whole page.

**Play-path downloads never set it.** `GameZipServer.downloadAndMountInBackground`
writes the ZIP and returns without touching the database. On success it will call
`GameDatabaseUpdater.markAsDownloaded`. The `game_data.id` is already loaded by
`GameDataService.getGameDataEntry`; thread it through the `mountZip` params rather
than re-querying by `gameId` + `dateAdded`. Mark the row even when `sha256` is
absent, since `GameDataDownloader` only verifies a checksum when one exists and the
file is otherwise a complete, mountable download.

**Local-copy mode erases the flag.** With `ENABLE_LOCAL_DB_COPY=true`, queries and
our writes hit `config.localDbPath`, and `DatabaseService.syncAndReload` copies the
source over that file whenever the Launcher's database changes. A new
`DownloadedReconciler` service restores truth from disk:

- Scan `config.flashpointGamesPath` for files matching `{uuid}-{timestamp}.zip`,
  the deterministic name produced by `GameDataDownloader.getFilename`.
- Resolve each to its `game_data` row by `gameId` plus the timestamp derived from
  `dateAdded`, and bulk-set `presentOnDisk = 1` in a single transaction, skipping
  rows already flagged.
- Update `game.activeDataOnDisk` where the marked row is the game's active data.
- Run once at startup after `DatabaseService` initialization, and again after every
  `syncAndReload`. Both runs are fire-and-forget with a `.catch()`; an unreadable
  games directory logs a warning and yields zero marks.

The reconciler only ever marks. It never clears the flag for a missing ZIP, because
the Launcher can store game data outside `flashpointGamesPath` and we would be
overwriting its state with a false negative.

This scan also backfills every game downloaded through the Play path before this
feature ships, which is otherwise the largest population of invisible downloads.

**Our own writes trigger a full reload.** In non-copy mode the write lands in the
file `DatabaseService` watches, so the watcher fires, reopens the connection, and
clears the search, flash-SWF, and filter-options caches — per download. Add
`DatabaseService.noteSelfWrite()`, which re-stats the source and advances
`lastModifiedTime` so `syncAndReload` short-circuits, and call it from
`markAsDownloaded` and the reconciler. The caller then clears only the search and
filter-options caches, so a freshly downloaded game appears immediately.

A Launcher write landing in the same millisecond as ours could be swallowed by this
check. The consequence is a delayed reload, not data loss, and the next Launcher
write recovers it.

## Backend filter

`downloaded?: boolean` joins the POST `/api/games` body schema, `GameSearchQuery`,
and the filter-options query schema. `true` restricts to downloaded games;
`false` and `undefined` both mean "no restriction", and the frontend omits the
field when the filter is off.

In `GameService.searchGames` the condition is:

```sql
AND EXISTS (SELECT 1 FROM game_data gd WHERE gd.gameId = g.id AND gd.presentOnDisk = 1)
```

`buildFilterOptionsConditions` gets the same condition so dropdown values and the
year range narrow to downloaded games; qualify the outer column with its table name
there, since those queries have no alias and `game_data` has its own `id` column.

Both `GameSearchCache.generateCacheKey` and `GameService.getFilterOptionsCacheKey`
include `downloaded`, normalized with `??` so `undefined` and `false` stay distinct.
Add `'downloaded'` to the `filters` array in the search route's `logActivity`
callback so the recorded filter count stays accurate.

## Frontend filter

`GameFilters.downloaded?: boolean` carries the value to the API.
`FilterUrlParams.downloaded?: '0' | '1'` carries it in the URL under the unused
single-character key `w`, guarded with `!== undefined` rather than truthiness so an
explicit off survives `toUrlSafeFormat`.

The value is tri-state: `w.1` on, `w.0` off, absent means "use the admin default".
`GameBrowseLayout` resolves it once and passes a plain boolean down.

Because absent means "default", removal cannot clear the parameter when the default
is on — the filter would immediately reapply. When the admin default is on,
`handleRemoveChip` and `handleClearAllFilters` write `w.0` instead of dropping the
key; when it is off, they clear it as every other filter does. `CATEGORY_TO_ABBR`
gains `Downloaded: 'W'` and `categoryToParamKeys` gains the matching entry so the
chip participates in the existing filter hierarchy.

A bookmarked URL with no `w` changes meaning if an admin later flips the default.
That is inherent to the tri-state and accepted.

`FilterPanel` renders a "Downloaded only" switch beside the year range in both the
desktop and mobile rows, and an active filter chip. A new `showDownloadedFilter`
prop hides the switch on the Downloaded page, where the filter is the page.

## Downloaded page

Route `/downloaded` renders `DownloadedView`, a thin wrapper over
`GameBrowseLayout` with the filter pinned on and no library restriction, so results
span arcade and theatre. `GameBrowseLayout`'s `library` prop becomes optional and it
gains `forceDownloaded`.

The page passes `sectionKey={null}`, so game links resolve to the existing
`/games/:id` detail route. No new per-section detail or play routes.

## Settings

Migration `004_downloaded_settings.sql` seeds three public boolean settings in the
`features` category, following the existing `enable_*` naming:

| Key | Default | Effect |
| --- | --- | --- |
| `features.enable_downloaded_page` | 1 | Sidebar entry and `/downloaded` route |
| `features.enable_downloaded_page_for_guests` | 0 | Guests may see the page |
| `features.enable_downloaded_filter_default` | 0 | Browse pages start filtered |

`useFeatureFlags` exposes `enableDownloadedPage` with the usual admin bypass, so an
admin cannot lock themselves out. The other two are read as `=== true`: they default
off, and the hook's `?? true` fallback would otherwise invert them during the
public-settings loading window and whenever the key is missing.

`ProtectedRoute` gains `'enableDownloadedPage'` in its `requireFeature` union and a
new `requireFeatureForGuests` prop, checked only when the viewer is a guest, so a
guest deep-linking to `/downloaded` with the guest flag off is redirected to
`/unauthorized`. A flag check alone would let them through, since guests satisfy
`requireAuth`.

These flags are presentation, not access control: `POST /api/games` is open to
guests and accepts `downloaded` regardless, and the page shows no data a guest
cannot already reach by filtering Browse. No backend enforcement is added.

`FeaturesSettingsTab` gains the three switches, with the guest row rendered only
while the page flag is on. Its stored value persists while hidden and resurfaces if
the page is re-enabled.

## Sidebar

The Downloaded entry sits in the Library section with Favorites. That block is
currently hidden wholesale for guests, so its items never check guest status
themselves. Relaxing the block requires giving each item its own predicate:
Favorites and both playlist entries become explicitly `!isGuest`, Downloaded
becomes `enableDownloadedPage && (!isGuest || enableDownloadedPageForGuests)`, and
the section renders when any item survives. The existing
`isViewingSharedPlaylistWithoutGuestAccess` case is unaffected.

## Testing

- `GameService.searchGames` returns only flagged games with `downloaded: true`, and
  is unaffected when the field is absent.
- Filter options narrow when `downloaded` is set, and cache keys distinguish
  `undefined`, `false`, and `true`.
- `DownloadedReconciler` maps ZIP filenames to the right `game_data` rows, ignores
  unrelated files, and marks nothing when the directory is unreadable.
- `filterUrlCompression` round-trips `w.0` and `w.1`, and an explicit off survives
  `buildFilterSearchParams`.
- Chip removal writes an explicit off when the admin default is on.

## Documentation

Update `docs/06-api-reference/games-api.md` (search and filter-options parameters),
`docs/06-api-reference/settings-api.md` (three new settings), and
`docs/10-features/02-game-browsing-filtering.md` (the filter and the page).
