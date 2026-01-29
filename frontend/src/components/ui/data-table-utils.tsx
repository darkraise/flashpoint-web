import { ArrowDown, ArrowUp } from 'lucide-react';

/**
 * Returns the appropriate sort icon based on the current sort state.
 * @param sortState - The current sorting state (false, 'asc', or 'desc')
 * @returns JSX element for the sort icon, or null if not sorted
 */
export function getSortIcon(sortState: false | 'asc' | 'desc'): JSX.Element | null {
  if (sortState === 'asc') {
    return <ArrowUp className="h-4 w-4" aria-hidden="true" />;
  }
  if (sortState === 'desc') {
    return <ArrowDown className="h-4 w-4" aria-hidden="true" />;
  }
  return null;
}
