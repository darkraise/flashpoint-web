import { useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Filter, Monitor, X, ChevronDown, Calendar } from 'lucide-react';
import { useTags } from '@/hooks/useTags';
import { useDebounce } from '@/hooks/useDebounce';
import { Toggle } from '@/components/ui/toggle';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface FilterPanelProps {
  filters: {
    platform?: string;
    tags?: string;
    yearFrom?: number;
    yearTo?: number;
    sortBy?: string;
    sortOrder?: string;
    webPlayableOnly?: boolean;
  };
}

export function FilterPanel({ filters }: FilterPanelProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const { data: allTags = [] } = useTags();

  // Local state for year inputs
  const [yearFromInput, setYearFromInput] = useState<string>(filters.yearFrom?.toString() || '');
  const [yearToInput, setYearToInput] = useState<string>(filters.yearTo?.toString() || '');

  // Debounce year input values
  const debouncedYearFrom = useDebounce(yearFromInput, 500);
  const debouncedYearTo = useDebounce(yearToInput, 500);

  const selectedTags = filters.tags ? filters.tags.split(',') : [];

  // Sync local state with filter props when they change externally
  useEffect(() => {
    setYearFromInput(filters.yearFrom?.toString() || '');
  }, [filters.yearFrom]);

  useEffect(() => {
    setYearToInput(filters.yearTo?.toString() || '');
  }, [filters.yearTo]);

  // Update filters when debounced values change
  useEffect(() => {
    const year = debouncedYearFrom ? parseInt(debouncedYearFrom) : undefined;
    if (year && (year < 1970 || year > 2100)) return; // Validation

    const currentYearFrom = filters.yearFrom?.toString() || '';
    if (debouncedYearFrom !== currentYearFrom) {
      updateFilter('yearFrom', debouncedYearFrom);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedYearFrom]);

  useEffect(() => {
    const year = debouncedYearTo ? parseInt(debouncedYearTo) : undefined;
    if (year && (year < 1970 || year > 2100)) return; // Validation

    const currentYearTo = filters.yearTo?.toString() || '';
    if (debouncedYearTo !== currentYearTo) {
      updateFilter('yearTo', debouncedYearTo);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedYearTo]);

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

  const toggleWebPlayable = () => {
    const newParams = new URLSearchParams(searchParams);
    const currentValue = newParams.get('webPlayableOnly') !== 'false';
    newParams.set('webPlayableOnly', (!currentValue).toString());
    newParams.delete('page'); // Reset to page 1
    setSearchParams(newParams);
  };

  const toggleTag = (tagName: string) => {
    const newTags = selectedTags.includes(tagName)
      ? selectedTags.filter(t => t !== tagName)
      : [...selectedTags, tagName];

    updateFilter('tags', newTags.join(','));
  };

  const clearTags = () => {
    updateFilter('tags', '');
    setShowTagDropdown(false);
  };

  // Show popular tags (top 20)
  const popularTags = allTags.slice(0, 20);

  return (
    <div className="space-y-4">
      {/* Filter Header */}
      <div className="flex items-center gap-2">
        <Filter size={20} className="text-primary" />
        <h2 className="text-lg font-semibold">Filters</h2>
      </div>

      {/* All Filters */}
      <div className="space-y-3">
        {/* Desktop Layout: Single Row */}
        <div className="hidden md:flex items-center gap-3 flex-wrap">
          {/* Web Playable Toggle */}
          <Toggle
            pressed={filters.webPlayableOnly !== false}
            onPressedChange={toggleWebPlayable}
            className="gap-2"
            title={filters.webPlayableOnly !== false ? 'Showing HTML5 and Flash games (web-playable)' : 'Showing all platforms'}
          >
            <Monitor size={16} />
            <span>{filters.webPlayableOnly !== false ? 'Web Only' : 'All Platforms'}</span>
          </Toggle>

          {/* Tag Filter */}
          <Popover open={showTagDropdown} onOpenChange={setShowTagDropdown} modal={false}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="min-w-[120px] justify-between" type="button">
                <span>
                  {selectedTags.length > 0 ? `${selectedTags.length} Tags` : 'Select Tags'}
                </span>
                <ChevronDown size={16} className={`transition-transform ${showTagDropdown ? 'rotate-180' : ''}`} />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[250px] md:w-[300px] p-0 z-[100]"
              align="start"
              sideOffset={8}
              collisionPadding={10}
              onOpenAutoFocus={(e: Event) => e.preventDefault()}
            >
              <div className="sticky top-0 bg-popover border-b p-2 z-10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Popular Tags</span>
                  {selectedTags.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearTags}
                      className="h-auto py-1 px-2 text-xs text-destructive hover:text-destructive"
                    >
                      Clear All
                    </Button>
                  )}
                </div>
              </div>
              <div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
                {popularTags.length > 0 ? (
                  popularTags.map((tag) => (
                    <label
                      key={tag.name}
                      className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedTags.includes(tag.name)}
                        onCheckedChange={() => toggleTag(tag.name)}
                      />
                      <span className="text-sm flex-1">{tag.name}</span>
                      <span className="text-xs text-muted-foreground">{tag.count.toLocaleString()}</span>
                    </label>
                  ))
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No tags available
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Year Range Filter */}
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-muted-foreground" />
            <Input
              type="number"
              placeholder="From year"
              value={yearFromInput}
              onChange={(e) => setYearFromInput(e.target.value)}
              min="1970"
              max="2100"
              className="w-24 h-10"
            />
            <span className="text-muted-foreground">-</span>
            <Input
              type="number"
              placeholder="To year"
              value={yearToInput}
              onChange={(e) => setYearToInput(e.target.value)}
              min="1970"
              max="2100"
              className="w-24 h-10"
            />
          </div>

          {/* Sort - Pushed to Right */}
          <select
            value={filters.sortBy || 'title'}
            onChange={(e) => updateFilter('sortBy', e.target.value)}
            className="ml-auto px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-ring"
          >
            <option value="title">Sort: Title</option>
            <option value="releaseDate">Sort: Release Date</option>
            <option value="dateAdded">Sort: Date Added</option>
            <option value="developer">Sort: Developer</option>
          </select>
        </div>

        {/* Mobile Layout: Stacked */}
        <div className="md:hidden space-y-2">
          {/* Row 1: Web Playable, Tags, and Sort */}
          <div className="flex items-center gap-2">
            <Toggle
              pressed={filters.webPlayableOnly !== false}
              onPressedChange={toggleWebPlayable}
              className="gap-2"
              title={filters.webPlayableOnly !== false ? 'Showing HTML5 and Flash games (web-playable)' : 'Showing all platforms'}
            >
              <Monitor size={16} />
              <span className="whitespace-nowrap">{filters.webPlayableOnly !== false ? 'Web Only' : 'All'}</span>
            </Toggle>

            <Popover open={showTagDropdown} onOpenChange={setShowTagDropdown} modal={false}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-between" type="button">
                  <span>
                    {selectedTags.length > 0 ? `${selectedTags.length} Tags` : 'Tags'}
                  </span>
                  <ChevronDown size={16} className={`ml-2 transition-transform ${showTagDropdown ? 'rotate-180' : ''}`} />
                </Button>
              </PopoverTrigger>
            </Popover>

            <select
              value={filters.sortBy || 'title'}
              onChange={(e) => updateFilter('sortBy', e.target.value)}
              className="flex-1 px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-ring"
            >
              <option value="title">Sort: Title</option>
              <option value="releaseDate">Sort: Release Date</option>
              <option value="dateAdded">Sort: Date Added</option>
              <option value="developer">Sort: Developer</option>
            </select>
          </div>

          {/* Row 2: Year Range */}
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-muted-foreground flex-shrink-0" />
            <Input
              type="number"
              placeholder="From"
              value={yearFromInput}
              onChange={(e) => setYearFromInput(e.target.value)}
              min="1970"
              max="2100"
              className="flex-1 h-10"
            />
            <span className="text-muted-foreground">-</span>
            <Input
              type="number"
              placeholder="To"
              value={yearToInput}
              onChange={(e) => setYearToInput(e.target.value)}
              min="1970"
              max="2100"
              className="flex-1 h-10"
            />
          </div>
        </div>

        {/* Selected Tags Row */}
        {selectedTags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {selectedTags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="gap-1"
              >
                {tag}
                <button
                  onClick={() => toggleTag(tag)}
                  className="hover:text-primary"
                >
                  <X size={12} />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
