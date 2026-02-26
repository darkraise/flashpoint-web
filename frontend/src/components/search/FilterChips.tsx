import { X, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Max characters to display in a filter value before truncating */
const MAX_VALUE_LENGTH = 20;

export interface FilterChip {
  id: string;
  label: string;
  value: string;
  category: string;
  /** Order in which the filter was applied (used for tree hierarchy) */
  order: number;
}

interface FilterChipsProps {
  chips: FilterChip[];
  onRemove: (chipId: string) => void;
  /** Called when removing a parent - should remove all children too */
  onRemoveWithChildren?: (categoryOrder: number) => void;
  onClearAll?: () => void;
  className?: string;
}

interface FilterGroup {
  category: string;
  order: number;
  chips: FilterChip[];
}

/**
 * Truncate text to max length with ellipsis
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + '…';
}

/**
 * Displays active filters as a horizontal tree with vertical items per group
 * - Parent on left, children appended to the right
 * - Each group shows items in multiple rows
 * - Group header has remove button (removes group + all children)
 */
export function FilterChips({
  chips,
  onRemove,
  onRemoveWithChildren,
  onClearAll,
  className,
}: FilterChipsProps) {
  if (chips.length === 0) {
    return null;
  }

  // Group chips by category, maintaining order
  const groups: FilterGroup[] = [];
  const seenCategories = new Map<string, FilterGroup>();

  for (const chip of chips) {
    const existing = seenCategories.get(chip.category);
    if (existing) {
      existing.chips.push(chip);
    } else {
      const group: FilterGroup = {
        category: chip.category,
        order: chip.order,
        chips: [chip],
      };
      groups.push(group);
      seenCategories.set(chip.category, group);
    }
  }

  // Sort groups by order
  groups.sort((a, b) => a.order - b.order);

  const handleRemoveGroup = (group: FilterGroup) => {
    if (onRemoveWithChildren) {
      onRemoveWithChildren(group.order);
    } else {
      group.chips.forEach((chip) => onRemove(chip.id));
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground font-medium">Active Filters</span>
        {chips.length > 1 && onClearAll ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="h-6 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            Clear All
          </Button>
        ) : null}
      </div>

      {/* Horizontal tree with vertical items per group */}
      <div className="flex items-start gap-1 overflow-x-auto pb-1">
        {groups.map((group, groupIndex) => (
          <div key={group.category} className="flex items-start">
            {/* Chevron connector (except for first group) - aligned with header */}
            {groupIndex > 0 ? (
              <ChevronRight
                size={16}
                className="text-muted-foreground/50 mx-1 flex-shrink-0 mt-1.5"
                aria-hidden="true"
              />
            ) : null}

            {/* Group container */}
            <div
              className={cn(
                'flex flex-col rounded-lg border bg-card min-w-[120px] max-w-[200px]',
                groupIndex === 0 ? 'border-primary/30 bg-primary/5' : 'border-border/50'
              )}
            >
              {/* Group header */}
              <div className="flex items-center justify-between px-2 py-1 border-b border-border/30">
                <span className="text-xs font-semibold text-muted-foreground truncate">
                  {group.category}
                </span>
                <button
                  onClick={() => handleRemoveGroup(group)}
                  className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0 ml-1"
                  title={`Remove ${group.category} and all filters to the right`}
                  aria-label={`Remove all ${group.category} filters and children`}
                >
                  <X size={12} />
                </button>
              </div>

              {/* Filter items - each on its own row */}
              <div className="flex flex-col p-1 gap-0.5">
                {group.chips.map((chip) => (
                  <Badge
                    key={chip.id}
                    variant="secondary"
                    className="justify-between px-2 py-0.5 h-6 text-xs font-normal hover:bg-secondary/80 transition-colors"
                    title={chip.value}
                  >
                    <span className="truncate mr-1">
                      {truncateText(chip.value, MAX_VALUE_LENGTH)}
                    </span>
                    <button
                      onClick={() => onRemove(chip.id)}
                      className="rounded-sm hover:bg-muted/80 p-0.5 flex-shrink-0 transition-colors"
                      aria-label={`Remove ${chip.category} filter: ${chip.value}`}
                      title={`Remove "${chip.value}"`}
                    >
                      <X size={10} />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      {groups.length > 1 ? (
        <p className="text-xs text-muted-foreground/60">
          Left → Right = AND • Same group = OR • Removing group clears all to the right
        </p>
      ) : null}
    </div>
  );
}
