import { GameBrowseLayout } from '@/components/library/GameBrowseLayout';

/**
 * View for browsing HTML5 games only
 * Uses the reusable GameBrowseLayout with HTML5 platform filter
 */
export function HTML5GamesView() {
  return (
    <GameBrowseLayout
      title="HTML5 Games"
      library="arcade"
      platform="HTML5"
      breadcrumbContext={{ label: 'HTML5 Games', href: '/html5-games' }}
    />
  );
}
