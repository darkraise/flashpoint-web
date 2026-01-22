import { GameBrowseLayout } from '@/components/library/GameBrowseLayout';

/**
 * View for browsing Flash games only
 * Uses the reusable GameBrowseLayout with Flash platform filter
 */
export function FlashGamesView() {
  return (
    <GameBrowseLayout
      title="Flash Games"
      library="arcade"
      platform="Flash"
    />
  );
}
