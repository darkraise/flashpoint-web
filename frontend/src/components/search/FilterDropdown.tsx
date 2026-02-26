import { useState, useMemo, useEffect, useRef, useCallback, memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useDebounce } from '@/hooks/useDebounce';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronDown, Search, X, Check } from 'lucide-react';

// Virtualization constants
const ROW_HEIGHT = 36; // Height of each option row (py-1.5 = 6px*2 + text ~24px)
const VIRTUALIZATION_THRESHOLD = 50; // Only virtualize if more than 50 options
const OVERSCAN = 5; // Render extra items above/below viewport for smooth scrolling

interface FilterDropdownProps {
  label: string;
  icon?: React.ReactNode;
  options: string[];
  selectedValues: string[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the full array of selected values when user applies changes */
  onApply: (values: string[]) => void;
  onClear: () => void;
  placeholder?: string;
  emptyMessage?: string;
  compact?: boolean; // For mobile layout
}

/**
 * Reusable filter dropdown component for FilterPanel
 * Uses staged selection - user can select multiple items before applying
 */
export function FilterDropdown({
  label,
  icon,
  options,
  selectedValues,
  isOpen,
  onOpenChange,
  onApply,
  onClear,
  placeholder = 'Select',
  emptyMessage = 'No options available',
  compact = false,
}: FilterDropdownProps) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Local staged state for pending selections
  const [pendingValues, setPendingValues] = useState<string[]>(selectedValues);

  // Track if we're in the middle of applying (to prevent double-apply)
  const isApplyingRef = useRef(false);

  // Sync pending values when dropdown opens or selectedValues change externally
  useEffect(() => {
    if (isOpen) {
      setPendingValues(selectedValues);
    }
  }, [isOpen, selectedValues]);

  // Check if there are unapplied changes
  const hasChanges = useMemo(() => {
    if (pendingValues.length !== selectedValues.length) return true;
    const selectedSet = new Set(selectedValues);
    return !pendingValues.every((v) => selectedSet.has(v));
  }, [pendingValues, selectedValues]);

