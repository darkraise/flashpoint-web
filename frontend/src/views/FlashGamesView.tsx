import { GameBrowseLayout } from '@/components/library/GameBrowseLayout';

export function FlashGamesView() {
  return (
    <GameBrowseLayout
      title="Flash Games"
      library="arcade"
      platform="Flash"
      breadcrumbContext={{ label: 'Flash Games', href: '/flash' }}
      sectionKey="flash"
    />
  );
}
