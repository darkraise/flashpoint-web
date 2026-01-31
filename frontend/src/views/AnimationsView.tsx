import { GameBrowseLayout } from '@/components/library/GameBrowseLayout';

/**
 * View for browsing animations (theatre library)
 * Uses the reusable GameBrowseLayout with theatre library
 */
export function AnimationsView() {
  return (
    <GameBrowseLayout
      title="Browse Animations"
      library="theatre"
      breadcrumbContext={{ label: 'Animations', href: '/animations' }}
    />
  );
}
