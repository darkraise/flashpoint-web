import { Link, useLocation } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SIDEBAR_PREFIX_MAP } from '@/lib/sectionRoutes';

interface SidebarItemProps {
  path: string;
  icon?: LucideIcon;
  iconImage?: string;
  label: string;
  collapsed?: boolean;
  onClick?: () => void;
}

export function SidebarItem({
  path,
  icon: Icon,
  iconImage,
  label,
  collapsed = false,
  onClick,
}: SidebarItemProps) {
  const location = useLocation();

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

  const isActive = (() => {
    const itemPath = path.split('?')[0];
    const itemQuery = path.split('?')[1];

    // Exact match for the path
    if (itemQuery) {
      if (location.pathname === itemPath && location.search === `?${itemQuery}`) {
        return true;
      }
    } else if (location.pathname === itemPath) {
      return true;
    }

    // Check if current path is a section-based game route that maps to this sidebar item
    const prefixes = SIDEBAR_PREFIX_MAP[itemPath];
    if (prefixes?.some((prefix) => location.pathname.startsWith(prefix))) {
      return true;
    }

    // Check breadcrumb context from location state (fallback for non-section routes)
    const state = location.state as {
      breadcrumbContext?: { href?: string };
      playerBreadcrumbContext?: { breadcrumbContext?: { href?: string } };
    } | null;

    const breadcrumbHref =
      state?.breadcrumbContext?.href ?? state?.playerBreadcrumbContext?.breadcrumbContext?.href;

    if (breadcrumbHref && breadcrumbHref === itemPath) {
      return true;
    }

    return false;
  })();

  return (
    <Link
      to={path}
      onClick={onClick}
      className={cn(
        'flex items-center rounded-lg overflow-hidden border',
        collapsed ? 'justify-center' : '',
        isActive
          ? 'bg-primary/10 text-primary border-primary/20 font-bold'
          : 'hover:bg-accent hover:text-primary/80 text-foreground border-transparent'
      )}
      title={collapsed ? label : undefined}
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
      style={{
        width: collapsed ? '2.5rem' : 'auto',
        height: collapsed ? '2.5rem' : 'auto',
        padding: collapsed ? '0' : '0.5rem 0.75rem',
        gap: collapsed ? '0' : '0.75rem',
        transition: isMobile
          ? undefined
          : 'width 500ms ease-out, height 500ms ease-out, padding 500ms ease-out, gap 500ms ease-out',
      }}
    >
      {iconImage ? (
        <img
          src={iconImage}
          alt=""
          aria-hidden="true"
          className="w-5 h-5 object-contain flex-shrink-0"
        />
      ) : Icon ? (
        <Icon size={20} className="flex-shrink-0" aria-hidden="true" />
      ) : null}
      <span
        className="whitespace-nowrap"
        style={{
          opacity: collapsed ? 0 : 1,
          width: collapsed ? 0 : 'auto',
          overflow: 'hidden',
          pointerEvents: collapsed ? 'none' : 'auto',
          transition: isMobile ? undefined : 'opacity 500ms ease-out, width 500ms ease-out',
        }}
      >
        {label}
      </span>
    </Link>
  );
}