  // Toggle item in local staged state only
  const handleToggle = useCallback((value: string) => {
    setPendingValues((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }, []);

  // Apply all pending changes
  const handleApply = useCallback(() => {
    if (isApplyingRef.current) return;
    isApplyingRef.current = true;
    onApply(pendingValues);
    onOpenChange(false);
    // Reset flag after a tick
    setTimeout(() => {
      isApplyingRef.current = false;
    }, 0);
  }, [pendingValues, onApply, onOpenChange]);

  // Handle dropdown open/close - auto-apply on close if changes exist
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open && hasChanges && !isApplyingRef.current) {
        // Auto-apply pending changes when closing
        isApplyingRef.current = true;
        onApply(pendingValues);
        setTimeout(() => {
          isApplyingRef.current = false;
        }, 0);
      }
      onOpenChange(open);
    },
    [hasChanges, pendingValues, onApply, onOpenChange]
  );

  // Clear all selections and apply immediately
  const handleClearAll = useCallback(() => {
    setPendingValues([]);
    // If there were applied filters, clear them immediately
    if (selectedValues.length > 0) {
      isApplyingRef.current = true;
      onClear();
      setTimeout(() => {
        isApplyingRef.current = false;
      }, 0);
    }
  }, [selectedValues.length, onClear]);

  const pendingCount = pendingValues.length;
  const appliedCount = selectedValues.length;

  // Filter options based on debounced search query
  const filteredOptions = useMemo(() => {
    if (!debouncedSearch.trim()) return options;
    const query = debouncedSearch.toLowerCase().trim();
    return options.filter((option) => option.toLowerCase().includes(query));
  }, [options, debouncedSearch]);

  // Only virtualize large lists for performance
  const shouldVirtualize = filteredOptions.length > VIRTUALIZATION_THRESHOLD;

  // Use Set for O(1) lookup in large lists
  const pendingSet = useMemo(() => new Set(pendingValues), [pendingValues]);

  // Virtualizer for large option lists
  const virtualizer = useVirtualizer({
    count: filteredOptions.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: OVERSCAN,
    enabled: shouldVirtualize,
  });

  // Clear search when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setSearch('');
    }
  }, [isOpen]);

  // Focus search input when dropdown opens (with delay for animation)
  useEffect(() => {
    if (isOpen && options.length > 5) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, options.length]);

  const showSearch = options.length > 5;

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange} modal={false}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Button
            variant="outline"
            className={compact ? 'justify-between' : 'min-w-[120px] justify-between'}
            type="button"
            aria-label={`Filter by ${label}: ${appliedCount > 0 ? `${appliedCount} selected` : 'none selected'}`}
          >
            {icon && (
              <span className={compact ? '' : 'mr-2'} aria-hidden="true">
                {icon}
              </span>
            )}
            {!compact && <span>{appliedCount > 0 ? label : placeholder}</span>}
            <ChevronDown
              size={16}
              className={`${compact ? 'ml-1' : 'ml-2'} transition-transform ${isOpen ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </Button>
          {appliedCount > 0 && (
            <Badge className="absolute -top-2 -left-2 h-5 min-w-5 px-1.5 text-xs font-semibold flex items-center justify-center rounded-full">
              {appliedCount}
            </Badge>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-[250px] md:w-[300px] p-0 z-[100] flex flex-col"
        align="start"
        sideOffset={8}
        collisionPadding={10}
      >
        {/* Header with Clear button */}
        <div className="sticky top-0 bg-popover border-b p-2 z-10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {label}
              {pendingCount > 0 && (
                <span className="ml-1 text-foreground">({pendingCount})</span>
              )}
            </span>
            {pendingCount > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="h-auto py-1 px-2 text-xs text-destructive hover:text-destructive"
                aria-label={`Clear all ${label} selections`}
              >
                Clear All
              </Button>
            ) : null}
          </div>

          {/* Search input - only show if more than 5 options */}
          {showSearch ? (
            <div className="relative mt-2">
              <Search
                size={14}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${label.toLowerCase()}...`}
                className="h-8 pl-7 pr-7 text-sm"
                aria-label={`Search ${label}`}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ) : null}
        </div>

        {/* Scrollable options list */}
        <div
          ref={scrollContainerRef}
          className="max-h-[300px] overflow-y-auto p-2 flex-1"
        >
          {filteredOptions.length > 0 ? (
            shouldVirtualize ? (
              // Virtualized rendering for large lists
              <div
                style={{
                  height: `${virtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                {virtualizer.getVirtualItems().map((virtualRow) => {
                  const option = filteredOptions[virtualRow.index];
                  return (
                    <OptionRow
                      key={option}
                      option={option}
                      isChecked={pendingSet.has(option)}
                      onToggle={handleToggle}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    />
                  );
                })}
              </div>
            ) : (
              // Simple rendering for small lists
              <div className="space-y-1">
                {filteredOptions.map((option) => (
                  <OptionRow
                    key={option}
                    option={option}
                    isChecked={pendingSet.has(option)}
                    onToggle={handleToggle}
                  />
                ))}
              </div>
            )
          ) : debouncedSearch ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No matches for "{debouncedSearch}"
            </div>
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">{emptyMessage}</div>
          )}
        </div>

        {/* Footer with Apply button - shown when there are pending changes */}
        {hasChanges ? (
          <div className="sticky bottom-0 border-t p-2 bg-popover">
            <Button
              onClick={handleApply}
              size="sm"
              className="w-full"
              aria-label={`Apply ${pendingCount} ${label} filter${pendingCount !== 1 ? 's' : ''}`}
            >
              <Check size={14} className="mr-1" aria-hidden="true" />
              Apply{pendingCount > 0 ? ` (${pendingCount})` : ''}
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

/**
 * Memoized option row to prevent unnecessary re-renders during scroll
 * Only re-renders when option, isChecked, or style changes
 */
interface OptionRowProps {
  option: string;
  isChecked: boolean;
  onToggle: (value: string) => void;
  style?: React.CSSProperties;
}

const OptionRow = memo(function OptionRow({
  option,
  isChecked,
  onToggle,
  style,
}: OptionRowProps) {
  const handleToggle = useCallback(() => {
    onToggle(option);
  }, [option, onToggle]);

  return (
    <label
      className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded cursor-pointer"
      style={style}
    >
      <Checkbox checked={isChecked} onCheckedChange={handleToggle} />
      <span className="text-sm flex-1 truncate" title={option}>
        {option}
      </span>
    </label>
  );
});
