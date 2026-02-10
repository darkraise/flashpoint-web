import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Home, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib';

export interface BreadcrumbContext {
  label: string;
  href: string;
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
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  showHome?: boolean;
  homeLabel?: string;
  homeHref?: string;
  showBackButton?: boolean;
  className?: string;
}

export function Breadcrumbs({
  items,
  showHome = true,
  homeLabel = 'Home',
  homeHref = '/',
  showBackButton = true,
  className,
}: BreadcrumbsProps) {
  const navigate = useNavigate();

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center gap-2 text-sm rounded-lg bg-muted/50 px-3 py-2', className)}
    >
      {showBackButton ? (
        <>
          <button
            onClick={() => navigate(-1)}
            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="w-px h-5 bg-border" aria-hidden="true" />
        </>
      ) : null}

      <ol className="flex items-center gap-1 flex-wrap">
        {showHome ? (
          <>
            <li>
              <Link
                to={homeHref}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                aria-label={homeLabel}
              >
                <Home size={14} />
                <span className="hidden sm:inline">{homeLabel}</span>
              </Link>
            </li>
            {items.length > 0 ? (
              <li aria-hidden="true" className="flex items-center">
                <ChevronRight size={14} className="text-muted-foreground" />
              </li>
            ) : null}
          </>
        ) : null}

        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const isActive = item.active ?? isLast;

          return (
            <li key={item.href ?? item.label} className="flex items-center gap-1">
              {item.href && !isActive ? (
                <Link
                  to={item.href}
                  className="rounded-md px-2 py-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors max-w-[200px] truncate"
                  title={item.label}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={cn(
                    'rounded-md px-2 py-1 max-w-[200px] truncate',
                    isActive ? 'text-foreground font-medium' : 'text-muted-foreground'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                  title={item.label}
                >
                  {item.label}
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
