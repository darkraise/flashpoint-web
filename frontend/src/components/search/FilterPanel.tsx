import { useSearchParams } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { Filter, X, ChevronDown, Calendar, Gamepad2, Tv, User, Building2, Users, Globe, ArrowUpDown } from 'lucide-react';
import { useFilterOptions } from '@/hooks/useFilterOptions';
import { useDebounce } from '@/hooks/useDebounce';
import { useFilterDropdowns } from '@/hooks/useFilterDropdowns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
              <Popover open={showPlatformDropdownDesktop} onOpenChange={setShowPlatformDropdownDesktop} modal={false}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="min-w-[140px] justify-between" type="button">
                    <span className="flex items-center gap-2">
                      <Gamepad2 size={16} />
                      {selectedPlatforms.length > 0 ? `${selectedPlatforms.length} Platforms` : 'Select Platforms'}
                    </span>
                    <ChevronDown size={16} className={`transition-transform ${showPlatformDropdownDesktop ? 'rotate-180' : ''}`} />
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
                      <span className="text-xs font-medium text-muted-foreground">Select Platforms</span>
                      {selectedPlatforms.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearPlatforms}
                          className="h-auto py-1 px-2 text-xs text-destructive hover:text-destructive"
                        >
                          Clear All
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
                    {allPlatforms.length > 0 ? (
                      allPlatforms.map((platform) => (
                        <label
                          key={platform.name}
                          className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded cursor-pointer"
                        >
                          <Checkbox
                            checked={selectedPlatforms.includes(platform.name)}
                            onCheckedChange={() => togglePlatform(platform.name)}
                          />
                          <span className="text-sm flex-1">{platform.name}</span>
                          <span className="text-xs text-muted-foreground">{platform.count.toLocaleString()}</span>
                        </label>
                      ))
                    ) : (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        No platforms available
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Series Filter - Desktop */}
              <Popover open={showSeriesDropdownDesktop} onOpenChange={setShowSeriesDropdownDesktop} modal={false}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="min-w-[120px] justify-between" type="button">
                    <span className="flex items-center gap-2">
                      <Tv size={16} />
                      {selectedSeries.length > 0 ? `${selectedSeries.length} Series` : 'Series'}
                    </span>
                    <ChevronDown size={16} className={`transition-transform ${showSeriesDropdownDesktop ? 'rotate-180' : ''}`} />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[250px] md:w-[300px] p-0 z-[100]" align="start" sideOffset={8} collisionPadding={10} onOpenAutoFocus={(e: Event) => e.preventDefault()}>
                  <div className="sticky top-0 bg-popover border-b p-2 z-10">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Select Series</span>
                      {selectedSeries.length > 0 && (
                        <Button variant="ghost" size="sm" onClick={clearSeries} className="h-auto py-1 px-2 text-xs text-destructive hover:text-destructive">
                          Clear All
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
                    {allSeries.length > 0 ? (
                      allSeries.map((series) => (
                        <label key={series.name} className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded cursor-pointer">
                          <Checkbox checked={selectedSeries.includes(series.name)} onCheckedChange={() => toggleSeries(series.name)} />
                          <span className="text-sm flex-1">{series.name}</span>
                          <span className="text-xs text-muted-foreground">{series.count.toLocaleString()}</span>
                        </label>
                      ))
                    ) : (
                      <div className="p-4 text-center text-sm text-muted-foreground">No series available</div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Developer Filter - Desktop */}
              <Popover open={showDeveloperDropdownDesktop} onOpenChange={setShowDeveloperDropdownDesktop} modal={false}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="min-w-[120px] justify-between" type="button">
                    <span className="flex items-center gap-2">
                      <User size={16} />
                      {selectedDevelopers.length > 0 ? `${selectedDevelopers.length} Devs` : 'Developer'}
                    </span>
                    <ChevronDown size={16} className={`transition-transform ${showDeveloperDropdownDesktop ? 'rotate-180' : ''}`} />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[250px] md:w-[300px] p-0 z-[100]" align="start" sideOffset={8} collisionPadding={10} onOpenAutoFocus={(e: Event) => e.preventDefault()}>
                  <div className="sticky top-0 bg-popover border-b p-2 z-10">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Select Developers</span>
                      {selectedDevelopers.length > 0 && (
                        <Button variant="ghost" size="sm" onClick={clearDevelopers} className="h-auto py-1 px-2 text-xs text-destructive hover:text-destructive">
                          Clear All
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
                    {allDevelopers.length > 0 ? (
                      allDevelopers.map((developer) => (
                        <label key={developer.name} className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded cursor-pointer">
                          <Checkbox checked={selectedDevelopers.includes(developer.name)} onCheckedChange={() => toggleDeveloper(developer.name)} />
                          <span className="text-sm flex-1">{developer.name}</span>
                          <span className="text-xs text-muted-foreground">{developer.count.toLocaleString()}</span>
                        </label>
                      ))
                    ) : (
                      <div className="p-4 text-center text-sm text-muted-foreground">No developers available</div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Publisher Filter - Desktop */}
              <Popover open={showPublisherDropdownDesktop} onOpenChange={setShowPublisherDropdownDesktop} modal={false}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="min-w-[120px] justify-between" type="button">
                    <span className="flex items-center gap-2">
                      <Building2 size={16} />
                      {selectedPublishers.length > 0 ? `${selectedPublishers.length} Pubs` : 'Publisher'}
                    </span>
                    <ChevronDown size={16} className={`transition-transform ${showPublisherDropdownDesktop ? 'rotate-180' : ''}`} />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[250px] md:w-[300px] p-0 z-[100]" align="start" sideOffset={8} collisionPadding={10} onOpenAutoFocus={(e: Event) => e.preventDefault()}>
                  <div className="sticky top-0 bg-popover border-b p-2 z-10">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Select Publishers</span>
                      {selectedPublishers.length > 0 && (
                        <Button variant="ghost" size="sm" onClick={clearPublishers} className="h-auto py-1 px-2 text-xs text-destructive hover:text-destructive">
                          Clear All
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
                    {allPublishers.length > 0 ? (
                      allPublishers.map((publisher) => (
                        <label key={publisher.name} className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded cursor-pointer">
                          <Checkbox checked={selectedPublishers.includes(publisher.name)} onCheckedChange={() => togglePublisher(publisher.name)} />
                          <span className="text-sm flex-1">{publisher.name}</span>
                          <span className="text-xs text-muted-foreground">{publisher.count.toLocaleString()}</span>
                        </label>
                      ))
                    ) : (
                      <div className="p-4 text-center text-sm text-muted-foreground">No publishers available</div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Play Mode Filter - Desktop */}
              <Popover open={showPlayModeDropdownDesktop} onOpenChange={setShowPlayModeDropdownDesktop} modal={false}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="min-w-[120px] justify-between" type="button">
                    <span className="flex items-center gap-2">
                      <Users size={16} />
                      {selectedPlayModes.length > 0 ? `${selectedPlayModes.length} Modes` : 'Play Mode'}
                    </span>
                    <ChevronDown size={16} className={`transition-transform ${showPlayModeDropdownDesktop ? 'rotate-180' : ''}`} />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[250px] md:w-[300px] p-0 z-[100]" align="start" sideOffset={8} collisionPadding={10} onOpenAutoFocus={(e: Event) => e.preventDefault()}>
                  <div className="sticky top-0 bg-popover border-b p-2 z-10">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Select Play Modes</span>
                      {selectedPlayModes.length > 0 && (
                        <Button variant="ghost" size="sm" onClick={clearPlayModes} className="h-auto py-1 px-2 text-xs text-destructive hover:text-destructive">
                          Clear All
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
                    {allPlayModes.length > 0 ? (
                      allPlayModes.map((playMode) => (
                        <label key={playMode.name} className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded cursor-pointer">
                          <Checkbox checked={selectedPlayModes.includes(playMode.name)} onCheckedChange={() => togglePlayMode(playMode.name)} />
                          <span className="text-sm flex-1">{playMode.name}</span>
                          <span className="text-xs text-muted-foreground">{playMode.count.toLocaleString()}</span>
                        </label>
                      ))
                    ) : (
                      <div className="p-4 text-center text-sm text-muted-foreground">No play modes available</div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Language Filter - Desktop */}
              <Popover open={showLanguageDropdownDesktop} onOpenChange={setShowLanguageDropdownDesktop} modal={false}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="min-w-[120px] justify-between" type="button">
                    <span className="flex items-center gap-2">
                      <Globe size={16} />
                      {selectedLanguages.length > 0 ? `${selectedLanguages.length} Langs` : 'Language'}
                    </span>
                    <ChevronDown size={16} className={`transition-transform ${showLanguageDropdownDesktop ? 'rotate-180' : ''}`} />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[250px] md:w-[300px] p-0 z-[100]" align="start" sideOffset={8} collisionPadding={10} onOpenAutoFocus={(e: Event) => e.preventDefault()}>
                  <div className="sticky top-0 bg-popover border-b p-2 z-10">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Select Languages</span>
                      {selectedLanguages.length > 0 && (
                        <Button variant="ghost" size="sm" onClick={clearLanguages} className="h-auto py-1 px-2 text-xs text-destructive hover:text-destructive">
                          Clear All
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
                    {allLanguages.length > 0 ? (
                      allLanguages.map((language) => (
                        <label key={language.name} className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded cursor-pointer">
                          <Checkbox checked={selectedLanguages.includes(language.name)} onCheckedChange={() => toggleLanguage(language.name)} />
                          <span className="text-sm flex-1">{language.name}</span>
                          <span className="text-xs text-muted-foreground">{language.count.toLocaleString()}</span>
                        </label>
                      ))
                    ) : (
                      <div className="p-4 text-center text-sm text-muted-foreground">No languages available</div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Tag Filter - Desktop */}
              <Popover open={showTagDropdownDesktop} onOpenChange={setShowTagDropdownDesktop} modal={false}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="min-w-[120px] justify-between" type="button">
                    <span>
                      {selectedTags.length > 0 ? `${selectedTags.length} Tags` : 'Select Tags'}
                    </span>
                    <ChevronDown size={16} className={`transition-transform ${showTagDropdownDesktop ? 'rotate-180' : ''}`} />
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
                    {allTags.length > 0 ? (
                      allTags.map((tag) => (
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
              {/* Row 1: Platform, Tags, and Sort */}
              <div className="flex items-center gap-2">
                {/* Platform Filter - Mobile */}
                <Popover open={showPlatformDropdownMobile} onOpenChange={setShowPlatformDropdownMobile} modal={false}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-between" type="button">
                      <Gamepad2 size={16} />
                      <span className="ml-1">
                        {selectedPlatforms.length > 0 ? selectedPlatforms.length : ''}
                      </span>
                      <ChevronDown size={16} className={`ml-1 transition-transform ${showPlatformDropdownMobile ? 'rotate-180' : ''}`} />
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
                        <span className="text-xs font-medium text-muted-foreground">Select Platforms</span>
                        {selectedPlatforms.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearPlatforms}
                            className="h-auto py-1 px-2 text-xs text-destructive hover:text-destructive"
                          >
                            Clear All
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
                      {allPlatforms.length > 0 ? (
                        allPlatforms.map((platform) => (
                          <label
                            key={platform.name}
                            className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded cursor-pointer"
                          >
                            <Checkbox
                              checked={selectedPlatforms.includes(platform.name)}
                              onCheckedChange={() => togglePlatform(platform.name)}
                            />
                            <span className="text-sm flex-1">{platform.name}</span>
                            <span className="text-xs text-muted-foreground">{platform.count.toLocaleString()}</span>
                          </label>
                        ))
                      ) : (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          No platforms available
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Series Filter - Mobile */}
                <Popover open={showSeriesDropdownMobile} onOpenChange={setShowSeriesDropdownMobile} modal={false}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-between" type="button">
                      <Tv size={16} />
                      <span className="ml-1">
                        {selectedSeries.length > 0 ? selectedSeries.length : ''}
                      </span>
                      <ChevronDown size={16} className={`ml-1 transition-transform ${showSeriesDropdownMobile ? 'rotate-180' : ''}`} />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[250px] md:w-[300px] p-0 z-[100]" align="start" sideOffset={8} collisionPadding={10} onOpenAutoFocus={(e: Event) => e.preventDefault()}>
                    <div className="sticky top-0 bg-popover border-b p-2 z-10">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Select Series</span>
                        {selectedSeries.length > 0 && (
                          <Button variant="ghost" size="sm" onClick={clearSeries} className="h-auto py-1 px-2 text-xs text-destructive hover:text-destructive">
                            Clear All
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
                      {allSeries.length > 0 ? (
                        allSeries.map((series) => (
                          <label key={series.name} className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded cursor-pointer">
                            <Checkbox checked={selectedSeries.includes(series.name)} onCheckedChange={() => toggleSeries(series.name)} />
                            <span className="text-sm flex-1">{series.name}</span>
                            <span className="text-xs text-muted-foreground">{series.count.toLocaleString()}</span>
                          </label>
                        ))
                      ) : (
                        <div className="p-4 text-center text-sm text-muted-foreground">No series available</div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Developer Filter - Mobile */}
                <Popover open={showDeveloperDropdownMobile} onOpenChange={setShowDeveloperDropdownMobile} modal={false}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-between" type="button">
                      <User size={16} />
                      <span className="ml-1">
                        {selectedDevelopers.length > 0 ? selectedDevelopers.length : ''}
                      </span>
                      <ChevronDown size={16} className={`ml-1 transition-transform ${showDeveloperDropdownMobile ? 'rotate-180' : ''}`} />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[250px] md:w-[300px] p-0 z-[100]" align="start" sideOffset={8} collisionPadding={10} onOpenAutoFocus={(e: Event) => e.preventDefault()}>
                    <div className="sticky top-0 bg-popover border-b p-2 z-10">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Select Developers</span>
                        {selectedDevelopers.length > 0 && (
                          <Button variant="ghost" size="sm" onClick={clearDevelopers} className="h-auto py-1 px-2 text-xs text-destructive hover:text-destructive">
                            Clear All
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
                      {allDevelopers.length > 0 ? (
                        allDevelopers.map((developer) => (
                          <label key={developer.name} className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded cursor-pointer">
                            <Checkbox checked={selectedDevelopers.includes(developer.name)} onCheckedChange={() => toggleDeveloper(developer.name)} />
                            <span className="text-sm flex-1">{developer.name}</span>
                            <span className="text-xs text-muted-foreground">{developer.count.toLocaleString()}</span>
                          </label>
                        ))
                      ) : (
                        <div className="p-4 text-center text-sm text-muted-foreground">No developers available</div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Publisher Filter - Mobile */}
                <Popover open={showPublisherDropdownMobile} onOpenChange={setShowPublisherDropdownMobile} modal={false}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-between" type="button">
                      <Building2 size={16} />
                      <span className="ml-1">
                        {selectedPublishers.length > 0 ? selectedPublishers.length : ''}
                      </span>
                      <ChevronDown size={16} className={`ml-1 transition-transform ${showPublisherDropdownMobile ? 'rotate-180' : ''}`} />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[250px] md:w-[300px] p-0 z-[100]" align="start" sideOffset={8} collisionPadding={10} onOpenAutoFocus={(e: Event) => e.preventDefault()}>
                    <div className="sticky top-0 bg-popover border-b p-2 z-10">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Select Publishers</span>
                        {selectedPublishers.length > 0 && (
                          <Button variant="ghost" size="sm" onClick={clearPublishers} className="h-auto py-1 px-2 text-xs text-destructive hover:text-destructive">
                            Clear All
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
                      {allPublishers.length > 0 ? (
                        allPublishers.map((publisher) => (
                          <label key={publisher.name} className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded cursor-pointer">
                            <Checkbox checked={selectedPublishers.includes(publisher.name)} onCheckedChange={() => togglePublisher(publisher.name)} />
                            <span className="text-sm flex-1">{publisher.name}</span>
                            <span className="text-xs text-muted-foreground">{publisher.count.toLocaleString()}</span>
                          </label>
                        ))
                      ) : (
                        <div className="p-4 text-center text-sm text-muted-foreground">No publishers available</div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Play Mode Filter - Mobile */}
                <Popover open={showPlayModeDropdownMobile} onOpenChange={setShowPlayModeDropdownMobile} modal={false}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-between" type="button">
                      <Users size={16} />
                      <span className="ml-1">
                        {selectedPlayModes.length > 0 ? selectedPlayModes.length : ''}
                      </span>
                      <ChevronDown size={16} className={`ml-1 transition-transform ${showPlayModeDropdownMobile ? 'rotate-180' : ''}`} />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[250px] md:w-[300px] p-0 z-[100]" align="start" sideOffset={8} collisionPadding={10} onOpenAutoFocus={(e: Event) => e.preventDefault()}>
                    <div className="sticky top-0 bg-popover border-b p-2 z-10">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Select Play Modes</span>
                        {selectedPlayModes.length > 0 && (
                          <Button variant="ghost" size="sm" onClick={clearPlayModes} className="h-auto py-1 px-2 text-xs text-destructive hover:text-destructive">
                            Clear All
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
                      {allPlayModes.length > 0 ? (
                        allPlayModes.map((playMode) => (
                          <label key={playMode.name} className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded cursor-pointer">
                            <Checkbox checked={selectedPlayModes.includes(playMode.name)} onCheckedChange={() => togglePlayMode(playMode.name)} />
                            <span className="text-sm flex-1">{playMode.name}</span>
                            <span className="text-xs text-muted-foreground">{playMode.count.toLocaleString()}</span>
                          </label>
                        ))
                      ) : (
                        <div className="p-4 text-center text-sm text-muted-foreground">No play modes available</div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Language Filter - Mobile */}
                <Popover open={showLanguageDropdownMobile} onOpenChange={setShowLanguageDropdownMobile} modal={false}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-between" type="button">
                      <Globe size={16} />
                      <span className="ml-1">
                        {selectedLanguages.length > 0 ? selectedLanguages.length : ''}
                      </span>
                      <ChevronDown size={16} className={`ml-1 transition-transform ${showLanguageDropdownMobile ? 'rotate-180' : ''}`} />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[250px] md:w-[300px] p-0 z-[100]" align="start" sideOffset={8} collisionPadding={10} onOpenAutoFocus={(e: Event) => e.preventDefault()}>
                    <div className="sticky top-0 bg-popover border-b p-2 z-10">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Select Languages</span>
                        {selectedLanguages.length > 0 && (
                          <Button variant="ghost" size="sm" onClick={clearLanguages} className="h-auto py-1 px-2 text-xs text-destructive hover:text-destructive">
                            Clear All
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
                      {allLanguages.length > 0 ? (
                        allLanguages.map((language) => (
                          <label key={language.name} className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded cursor-pointer">
                            <Checkbox checked={selectedLanguages.includes(language.name)} onCheckedChange={() => toggleLanguage(language.name)} />
                            <span className="text-sm flex-1">{language.name}</span>
                            <span className="text-xs text-muted-foreground">{language.count.toLocaleString()}</span>
                          </label>
                        ))
                      ) : (
                        <div className="p-4 text-center text-sm text-muted-foreground">No languages available</div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Tag Filter - Mobile */}
                <Popover open={showTagDropdownMobile} onOpenChange={setShowTagDropdownMobile} modal={false}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-between" type="button">
                      <span>
                        {selectedTags.length > 0 ? `${selectedTags.length} Tags` : 'Tags'}
                      </span>
                      <ChevronDown size={16} className={`ml-2 transition-transform ${showTagDropdownMobile ? 'rotate-180' : ''}`} />
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
                      {allTags.length > 0 ? (
                        allTags.map((tag) => (
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
              <Popover open={showTagDropdownDesktop} onOpenChange={setShowTagDropdownDesktop} modal={false}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="min-w-[120px] justify-between" type="button">
                    <span>
                      {selectedTags.length > 0 ? `${selectedTags.length} Tags` : 'Select Tags'}
                    </span>
                    <ChevronDown size={16} className={`transition-transform ${showTagDropdownDesktop ? 'rotate-180' : ''}`} />
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
                    {allTags.length > 0 ? (
                      allTags.map((tag) => (
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
                <Popover open={showTagDropdownMobile} onOpenChange={setShowTagDropdownMobile} modal={false}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-between" type="button">
                      <span>
                        {selectedTags.length > 0 ? `${selectedTags.length} Tags` : 'Tags'}
                      </span>
                      <ChevronDown size={16} className={`ml-2 transition-transform ${showTagDropdownMobile ? 'rotate-180' : ''}`} />
                    </Button>
                  </PopoverTrigger>
                </Popover>

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
