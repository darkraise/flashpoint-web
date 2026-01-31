import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib';

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
  className?: string;
}

/**
 * Breadcrumbs navigation component for wayfinding
 * Helps users understand their location in the app hierarchy
 */
export function Breadcrumbs({
  items,
  showHome = true,
  homeLabel = "Home",
  homeHref = "/",
  className
}: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center gap-2 text-sm", className)}>
      <ol className="flex items-center gap-2 flex-wrap">
        {showHome && (
          <>
            <li>
              <Link
                to={homeHref}
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={homeLabel}
              >
                <Home size={16} />
                <span className="hidden sm:inline">{homeLabel}</span>
              </Link>
            </li>
            {items.length > 0 && (
              <li aria-hidden="true">
                <ChevronRight size={16} className="text-muted-foreground" />
              </li>
            )}
          </>
        )}

        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const isActive = item.active ?? isLast;

          return (
            <li key={index} className="flex items-center gap-2">
              {item.href && !isActive ? (
                <Link
                  to={item.href}
                  className="text-muted-foreground hover:text-foreground transition-colors max-w-[200px] truncate"
                  title={item.label}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={cn(
                    "max-w-[200px] truncate",
                    isActive
                      ? "text-foreground font-medium"
                      : "text-muted-foreground"
                  )}
                  aria-current={isActive ? "page" : undefined}
                  title={item.label}
                >
                  {item.label}
                </span>
              )}

              {!isLast && (
                <ChevronRight size={16} className="text-muted-foreground" aria-hidden="true" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
