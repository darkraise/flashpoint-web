import { GameBrowseLayout } from '@/components/library/GameBrowseLayout';

export function HTML5GamesView() {
  return (
    <GameBrowseLayout
      title="HTML5 Games"
      library="arcade"
      platform="HTML5"
      breadcrumbContext={{ label: 'HTML5 Games', href: '/html5' }}
      sectionKey="html5"
    />
  );
}
