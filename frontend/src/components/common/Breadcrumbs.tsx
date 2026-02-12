import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, ArrowLeft, Film, Gamepad2, List, ListVideo, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SectionIcon } from '@/lib/sectionRoutes';

export interface BreadcrumbContext {
  label: string;
  href: string;
  icon?: SectionIcon;
  /** Optional parent breadcrumb for nested navigation (e.g., Flashpoint Playlists > Playlist Name) */
  parent?: BreadcrumbContext;
}

export interface PlayerBreadcrumbContext {
  breadcrumbContext?: BreadcrumbContext;
  gameTitle: string;
  gameDetailHref: string;
  shareToken: string | null;
  sharedPlaylistTitle: string | null;
  sharedPlaylistHref: string | null;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
  active?: boolean;
  icon?: SectionIcon;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  showBackButton?: boolean;
  className?: string;
  /** Fallback href when back button has nowhere to go */
  fallbackHref?: string;
}

/**
 * Render icon for a breadcrumb item
 */
function BreadcrumbIcon({ icon }: { icon: SectionIcon }) {
  if (icon.type === 'image') {
    return (
      <img
        src={icon.value}
        alt=""
        aria-hidden="true"
        className="w-4 h-4 object-contain"
      />
    );
  }

  // Lucide icons
  switch (icon.value) {
    case 'Film':
      return <Film size={14} aria-hidden="true" />;
    case 'Gamepad2':
      return <Gamepad2 size={14} aria-hidden="true" />;
    case 'List':
      return <List size={14} aria-hidden="true" />;
    case 'ListVideo':
      return <ListVideo size={14} aria-hidden="true" />;
    case 'Heart':
      return <Heart size={14} aria-hidden="true" />;
    default:
      return null;
  }
}

export function Breadcrumbs({
  items,
  showBackButton = true,
  className,
  fallbackHref = '/',
}: BreadcrumbsProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    // Check if there's meaningful browser history to go back to
    // history.length > 2 because: 1 = initial page, 2 = current page after one navigation
    if (window.history.length > 2) {
      navigate(-1);
      return;
    }

    // Fallback: navigate to previous breadcrumb item
    const previousItem = items.length >= 2 ? items[items.length - 2] : null;
    if (previousItem?.href) {
      navigate(previousItem.href);
      return;
    }

    // Final fallback: go to provided fallback or home
    navigate(fallbackHref);
  };

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        'flex items-center gap-2 text-sm rounded-lg',
        'sticky top-0 z-30 bg-background/40 backdrop-blur-md border border-primary/50 shadow-md drop-shadow-lg',
        className
      )}
    >
      {showBackButton ? (
        <>
          <button
            onClick={handleBack}
            className="rounded-md py-2 px-4 text-muted-foreground hover:text-foreground hover:bg-primary/20 transition-colors ml-1"
            aria-label="Go back"
          >
            <ArrowLeft size={18} aria-hidden="true" />
          </button>
          <div className="w-px h-6 bg-border my-1.5" aria-hidden="true" />
        </>
      ) : null}

      <ol className={cn('flex items-center gap-1 flex-wrap my-2 mr-3', !showBackButton && 'ml-3')}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const isActive = item.active ?? isLast;

          return (
            <li key={`${index}-${item.href ?? item.label}`} className="flex items-center gap-1">
              {item.href && !isActive ? (
                <Link
                  to={item.href}
                  className="flex items-center gap-1.5 rounded-md px-2 py-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors max-w-[200px]"
                  title={item.label}
                >
                  {item.icon ? <BreadcrumbIcon icon={item.icon} /> : null}
                  <span className="truncate">{item.label}</span>
                </Link>
              ) : (
                <span
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-2 py-1 max-w-[200px]',
                    isActive ? 'text-foreground font-medium' : 'text-muted-foreground'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                  title={item.label}
                >
                  {item.icon ? <BreadcrumbIcon icon={item.icon} /> : null}
                  <span className="truncate">{item.label}</span>
                </span>
              )}

              {!isLast ? (
                <ChevronRight size={14} className="text-muted-foreground" aria-hidden="true" />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
