import { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { MaintenanceGuard } from '@/components/common/MaintenanceGuard';
import { AppShell } from './AppShell';

interface MainLayoutProps {
  children?: ReactNode;
}

/**
 * MainLayout - Full application layout for authenticated/guest users
 *
 * Features:
 * - Wraps content in MaintenanceGuard (redirects non-admin during maintenance)
 * - Shows full AppShell with Header + Sidebar + main content
 * - Header includes search bar (both desktop and mobile)
 * - Used for all standard authenticated app pages
 */
export function MainLayout({ children }: MainLayoutProps) {
  return (
    <MaintenanceGuard>
      <AppShell>
        {children || <Outlet />}
      </AppShell>
    </MaintenanceGuard>
  );
}
