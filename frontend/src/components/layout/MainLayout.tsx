import { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { MaintenanceGuard } from '@/components/common/MaintenanceGuard';
import { AppShell } from './AppShell';

interface MainLayoutProps {
  children?: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <MaintenanceGuard>
      <AppShell>{children || <Outlet />}</AppShell>
    </MaintenanceGuard>
  );
}
