import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib';

export interface FilterChip {
  id: string;
  label: string;
  value: string;
  category: string;
}

interface FilterChipsProps {
  chips: FilterChip[];
  onRemove: (chipId: string) => void;
  onClearAll?: () => void;
  className?: string;
}

/**
 * Displays active filters as removable chips
 * Improves filter discoverability and management
 */
export function FilterChips({ chips, onRemove, onClearAll, className }: FilterChipsProps) {
  if (chips.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="text-sm text-muted-foreground font-medium">Active Filters:</span>

      {chips.map((chip) => (
        <Badge
          key={chip.id}
          variant="secondary"
          className="pl-3 pr-1 py-1 gap-1 hover:bg-secondary/80 transition-colors"
        >
          <span className="text-xs">
            <span className="font-semibold">{chip.category}:</span> {chip.value}
          </span>
          <button
            onClick={() => onRemove(chip.id)}
            className="ml-1 rounded-sm hover:bg-muted p-0.5 transition-colors"
            aria-label={`Remove ${chip.category} filter: ${chip.value}`}
          >
            <X size={14} />
          </button>
        </Badge>
      ))}

      {chips.length > 1 && onClearAll && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="h-6 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          Clear All
        </Button>
      )}
    </div>
  );
}
