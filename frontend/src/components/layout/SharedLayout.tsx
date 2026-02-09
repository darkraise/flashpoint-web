import { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { MainLayout } from './MainLayout';
import { useAuthStore } from '@/store/auth';

interface SharedLayoutProps {
  children?: ReactNode;
}

export function SharedLayout({ children }: SharedLayoutProps) {
  const { isAuthenticated } = useAuthStore();

  // Authenticated users get the full MainLayout experience
  if (isAuthenticated) {
    return <MainLayout>{children}</MainLayout>;
  }

  // Anonymous users get minimal layout (header without search, no sidebar)
  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-md focus:shadow-lg"
      >
        Skip to main content
      </a>

      <Header hideSidebarToggle hideSearch />

      <main id="main-content" className="flex-1 overflow-auto bg-background p-6 min-h-0">
        {children || <Outlet />}
      </main>
    </div>
  );
}
