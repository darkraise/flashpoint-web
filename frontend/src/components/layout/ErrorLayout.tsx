import { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';

interface ErrorLayoutProps {
  children?: ReactNode;
}

export function ErrorLayout({ children }: ErrorLayoutProps) {
  return <div className="min-h-screen bg-background">{children || <Outlet />}</div>;
}
