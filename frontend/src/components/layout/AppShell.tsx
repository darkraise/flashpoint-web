import { ReactNode } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { useUIStore } from '@/store/ui';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const sidebarOpen = useUIStore((state) => state.sidebarOpen);

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Skip Links for Keyboard Navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-md focus:shadow-lg"
      >
        Skip to main content
      </a>
      <a
        href="#navigation"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-40 focus:z-50 focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-md focus:shadow-lg"
      >
        Skip to navigation
      </a>

      <Header />

      <div className="flex flex-1 overflow-hidden min-h-0">
        <Sidebar isOpen={sidebarOpen} />

        <main id="main-content" className="flex-1 overflow-auto bg-background p-6 min-h-0">
          {children}
        </main>
      </div>
    </div>
  );
}
