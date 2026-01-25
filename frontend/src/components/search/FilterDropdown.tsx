import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronDown } from 'lucide-react';

interface FilterOption {
  name: string;
  count: number;
}

interface FilterDropdownProps {
  label: string;
  icon?: React.ReactNode;
  options: FilterOption[];
  selectedValues: string[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onToggle: (value: string) => void;
  onClear: () => void;
  placeholder?: string;
  emptyMessage?: string;
}

/**
 * Reusable filter dropdown component for FilterPanel
 * Eliminates code duplication across 7+ filter dropdowns
 */
export function FilterDropdown({
  label,
  icon,
  options,
  selectedValues,
  isOpen,
  onOpenChange,
  onToggle,
  onClear,
  placeholder = 'Select',
  emptyMessage = 'No options available',
}: FilterDropdownProps) {
  const selectedCount = selectedValues.length;
  const buttonText = selectedCount > 0
    ? `${selectedCount} ${label}${selectedCount > 1 ? 's' : ''}`
    : placeholder;

  return (
    <Popover open={isOpen} onOpenChange={onOpenChange} modal={false}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="min-w-[120px] justify-between"
          type="button"
          aria-label={`Filter by ${label}: ${selectedCount > 0 ? `${selectedCount} selected` : 'none selected'}`}
        >
          {icon && <span className="mr-2" aria-hidden="true">{icon}</span>}
          <span>{buttonText}</span>
          <ChevronDown size={16} className={`ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[250px] md:w-[300px] p-0 z-[100]"
        align="start"
        sideOffset={8}
        collisionPadding={10}
        onOpenAutoFocus={(e: Event) => e.preventDefault()}
      >
        {/* Header with Clear button */}
        <div className="sticky top-0 bg-popover border-b p-2 z-10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">{label}</span>
            {selectedCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClear}
                className="h-auto py-1 px-2 text-xs text-destructive hover:text-destructive"
                aria-label={`Clear all ${label} filters`}
              >
                Clear All
              </Button>
            )}
          </div>
        </div>

        {/* Scrollable options list */}
        <div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
          {options.length > 0 ? (
            options.map((option) => (
              <label
                key={option.name}
                className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded cursor-pointer"
              >
                <Checkbox
                  checked={selectedValues.includes(option.name)}
                  onCheckedChange={() => onToggle(option.name)}
                />
                <span className="text-sm flex-1">{option.name}</span>
                <span className="text-xs text-muted-foreground">
                  {option.count.toLocaleString()}
                </span>
              </label>
            ))
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {emptyMessage}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
