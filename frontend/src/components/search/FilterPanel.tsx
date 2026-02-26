import { useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, AlertCircle, RefreshCw } from 'lucide-react';
import { useFilterDropdowns } from '@/hooks/useFilterDropdowns';
import { FilterDropdown } from './FilterDropdown';
import { FilterChips, FilterChip } from './FilterChips';
import { YearRangeFilter } from './YearRangeFilter';
import { Button } from '@/components/ui/button';
import { FILTER_CONFIGS } from './filterConfig';
import {
  parseFilterParams,
  buildFilterSearchParams,
  FilterUrlParams,
} from '@/lib/filterUrlCompression';
import type { GameFilters, FilterOptions } from '@/types/game';

interface FilterPanelProps {
  filters: GameFilters;
  filterOptions: FilterOptions | undefined;
  filterOptionsLoading: boolean;
  filterOptionsError: Error | null;
  refetchFilterOptions: () => void;
  showPlatformFilter?: boolean;
  /** Active filter chips to display */
  filterChips?: FilterChip[];
  /** Callback when a chip is removed */
  onRemoveChip?: (chipId: string) => void;
  /** Callback when removing a group and its children */
  onRemoveWithChildren?: (categoryOrder: number) => void;
  /** Callback to clear all filters */
  onClearAllFilters?: () => void;
}

