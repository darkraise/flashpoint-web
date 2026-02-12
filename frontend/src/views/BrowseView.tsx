import { GameBrowseLayout } from '@/components/library/GameBrowseLayout';

export function BrowseView() {
  return (
    <GameBrowseLayout
      title="Browse Games"
      library="arcade"
      breadcrumbContext={{ label: 'Browse', href: '/browse' }}
      sectionKey="browse"
    />
  );
}
