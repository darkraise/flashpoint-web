import { GameBrowseLayout } from '@/components/library/GameBrowseLayout';

export function DownloadedView() {
  return (
    <GameBrowseLayout
      title="Downloaded"
      forceDownloaded
      sectionKey={null}
      breadcrumbContext={{ label: 'Downloaded', href: '/downloaded' }}
    />
  );
}
