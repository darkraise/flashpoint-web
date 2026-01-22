import { GameBrowseLayout } from '@/components/library/GameBrowseLayout';

/**
 * Generic browse view for all games
 * Uses the reusable GameBrowseLayout without platform filter
 */
export function BrowseView() {
  return (
    <GameBrowseLayout
      title="Browse Games"
      library="arcade"
    />
  );
}