export function FilterPanel({
  filters,
  filterOptions,
  filterOptionsLoading,
  filterOptionsError,
  refetchFilterOptions,
  showPlatformFilter = true,
  filterChips = [],
  onRemoveChip,
  onRemoveWithChildren,
  onClearAllFilters,
}: FilterPanelProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  const dropdowns = useFilterDropdowns();

  // Parse current URL params (handles both compressed and legacy)
  const urlParams = useMemo(() => parseFilterParams(searchParams), [searchParams]);

  // Helper to update filter order when categories are added/removed
  const getUpdatedFilterOrder = useCallback(
    (currentFo: string | undefined, categoryName: string, action: 'add' | 'remove'): string | undefined => {
      const currentOrder = currentFo?.split(',').filter(Boolean) ?? [];

      if (action === 'add' && !currentOrder.includes(categoryName)) {
        currentOrder.push(categoryName);
        return currentOrder.join(',');
      } else if (action === 'remove') {
        const idx = currentOrder.indexOf(categoryName);
        if (idx !== -1) {
          const newOrder = currentOrder.slice(0, idx);
          return newOrder.length > 0 ? newOrder.join(',') : undefined;
        }
      }
      return currentFo;
    },
    []
  );

  // Memoize handlers for all filter configs to avoid recreation on every render
  const filterHandlers = useMemo(() => {
    const handlers: Record<
      string,
      { apply: (values: string[]) => void; clear: () => void }
    > = {};

    FILTER_CONFIGS.forEach((config) => {
      handlers[config.id] = {
        // Apply receives the full array of selected values at once
        apply: (values: string[]) => {
          const currentValue = filters[config.paramKey];
          const current =
            typeof currentValue === 'string' ? currentValue.split(',').filter(Boolean) : [];
          const hadValues = current.length > 0;
          const hasValues = values.length > 0;

          let newFo = urlParams.fo;

          // Update filter order based on whether category now has values
          if (!hadValues && hasValues) {
            newFo = getUpdatedFilterOrder(urlParams.fo, config.categoryName, 'add');
          } else if (hadValues && !hasValues) {
            newFo = getUpdatedFilterOrder(urlParams.fo, config.categoryName, 'remove');
          }

          const newParams: FilterUrlParams = {
            ...urlParams,
            [config.paramKey]: hasValues ? values.join(',') : undefined,
            fo: newFo,
            page: undefined, // Reset to page 1
          };

          setSearchParams(buildFilterSearchParams(newParams));
        },
        clear: () => {
          const newFo = getUpdatedFilterOrder(urlParams.fo, config.categoryName, 'remove');

          const newParams: FilterUrlParams = {
            ...urlParams,
            [config.paramKey]: undefined,
            fo: newFo,
            page: undefined,
          };

          setSearchParams(buildFilterSearchParams(newParams));
          dropdowns.setOpen(`${config.id}-desktop`, false);
          dropdowns.setOpen(`${config.id}-mobile`, false);
        },
      };
    });

    return handlers;
  }, [filters, urlParams, setSearchParams, dropdowns, getUpdatedFilterOrder]);

  // Get visible filter configs based on showPlatformFilter prop
  const visibleConfigs = useMemo(
    () => FILTER_CONFIGS.filter((config) => showPlatformFilter || config.id !== 'platform'),
    [showPlatformFilter]
  );

  // Handle year range changes
  const handleYearChange = useCallback(
    (yearFrom: number | undefined, yearTo: number | undefined) => {
      // Check if year filter existed before
      const hadYearFilter = urlParams.yearFrom !== undefined || urlParams.yearTo !== undefined;
      const hasYearFilter = yearFrom !== undefined || yearTo !== undefined;

      let newFo = urlParams.fo;

      // Update filter order
      if (!hadYearFilter && hasYearFilter) {
        newFo = getUpdatedFilterOrder(urlParams.fo, 'Year', 'add');
      } else if (hadYearFilter && !hasYearFilter) {
        newFo = getUpdatedFilterOrder(urlParams.fo, 'Year', 'remove');
      }

      const newParams: FilterUrlParams = {
        ...urlParams,
        yearFrom,
        yearTo,
        fo: newFo,
        page: undefined, // Reset to page 1
      };

      setSearchParams(buildFilterSearchParams(newParams));
    },
    [urlParams, setSearchParams, getUpdatedFilterOrder]
  );

  /**
   * Render all filters with consistent behavior
   * Handles both desktop and mobile layouts with single function
   */
  const renderFilters = useCallback(
    (isMobile: boolean) => {
      const suffix = isMobile ? 'mobile' : 'desktop';

      return visibleConfigs.map((config) => {
        const handlers = filterHandlers[config.id];
        const currentValue = filters[config.paramKey];
        const selectedValues =
          typeof currentValue === 'string' ? currentValue.split(',').filter(Boolean) : [];
        const options = filterOptions?.[config.optionsKey] ?? [];

        return (
          <FilterDropdown
            key={`${config.id}-${suffix}`}
            label={config.label}
            icon={<config.icon size={16} />}
            options={options}
            selectedValues={selectedValues}
            isOpen={dropdowns.isOpen(`${config.id}-${suffix}`)}
            onOpenChange={(open) => dropdowns.setOpen(`${config.id}-${suffix}`, open)}
            onApply={handlers.apply}
            onClear={handlers.clear}
            placeholder={config.placeholder ?? config.label}
            emptyMessage={filterOptionsLoading ? 'Loading...' : config.emptyMessage}
            compact={isMobile}
          />
        );
      });
    },
    [visibleConfigs, filterHandlers, filters, filterOptions, filterOptionsLoading, dropdowns]
  );

  return (
    <fieldset className="space-y-4 border-0 p-0">
      <legend className="flex items-center gap-2 text-lg font-semibold mb-4">
        <Filter size={20} className="text-primary" aria-hidden="true" />
        Filters
      </legend>

      {/* Error state with retry */}
      {filterOptionsError && !filterOptions ? (
        <div className="flex items-center gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <AlertCircle size={18} className="text-destructive flex-shrink-0" aria-hidden="true" />
          <span className="text-sm text-destructive">Failed to load filter options</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchFilterOptions()}
            className="ml-auto h-7 px-2 text-xs"
          >
            <RefreshCw size={14} className="mr-1" aria-hidden="true" />
            Retry
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Desktop Layout */}
          <div className="hidden md:flex items-center gap-3 flex-wrap">
            {renderFilters(false)}
            <YearRangeFilter
              yearFrom={filters.yearFrom}
              yearTo={filters.yearTo}
              minYear={filterOptions?.yearRange?.min ?? 1980}
              maxYear={filterOptions?.yearRange?.max ?? new Date().getFullYear()}
              onYearChange={handleYearChange}
            />
          </div>

          {/* Mobile Layout */}
          <div className="md:hidden flex items-center gap-2">
            {renderFilters(true)}
            <YearRangeFilter
              yearFrom={filters.yearFrom}
              yearTo={filters.yearTo}
              minYear={filterOptions?.yearRange?.min ?? 1980}
              maxYear={filterOptions?.yearRange?.max ?? new Date().getFullYear()}
              onYearChange={handleYearChange}
              compact
            />
          </div>

          {/* Active Filter Chips */}
          {filterChips.length > 0 && onRemoveChip ? (
            <FilterChips
              chips={filterChips}
              onRemove={onRemoveChip}
              onRemoveWithChildren={onRemoveWithChildren}
              onClearAll={onClearAllFilters}
            />
          ) : null}
        </div>
      )}
    </fieldset>
  );
}
