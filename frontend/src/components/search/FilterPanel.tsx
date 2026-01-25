import { useSearchParams } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { Filter, X, Calendar, Gamepad2, Tv, User, Building2, Users, Globe, ArrowUpDown } from 'lucide-react';
import { useFilterOptions } from '@/hooks/useFilterOptions';
import { useDebounce } from '@/hooks/useDebounce';
import { useFilterDropdowns } from '@/hooks/useFilterDropdowns';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FilterDropdown } from './FilterDropdown';

interface FilterPanelProps {
  filters: {
    platform?: string;
    series?: string;
    developers?: string;
    publishers?: string;
    playModes?: string;
    languages?: string;
    tags?: string;
    yearFrom?: number;
    yearTo?: number;
    sortBy?: string;
    sortOrder?: string;
    webPlayableOnly?: boolean;
  };
  showPlatformFilter?: boolean;
}

export function FilterPanel({ filters, showPlatformFilter = true }: FilterPanelProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Consolidated dropdown state management
  const dropdowns = useFilterDropdowns();

  // Helper functions for dropdown state
  const showTagDropdownDesktop = dropdowns.isOpen('tag-desktop');
  const setShowTagDropdownDesktop = useCallback((open: boolean) => dropdowns.setOpen('tag-desktop', open), [dropdowns]);
  const showTagDropdownMobile = dropdowns.isOpen('tag-mobile');
  const setShowTagDropdownMobile = useCallback((open: boolean) => dropdowns.setOpen('tag-mobile', open), [dropdowns]);

  const showPlatformDropdownDesktop = dropdowns.isOpen('platform-desktop');
  const setShowPlatformDropdownDesktop = useCallback((open: boolean) => dropdowns.setOpen('platform-desktop', open), [dropdowns]);
  const showPlatformDropdownMobile = dropdowns.isOpen('platform-mobile');
  const setShowPlatformDropdownMobile = useCallback((open: boolean) => dropdowns.setOpen('platform-mobile', open), [dropdowns]);

  const showSeriesDropdownDesktop = dropdowns.isOpen('series-desktop');
  const setShowSeriesDropdownDesktop = useCallback((open: boolean) => dropdowns.setOpen('series-desktop', open), [dropdowns]);
  const showSeriesDropdownMobile = dropdowns.isOpen('series-mobile');
  const setShowSeriesDropdownMobile = useCallback((open: boolean) => dropdowns.setOpen('series-mobile', open), [dropdowns]);

  const showDeveloperDropdownDesktop = dropdowns.isOpen('developer-desktop');
  const setShowDeveloperDropdownDesktop = useCallback((open: boolean) => dropdowns.setOpen('developer-desktop', open), [dropdowns]);
  const showDeveloperDropdownMobile = dropdowns.isOpen('developer-mobile');
  const setShowDeveloperDropdownMobile = useCallback((open: boolean) => dropdowns.setOpen('developer-mobile', open), [dropdowns]);

  const showPublisherDropdownDesktop = dropdowns.isOpen('publisher-desktop');
  const setShowPublisherDropdownDesktop = useCallback((open: boolean) => dropdowns.setOpen('publisher-desktop', open), [dropdowns]);
  const showPublisherDropdownMobile = dropdowns.isOpen('publisher-mobile');
  const setShowPublisherDropdownMobile = useCallback((open: boolean) => dropdowns.setOpen('publisher-mobile', open), [dropdowns]);

  const showPlayModeDropdownDesktop = dropdowns.isOpen('playmode-desktop');
  const setShowPlayModeDropdownDesktop = useCallback((open: boolean) => dropdowns.setOpen('playmode-desktop', open), [dropdowns]);
  const showPlayModeDropdownMobile = dropdowns.isOpen('playmode-mobile');
  const setShowPlayModeDropdownMobile = useCallback((open: boolean) => dropdowns.setOpen('playmode-mobile', open), [dropdowns]);

  const showLanguageDropdownDesktop = dropdowns.isOpen('language-desktop');
  const setShowLanguageDropdownDesktop = useCallback((open: boolean) => dropdowns.setOpen('language-desktop', open), [dropdowns]);
  const showLanguageDropdownMobile = dropdowns.isOpen('language-mobile');
  const setShowLanguageDropdownMobile = useCallback((open: boolean) => dropdowns.setOpen('language-mobile', open), [dropdowns]);

  // Fetch all filter options in one call
  const { data: filterOptions } = useFilterOptions();
  const allSeries = filterOptions?.series || [];
  const allDevelopers = filterOptions?.developers || [];
  const allPublishers = filterOptions?.publishers || [];
  const allPlayModes = filterOptions?.playModes || [];
  const allLanguages = filterOptions?.languages || [];
  const allTags = filterOptions?.tags || [];
  const allPlatforms = filterOptions?.platforms || [];

  // Local state for year inputs
  const [yearFromInput, setYearFromInput] = useState<string>(filters.yearFrom?.toString() || '');
  const [yearToInput, setYearToInput] = useState<string>(filters.yearTo?.toString() || '');

  // Debounce year input values
  const debouncedYearFrom = useDebounce(yearFromInput, 500);
  const debouncedYearTo = useDebounce(yearToInput, 500);

  // Parse selected values from URL params
  const selectedTags = filters.tags ? filters.tags.split(',') : [];
  const selectedPlatforms = filters.platform ? filters.platform.split(',') : [];
  const selectedSeries = filters.series ? filters.series.split(',') : [];
  const selectedDevelopers = filters.developers ? filters.developers.split(',') : [];
  const selectedPublishers = filters.publishers ? filters.publishers.split(',') : [];
  const selectedPlayModes = filters.playModes ? filters.playModes.split(',') : [];
  const selectedLanguages = filters.languages ? filters.languages.split(',') : [];

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

  const toggleTag = (tagName: string) => {
    const newTags = selectedTags.includes(tagName)
      ? selectedTags.filter(t => t !== tagName)
      : [...selectedTags, tagName];

    updateFilter('tags', newTags.join(','));
  };

  const clearTags = () => {
    updateFilter('tags', '');
    setShowTagDropdownDesktop(false);
    setShowTagDropdownMobile(false);
  };

  const togglePlatform = (platformName: string) => {
    const newPlatforms = selectedPlatforms.includes(platformName)
      ? selectedPlatforms.filter(p => p !== platformName)
      : [...selectedPlatforms, platformName];

    updateFilter('platform', newPlatforms.join(','));
  };

  const clearPlatforms = () => {
    updateFilter('platform', '');
    setShowPlatformDropdownDesktop(false);
    setShowPlatformDropdownMobile(false);
  };

  const toggleSeries = (seriesName: string) => {
    const newSeries = selectedSeries.includes(seriesName)
      ? selectedSeries.filter(s => s !== seriesName)
      : [...selectedSeries, seriesName];

    updateFilter('series', newSeries.join(','));
  };

  const clearSeries = () => {
    updateFilter('series', '');
    setShowSeriesDropdownDesktop(false);
    setShowSeriesDropdownMobile(false);
  };

  const toggleDeveloper = (developerName: string) => {
    const newDevelopers = selectedDevelopers.includes(developerName)
      ? selectedDevelopers.filter(d => d !== developerName)
      : [...selectedDevelopers, developerName];

    updateFilter('developers', newDevelopers.join(','));
  };

  const clearDevelopers = () => {
    updateFilter('developers', '');
    setShowDeveloperDropdownDesktop(false);
    setShowDeveloperDropdownMobile(false);
  };

  const togglePublisher = (publisherName: string) => {
    const newPublishers = selectedPublishers.includes(publisherName)
      ? selectedPublishers.filter(p => p !== publisherName)
      : [...selectedPublishers, publisherName];

    updateFilter('publishers', newPublishers.join(','));
  };

  const clearPublishers = () => {
    updateFilter('publishers', '');
    setShowPublisherDropdownDesktop(false);
    setShowPublisherDropdownMobile(false);
  };

  const togglePlayMode = (playModeName: string) => {
    const newPlayModes = selectedPlayModes.includes(playModeName)
      ? selectedPlayModes.filter(pm => pm !== playModeName)
      : [...selectedPlayModes, playModeName];

    updateFilter('playModes', newPlayModes.join(','));
  };

  const clearPlayModes = () => {
    updateFilter('playModes', '');
    setShowPlayModeDropdownDesktop(false);
    setShowPlayModeDropdownMobile(false);
  };

  const toggleLanguage = (languageName: string) => {
    const newLanguages = selectedLanguages.includes(languageName)
      ? selectedLanguages.filter(l => l !== languageName)
      : [...selectedLanguages, languageName];

    updateFilter('languages', newLanguages.join(','));
  };

  const clearLanguages = () => {
    updateFilter('languages', '');
    setShowLanguageDropdownDesktop(false);
    setShowLanguageDropdownMobile(false);
  };

  return (
    <div className="space-y-4">
      {/* Filter Header */}
      <div className="flex items-center gap-2">
        <Filter size={20} className="text-primary" />
        <h2 className="text-lg font-semibold">Filters</h2>
      </div>

      {/* All Filters */}
      <div className="space-y-3">
        {/* With Platform Filter */}
        {showPlatformFilter && (
          <>
            {/* Desktop Layout: Single Row */}
            <div className="hidden md:flex items-center gap-3 flex-wrap">
              {/* Platform Filter - Desktop */}
              <FilterDropdown
                label="Platform"
                icon={<Gamepad2 size={16} />}
                options={allPlatforms}
                selectedValues={selectedPlatforms}
                isOpen={showPlatformDropdownDesktop}
                onOpenChange={setShowPlatformDropdownDesktop}
                onToggle={togglePlatform}
                onClear={clearPlatforms}
                placeholder="Select Platforms"
                emptyMessage="No platforms available"
              />

              {/* Series Filter - Desktop */}
              <FilterDropdown
                label="Series"
                icon={<Tv size={16} />}
                options={allSeries}
                selectedValues={selectedSeries}
                isOpen={showSeriesDropdownDesktop}
                onOpenChange={setShowSeriesDropdownDesktop}
                onToggle={toggleSeries}
                onClear={clearSeries}
                emptyMessage="No series available"
              />

              {/* Developer Filter - Desktop */}
              <FilterDropdown
                label="Developer"
                icon={<User size={16} />}
                options={allDevelopers}
                selectedValues={selectedDevelopers}
                isOpen={showDeveloperDropdownDesktop}
                onOpenChange={setShowDeveloperDropdownDesktop}
                onToggle={toggleDeveloper}
                onClear={clearDevelopers}
                emptyMessage="No developers available"
              />

              {/* Publisher Filter - Desktop */}
              <FilterDropdown
                label="Publisher"
                icon={<Building2 size={16} />}
                options={allPublishers}
                selectedValues={selectedPublishers}
                isOpen={showPublisherDropdownDesktop}
                onOpenChange={setShowPublisherDropdownDesktop}
                onToggle={togglePublisher}
                onClear={clearPublishers}
                emptyMessage="No publishers available"
              />

              {/* Play Mode Filter - Desktop */}
              <FilterDropdown
                label="Play Mode"
                icon={<Users size={16} />}
                options={allPlayModes}
                selectedValues={selectedPlayModes}
                isOpen={showPlayModeDropdownDesktop}
                onOpenChange={setShowPlayModeDropdownDesktop}
                onToggle={togglePlayMode}
                onClear={clearPlayModes}
                emptyMessage="No play modes available"
              />

              {/* Language Filter - Desktop */}
              <FilterDropdown
                label="Language"
                icon={<Globe size={16} />}
                options={allLanguages}
                selectedValues={selectedLanguages}
                isOpen={showLanguageDropdownDesktop}
                onOpenChange={setShowLanguageDropdownDesktop}
                onToggle={toggleLanguage}
                onClear={clearLanguages}
                emptyMessage="No languages available"
              />

              {/* Tag Filter - Desktop */}
              <FilterDropdown
                label="Tag"
                options={allTags}
                selectedValues={selectedTags}
                isOpen={showTagDropdownDesktop}
                onOpenChange={setShowTagDropdownDesktop}
                onToggle={toggleTag}
                onClear={clearTags}
                placeholder="Select Tags"
                emptyMessage="No tags available"
              />

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

              {/* Sort Controls - Pushed to Right */}
              <div className="ml-auto flex items-center gap-2">
                <select
                  value={filters.sortBy || 'title'}
                  onChange={(e) => updateFilter('sortBy', e.target.value)}
                  className="px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-ring"
                  aria-label="Sort by"
                >
                  <option value="title">Title</option>
                  <option value="releaseDate">Release Date</option>
                  <option value="dateAdded">Date Added</option>
                  <option value="developer">Developer</option>
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="h-10 px-3"
                  type="button"
                  title={filters.sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                >
                  <ArrowUpDown size={16} />
                  <span className="ml-1 text-xs">{filters.sortOrder === 'asc' ? 'A-Z' : 'Z-A'}</span>
                </Button>
              </div>
            </div>

            {/* Mobile Layout: Stacked */}
            <div className="md:hidden space-y-2">
              {/* Row 1: Platform, Series, Developer, Publisher, Play Mode, Language, Tags, and Sort */}
              <div className="flex items-center gap-2">
                {/* Platform Filter - Mobile */}
                <FilterDropdown
                  label="Platform"
                  icon={<Gamepad2 size={16} />}
                  options={allPlatforms}
                  selectedValues={selectedPlatforms}
                  isOpen={showPlatformDropdownMobile}
                  onOpenChange={setShowPlatformDropdownMobile}
                  onToggle={togglePlatform}
                  onClear={clearPlatforms}
                  emptyMessage="No platforms available"
                  compact
                />

                {/* Series Filter - Mobile */}
                <FilterDropdown
                  label="Series"
                  icon={<Tv size={16} />}
                  options={allSeries}
                  selectedValues={selectedSeries}
                  isOpen={showSeriesDropdownMobile}
                  onOpenChange={setShowSeriesDropdownMobile}
                  onToggle={toggleSeries}
                  onClear={clearSeries}
                  emptyMessage="No series available"
                  compact
                />

                {/* Developer Filter - Mobile */}
                <FilterDropdown
                  label="Developer"
                  icon={<User size={16} />}
                  options={allDevelopers}
                  selectedValues={selectedDevelopers}
                  isOpen={showDeveloperDropdownMobile}
                  onOpenChange={setShowDeveloperDropdownMobile}
                  onToggle={toggleDeveloper}
                  onClear={clearDevelopers}
                  emptyMessage="No developers available"
                  compact
                />

                {/* Publisher Filter - Mobile */}
                <FilterDropdown
                  label="Publisher"
                  icon={<Building2 size={16} />}
                  options={allPublishers}
                  selectedValues={selectedPublishers}
                  isOpen={showPublisherDropdownMobile}
                  onOpenChange={setShowPublisherDropdownMobile}
                  onToggle={togglePublisher}
                  onClear={clearPublishers}
                  emptyMessage="No publishers available"
                  compact
                />

                {/* Play Mode Filter - Mobile */}
                <FilterDropdown
                  label="Play Mode"
                  icon={<Users size={16} />}
                  options={allPlayModes}
                  selectedValues={selectedPlayModes}
                  isOpen={showPlayModeDropdownMobile}
                  onOpenChange={setShowPlayModeDropdownMobile}
                  onToggle={togglePlayMode}
                  onClear={clearPlayModes}
                  emptyMessage="No play modes available"
                  compact
                />

                {/* Language Filter - Mobile */}
                <FilterDropdown
                  label="Language"
                  icon={<Globe size={16} />}
                  options={allLanguages}
                  selectedValues={selectedLanguages}
                  isOpen={showLanguageDropdownMobile}
                  onOpenChange={setShowLanguageDropdownMobile}
                  onToggle={toggleLanguage}
                  onClear={clearLanguages}
                  emptyMessage="No languages available"
                  compact
                />

                {/* Tag Filter - Mobile */}
                <FilterDropdown
                  label="Tag"
                  options={allTags}
                  selectedValues={selectedTags}
                  isOpen={showTagDropdownMobile}
                  onOpenChange={setShowTagDropdownMobile}
                  onToggle={toggleTag}
                  onClear={clearTags}
                  placeholder="Tags"
                  emptyMessage="No tags available"
                />

                <select
                  value={filters.sortBy || 'title'}
                  onChange={(e) => updateFilter('sortBy', e.target.value)}
                  className="flex-1 px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-ring"
                  aria-label="Sort by"
                >
                  <option value="title">Title</option>
                  <option value="releaseDate">Release Date</option>
                  <option value="dateAdded">Date Added</option>
                  <option value="developer">Developer</option>
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="h-10 px-2"
                  type="button"
                  title={filters.sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                >
                  <ArrowUpDown size={16} />
                </Button>
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
          </>
        )}

        {/* Tag Filter Popover - Desktop and Mobile (No platform filter) */}
        {!showPlatformFilter && (
          <>
            {/* Desktop Layout: Single Row */}
            <div className="hidden md:flex items-center gap-3 flex-wrap">
              {/* Tag Filter */}
              <FilterDropdown
                label="Tag"
                options={allTags}
                selectedValues={selectedTags}
                isOpen={showTagDropdownDesktop}
                onOpenChange={setShowTagDropdownDesktop}
                onToggle={toggleTag}
                onClear={clearTags}
                placeholder="Select Tags"
                emptyMessage="No tags available"
              />

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

              {/* Sort Controls - Pushed to Right */}
              <div className="ml-auto flex items-center gap-2">
                <select
                  value={filters.sortBy || 'title'}
                  onChange={(e) => updateFilter('sortBy', e.target.value)}
                  className="px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-ring"
                  aria-label="Sort by"
                >
                  <option value="title">Title</option>
                  <option value="releaseDate">Release Date</option>
                  <option value="dateAdded">Date Added</option>
                  <option value="developer">Developer</option>
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="h-10 px-3"
                  type="button"
                  title={filters.sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                >
                  <ArrowUpDown size={16} />
                  <span className="ml-1 text-xs">{filters.sortOrder === 'asc' ? 'A-Z' : 'Z-A'}</span>
                </Button>
              </div>
            </div>

            {/* Mobile Layout: Stacked */}
            <div className="md:hidden space-y-2">
              {/* Row 1: Tags and Sort */}
              <div className="flex items-center gap-2">
                <FilterDropdown
                  label="Tag"
                  options={allTags}
                  selectedValues={selectedTags}
                  isOpen={showTagDropdownMobile}
                  onOpenChange={setShowTagDropdownMobile}
                  onToggle={toggleTag}
                  onClear={clearTags}
                  placeholder="Tags"
                  emptyMessage="No tags available"
                />

                <select
                  value={filters.sortBy || 'title'}
                  onChange={(e) => updateFilter('sortBy', e.target.value)}
                  className="flex-1 px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-ring"
                  aria-label="Sort by"
                >
                  <option value="title">Title</option>
                  <option value="releaseDate">Release Date</option>
                  <option value="dateAdded">Date Added</option>
                  <option value="developer">Developer</option>
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="h-10 px-2"
                  type="button"
                  title={filters.sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                >
                  <ArrowUpDown size={16} />
                </Button>
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
          </>
        )}

        {/* Selected Platforms Row */}
        {selectedPlatforms.length > 0 && showPlatformFilter && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Platforms:</span>
            {selectedPlatforms.map((platform) => (
              <Badge
                key={platform}
                variant="default"
                className="gap-1"
              >
                {platform}
                <button
                  onClick={() => togglePlatform(platform)}
                  className="hover:text-primary-foreground/80"
                  aria-label={`Remove ${platform} filter`}
                >
                  <X size={12} />
                </button>
              </Badge>
            ))}
          </div>
        )}

        {/* Selected Tags Row */}
        {selectedTags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Tags:</span>
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
                  aria-label={`Remove ${tag} tag`}
                >
                  <X size={12} />
                </button>
              </Badge>
            ))}
          </div>
        )}

        {/* Selected Series Row */}
        {selectedSeries.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Series:</span>
            {selectedSeries.map((series) => (
              <Badge
                key={series}
                variant="default"
                className="gap-1"
              >
                {series}
                <button
                  onClick={() => toggleSeries(series)}
                  className="hover:text-primary-foreground/80"
                  aria-label={`Remove ${series} filter`}
                >
                  <X size={12} />
                </button>
              </Badge>
            ))}
          </div>
        )}

        {/* Selected Developers Row */}
        {selectedDevelopers.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Developers:</span>
            {selectedDevelopers.map((developer) => (
              <Badge
                key={developer}
                variant="default"
                className="gap-1"
              >
                {developer}
                <button
                  onClick={() => toggleDeveloper(developer)}
                  className="hover:text-primary-foreground/80"
                  aria-label={`Remove ${developer} filter`}
                >
                  <X size={12} />
                </button>
              </Badge>
            ))}
          </div>
        )}

        {/* Selected Publishers Row */}
        {selectedPublishers.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Publishers:</span>
            {selectedPublishers.map((publisher) => (
              <Badge
                key={publisher}
                variant="default"
                className="gap-1"
              >
                {publisher}
                <button
                  onClick={() => togglePublisher(publisher)}
                  className="hover:text-primary-foreground/80"
                  aria-label={`Remove ${publisher} filter`}
                >
                  <X size={12} />
                </button>
              </Badge>
            ))}
          </div>
        )}

        {/* Selected Play Modes Row */}
        {selectedPlayModes.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Play Modes:</span>
            {selectedPlayModes.map((playMode) => (
              <Badge
                key={playMode}
                variant="default"
                className="gap-1"
              >
                {playMode}
                <button
                  onClick={() => togglePlayMode(playMode)}
                  className="hover:text-primary-foreground/80"
                  aria-label={`Remove ${playMode} filter`}
                >
                  <X size={12} />
                </button>
              </Badge>
            ))}
          </div>
        )}

        {/* Selected Languages Row */}
        {selectedLanguages.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Languages:</span>
            {selectedLanguages.map((language) => (
              <Badge
                key={language}
                variant="default"
                className="gap-1"
              >
                {language}
                <button
                  onClick={() => toggleLanguage(language)}
                  className="hover:text-primary-foreground/80"
                  aria-label={`Remove ${language} filter`}
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
