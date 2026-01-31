import { ReactNode } from 'react';
import { Separator } from '@/components/ui/separator';

interface SidebarSectionProps {
  children: ReactNode;
  title?: string;
  collapsed?: boolean;
  showSeparator?: boolean;
}

export function SidebarSection({
  children,
  title,
  collapsed = false,
  showSeparator = true,
}: SidebarSectionProps) {
  return (
    <>
      {showSeparator && <Separator className="my-3" />}
      <div className="space-y-1">
        {title && (
          <div
            className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider overflow-hidden"
            style={{
              opacity: collapsed ? 0 : 1,
              height: collapsed ? 0 : 'auto',
              paddingTop: collapsed ? 0 : '0.5rem',
              paddingBottom: collapsed ? 0 : '0.5rem',
              transition: 'opacity 500ms ease-out, height 500ms ease-out, padding 500ms ease-out',
            }}
          >
            {title}
          </div>
        )}
        {children}
      </div>
    </>
  );
}
