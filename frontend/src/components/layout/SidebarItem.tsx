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

    // Check breadcrumb context from location state
    // This takes priority over prefix matching to handle cases like
    // opening a game from Flashpoint Playlists (should highlight Playlists, not Browse)
    const state = location.state as {
      breadcrumbContext?: { href?: string; parent?: { href?: string } };
      playerBreadcrumbContext?: { breadcrumbContext?: { href?: string; parent?: { href?: string } } };
    } | null;

    const breadcrumbContext =
      state?.breadcrumbContext ?? state?.playerBreadcrumbContext?.breadcrumbContext;

    // If breadcrumb context exists, use it exclusively for matching
    if (breadcrumbContext) {
      // Check direct breadcrumb href
      if (breadcrumbContext.href === itemPath) {
        return true;
      }
      // Check parent breadcrumb href (e.g., Flashpoint Playlists when viewing a game from a playlist)
      if (breadcrumbContext.parent?.href === itemPath) {
        return true;
      }
      // Breadcrumb context exists but doesn't match this item
      return false;
    }

    // No breadcrumb context - fall back to prefix matching for direct URL access
    const prefixes = SIDEBAR_PREFIX_MAP[itemPath];
    if (prefixes?.some((prefix) => location.pathname.startsWith(prefix))) {
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
