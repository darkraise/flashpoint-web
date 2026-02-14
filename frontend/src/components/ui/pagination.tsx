import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
  showFirstLast?: boolean;
  className?: string;
}

/**
 * Generate an array of page numbers to display
 * Includes ellipsis (...) for skipped pages
 */
function generatePageNumbers(
  currentPage: number,
  totalPages: number,
  siblingCount: number = 2
): (number | string)[] {
  // If total pages is small enough, show all pages
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
  const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

  const showLeftEllipsis = leftSiblingIndex > 2;
  const showRightEllipsis = rightSiblingIndex < totalPages - 1;

  const pages: (number | string)[] = [];

  // Always show first page
  pages.push(1);

  // Left ellipsis
  if (showLeftEllipsis) {
    pages.push('left-ellipsis');
  } else if (leftSiblingIndex === 2) {
    pages.push(2);
  }

  // Middle pages
  for (let i = leftSiblingIndex; i <= rightSiblingIndex; i++) {
    if (i !== 1 && i !== totalPages) {
      pages.push(i);
    }
  }

  // Right ellipsis
  if (showRightEllipsis) {
    pages.push('right-ellipsis');
  } else if (rightSiblingIndex === totalPages - 1) {
    pages.push(totalPages - 1);
  }

  // Always show last page
  if (totalPages > 1) {
    pages.push(totalPages);
  }

  return pages;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  siblingCount = 2,
  showFirstLast = true,
  className,
}: PaginationProps) {
  const pages = generatePageNumbers(currentPage, totalPages, siblingCount);

  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  return (
    <nav
      role="navigation"
      aria-label="Pagination"
      className={cn('flex items-center justify-center gap-1', className)}
    >
      {/* First page button */}
      {showFirstLast ? (
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(1)}
          disabled={!canGoPrevious}
          aria-label="Go to first page"
          className="h-9 w-9"
        >
          <ChevronsLeft size={16} />
        </Button>
      ) : null}

      {/* Previous page button */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!canGoPrevious}
        aria-label="Go to previous page"
        className="h-9 w-9"
      >
        <ChevronLeft size={16} />
      </Button>

      {/* Page numbers */}
      <div className="flex items-center gap-1">
        {pages.map((page, index) => {
          if (typeof page === 'string') {
            // Ellipsis
            return (
              <span
                key={`${page}-${index}`}
                className="flex h-9 w-9 items-center justify-center text-muted-foreground"
                aria-hidden="true"
              >
                ...
              </span>
            );
          }

          const isActive = page === currentPage;

          return (
            <Button
              key={page}
              variant={isActive ? 'default' : 'outline'}
              size="icon"
              onClick={() => onPageChange(page)}
              aria-label={`Go to page ${page}`}
              aria-current={isActive ? 'page' : undefined}
              className={cn('h-9 w-9', isActive && 'pointer-events-none')}
            >
              {page}
            </Button>
          );
        })}
      </div>

      {/* Next page button */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!canGoNext}
        aria-label="Go to next page"
        className="h-9 w-9"
      >
        <ChevronRight size={16} />
      </Button>

      {/* Last page button */}
      {showFirstLast ? (
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(totalPages)}
          disabled={!canGoNext}
          aria-label="Go to last page"
          className="h-9 w-9"
        >
          <ChevronsRight size={16} />
        </Button>
      ) : null}
    </nav>
  );
}

/**
 * Simple pagination info component showing "Showing X to Y of Z results"
 */
export interface PaginationInfoProps {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  className?: string;
}

export function PaginationInfo({
  currentPage,
  pageSize,
  totalItems,
  className,
}: PaginationInfoProps) {
  const start = Math.min((currentPage - 1) * pageSize + 1, totalItems);
  const end = Math.min(currentPage * pageSize, totalItems);

  if (totalItems === 0) {
    return <p className={cn('text-sm text-muted-foreground', className)}>No results found</p>;
  }

  return (
    <p className={cn('text-sm text-muted-foreground', className)}>
      Showing <span className="font-medium">{start.toLocaleString()}</span> to{' '}
      <span className="font-medium">{end.toLocaleString()}</span> of{' '}
      <span className="font-medium">{totalItems.toLocaleString()}</span> results
    </p>
  );
}

/**
 * Combined pagination component with info and controls
 */
export interface PaginationWithInfoProps extends PaginationProps {
  pageSize: number;
  totalItems: number;
  showInfo?: boolean;
}

export function PaginationWithInfo({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  showInfo = true,
  siblingCount,
  showFirstLast,
  className,
}: PaginationWithInfoProps) {
  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      {showInfo ? (
        <PaginationInfo currentPage={currentPage} pageSize={pageSize} totalItems={totalItems} />
      ) : null}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
        siblingCount={siblingCount}
        showFirstLast={showFirstLast}
      />
    </div>
  );
}
