import { useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, AlertCircle, RefreshCw } from 'lucide-react';
import { useFilterOptions } from '@/hooks/useFilterOptions';
import { useFilterDropdowns } from '@/hooks/useFilterDropdowns';
import { FilterDropdown } from './FilterDropdown';
import { YearRangeFilter } from './YearRangeFilter';
import { Button } from '@/components/ui/button';
import { FILTER_CONFIGS } from './filterConfig';
import type { GameFilters } from '@/types/game';

interface FilterPanelProps {
  filters: GameFilters;
  showPlatformFilter?: boolean;
}

export function FilterPanel({ filters, showPlatformFilter = true }: FilterPanelProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  const dropdowns = useFilterDropdowns();

  const {
    data: filterOptions,
    isLoading: filterOptionsLoading,
    error: filterOptionsError,
    refetch: refetchFilterOptions,
  } = useFilterOptions();

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const newParams = new URLSearchParams(searchParams);
      if (value) {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
      newParams.delete('page'); // Reset to page 1
      setSearchParams(newParams);
    },
    [searchParams, setSearchParams]
  );

  // Memoize handlers for all filter configs to avoid recreation on every render
  const filterHandlers = useMemo(() => {
    const handlers: Record<
      string,
      { toggle: (value: string) => void; clear: () => void }
    > = {};

    FILTER_CONFIGS.forEach((config) => {
      handlers[config.id] = {
        toggle: (value: string) => {
          const currentValue = filters[config.paramKey];
          const current =
            typeof currentValue === 'string' ? currentValue.split(',').filter(Boolean) : [];
          const updated = current.includes(value)
            ? current.filter((v: string) => v !== value)
            : [...current, value];
          updateFilter(config.paramKey, updated.join(','));
        },
        clear: () => {
          updateFilter(config.paramKey, '');
          dropdowns.setOpen(`${config.id}-desktop`, false);
          dropdowns.setOpen(`${config.id}-mobile`, false);
        },
      };
    });

    return handlers;
  }, [filters, updateFilter, dropdowns]);

  // Get visible filter configs based on showPlatformFilter prop
  const visibleConfigs = useMemo(
    () => FILTER_CONFIGS.filter((config) => showPlatformFilter || config.id !== 'platform'),
    [showPlatformFilter]
  );

  // Handle year range changes
  const handleYearChange = useCallback(
    (yearFrom: number | undefined, yearTo: number | undefined) => {
      const newParams = new URLSearchParams(searchParams);

      if (yearFrom !== undefined) {
        newParams.set('yearFrom', yearFrom.toString());
      } else {
        newParams.delete('yearFrom');
      }

      if (yearTo !== undefined) {
        newParams.set('yearTo', yearTo.toString());
      } else {
        newParams.delete('yearTo');
      }

      newParams.delete('page'); // Reset to page 1
      setSearchParams(newParams);
    },
    [searchParams, setSearchParams]
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
            onToggle={handlers.toggle}
            onClear={handlers.clear}
            placeholder={config.placeholder}
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
        </div>
      )}
    </fieldset>
  );
}
