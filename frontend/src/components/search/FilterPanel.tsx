import { useSearchParams } from 'react-router-dom';
import { Filter, X } from 'lucide-react';
import { useFilterOptions } from '@/hooks/useFilterOptions';
import { useFilterDropdowns } from '@/hooks/useFilterDropdowns';
import { Badge } from '@/components/ui/badge';
import { FilterDropdown } from './FilterDropdown';
import { FILTER_CONFIGS } from './filterConfig';
import type { GameFilters } from '@/types/game';

/**
 * Create generic toggle and clear handlers for any filter
 * Eliminates need for 7 separate toggle/clear functions
 */
const createFilterHandlers = (
  paramKey: keyof GameFilters,
  dropdownId: string,
  filters: GameFilters,
  updateFilter: (key: string, value: string) => void,
  dropdowns: ReturnType<typeof useFilterDropdowns>
) => ({
  toggle: (value: string) => {
    const currentValue = filters[paramKey];
    const current = typeof currentValue === 'string' ? currentValue.split(',').filter(Boolean) : [];
    const updated = current.includes(value)
      ? current.filter((v: string) => v !== value)
      : [...current, value];
    updateFilter(paramKey, updated.join(','));
  },
  clear: () => {
    updateFilter(paramKey, '');
    dropdowns.setOpen(`${dropdownId}-desktop`, false);
    dropdowns.setOpen(`${dropdownId}-mobile`, false);
  },
});

interface FilterPanelProps {
  filters: GameFilters;
  showPlatformFilter?: boolean;
}

export function FilterPanel({ filters, showPlatformFilter = true }: FilterPanelProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Consolidated dropdown state management
  const dropdowns = useFilterDropdowns();

  // Fetch all filter options in one call
  const { data: filterOptions } = useFilterOptions();

  const updateFilter = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    newParams.delete('page'); // Reset to page 1
    setSearchParams(newParams);
  };

  /**
   * Render all filters with consistent behavior
   * Handles both desktop and mobile layouts with single function
   */
  const renderFilters = (isMobile: boolean) => {
    const suffix = isMobile ? 'mobile' : 'desktop';

    return FILTER_CONFIGS
      .filter(config => showPlatformFilter || config.id !== 'platform')
      .map(config => {
        const handlers = createFilterHandlers(
          config.paramKey,
          config.id,
          filters,
          updateFilter,
          dropdowns
        );

        const currentValue = filters[config.paramKey];
        const selectedValues = typeof currentValue === 'string' ? currentValue.split(',').filter(Boolean) : [];
        const options = filterOptions?.[config.optionsKey] || [];

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
            emptyMessage={config.emptyMessage}
            compact={isMobile}
          />
        );
      });
  };

  /**
   * Render filter badges dynamically from config
   * Eliminates 7 separate badge sections
   */
  const renderFilterBadges = () => {
    return FILTER_CONFIGS
      .filter(config => showPlatformFilter || config.id !== 'platform')
      .map(config => {
        const currentValue = filters[config.paramKey];
        const selectedValues = typeof currentValue === 'string' ? currentValue.split(',').filter(Boolean) : [];
        if (selectedValues.length === 0) return null;

        const handlers = createFilterHandlers(
          config.paramKey,
          config.id,
          filters,
          updateFilter,
          dropdowns
        );

        return (
          <div key={config.id} className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">{config.badgeLabel}:</span>
            {selectedValues.map((value: string) => (
              <Badge key={value} variant="secondary" className="gap-1">
                {value}
                <button
                  onClick={() => handlers.toggle(value)}
                  className="ml-1 hover:text-destructive"
                  aria-label={`Remove ${value}`}
                >
                  <X size={12} />
                </button>
              </Badge>
            ))}
          </div>
        );
      });
  };

  return (
    <fieldset className="space-y-4 border-0 p-0">
      {/* Filter Header */}
      <legend className="flex items-center gap-2 text-lg font-semibold mb-4">
        <Filter size={20} className="text-primary" aria-hidden="true" />
        Filters
      </legend>

      {/* All Filters */}
      <div className="space-y-3">
        {/* With Platform Filter */}
        {showPlatformFilter ? (
          <>
            {/* Desktop Layout: Single Row */}
            <div className="hidden md:flex items-center gap-3 flex-wrap">
              {/* Filters - Data-driven rendering */}
              {renderFilters(false)}
            </div>

            {/* Mobile Layout */}
            <div className="md:hidden flex items-center gap-2">
              {/* Filters - Data-driven rendering */}
              {renderFilters(true)}
            </div>
          </>
        ) : null}

        {/* Filter Popover - Desktop and Mobile (No platform filter) */}
        {!showPlatformFilter ? (
          <>
            {/* Desktop Layout: Single Row */}
            <div className="hidden md:flex items-center gap-3 flex-wrap">
              {/* Filters - Data-driven rendering */}
              {renderFilters(false)}
            </div>

            {/* Mobile Layout */}
            <div className="md:hidden flex items-center gap-2">
              {/* Filters - Data-driven rendering */}
              {renderFilters(true)}
            </div>
          </>
        ) : null}

        {/* Filter Badges - Data-driven rendering */}
        <div className="space-y-2">
          {renderFilterBadges()}
        </div>
      </div>
    </fieldset>
  );
}
