import { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';

interface ErrorLayoutProps {
  children?: ReactNode;
}

/**
 * ErrorLayout - Minimal layout for error pages
 *
 * Features:
 * - Simple full-height background
 * - No Header, no Sidebar, no navigation
 * - ErrorPage component handles all internal structure
 * - Used for 404, 500, network error, and unauthorized pages
 */
export function ErrorLayout({ children }: ErrorLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {children || <Outlet />}
    </div>
  );
}
