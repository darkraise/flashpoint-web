import { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';

interface PublicLayoutProps {
  children?: ReactNode;
  background?: ReactNode;
}

export function PublicLayout({ children, background }: PublicLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden px-4">
      {background}

      <div className="relative z-10 w-full flex items-center justify-center py-12">
        {children || <Outlet />}
      </div>
    </div>
  );
}
