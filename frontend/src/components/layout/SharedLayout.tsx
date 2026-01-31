import { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { MainLayout } from './MainLayout';
import { useAuthStore } from '@/store/auth';

interface SharedLayoutProps {
  children?: ReactNode;
}

/**
 * SharedLayout - Layout for shared access pages
 *
 * Features:
 * - For authenticated users: Uses MainLayout (full sidebar + search)
 * - For anonymous users: Header WITHOUT search, NO sidebar
 * - Full-width main content area
 * - Accessibility skip link to main content
 * - Used when users access content via shareToken
 */
export function SharedLayout({ children }: SharedLayoutProps) {
  const { isAuthenticated } = useAuthStore();

  // Authenticated users get the full MainLayout experience
  if (isAuthenticated) {
    return <MainLayout>{children}</MainLayout>;
  }

  // Anonymous users get minimal layout (header without search, no sidebar)
  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Skip Link for Keyboard Navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-md focus:shadow-lg"
      >
        Skip to main content
      </a>

      {/* Header without search bar and without sidebar toggle */}
      <Header hideSidebarToggle hideSearch />

      {/* Main content - full width, no sidebar */}
      <main id="main-content" className="flex-1 overflow-auto bg-background p-6 min-h-0">
        {children || <Outlet />}
      </main>
    </div>
  );
}
