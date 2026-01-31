import { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';

interface PublicLayoutProps {
  children?: ReactNode;
  background?: ReactNode;
}

/**
 * PublicLayout - Centered card layout for public auth pages
 *
 * Features:
 * - Full-height viewport with centered content
 * - Optional background effects (e.g., ParticleNetworkBackground for login)
 * - No Header, no Sidebar, no navigation
 * - Responsive padding and positioning
 */
export function PublicLayout({ children, background }: PublicLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden px-4">
      {/* Optional background effect (e.g., ParticleNetworkBackground) */}
      {background}

      {/* Centered content container */}
      <div className="relative z-10 w-full flex items-center justify-center py-12">
        {children || <Outlet />}
      </div>
    </div>
  );
}
