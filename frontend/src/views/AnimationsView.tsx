import { GameBrowseLayout } from '@/components/library/GameBrowseLayout';

export function AnimationsView() {
  return (
    <GameBrowseLayout
      title="Browse Animations"
      library="theatre"
      breadcrumbContext={{ label: 'Animations', href: '/animations' }}
    />
  );
}
