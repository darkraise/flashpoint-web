import { useState, useCallback, useEffect } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface YearRangeFilterProps {
  yearFrom?: number;
  yearTo?: number;
  minYear?: number;
  maxYear?: number;
  onYearChange: (yearFrom: number | undefined, yearTo: number | undefined) => void;
  compact?: boolean;
}

export function YearRangeFilter({
  yearFrom,
  yearTo,
  minYear = 1980,
  maxYear = new Date().getFullYear(),
  onYearChange,
  compact = false,
}: YearRangeFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localFrom, setLocalFrom] = useState<string>(yearFrom?.toString() ?? '');
  const [localTo, setLocalTo] = useState<string>(yearTo?.toString() ?? '');

  // Sync local state with props
  useEffect(() => {
    setLocalFrom(yearFrom?.toString() ?? '');
    setLocalTo(yearTo?.toString() ?? '');
  }, [yearFrom, yearTo]);

  const handleApply = useCallback(() => {
    const fromParsed = localFrom ? parseInt(localFrom, 10) : undefined;
    const toParsed = localTo ? parseInt(localTo, 10) : undefined;

    const validFrom =
      fromParsed !== undefined && !isNaN(fromParsed) && fromParsed >= minYear && fromParsed <= maxYear
        ? fromParsed
        : undefined;
    const validTo =
      toParsed !== undefined && !isNaN(toParsed) && toParsed >= minYear && toParsed <= maxYear
        ? toParsed
        : undefined;

    onYearChange(validFrom, validTo);
    setIsOpen(false);
  }, [localFrom, localTo, minYear, maxYear, onYearChange]);

  const handleClear = useCallback(() => {
    setLocalFrom('');
    setLocalTo('');
    onYearChange(undefined, undefined);
    setIsOpen(false);
  }, [onYearChange]);

  const hasSelection = yearFrom !== undefined || yearTo !== undefined;

  const buttonText = hasSelection
    ? yearFrom && yearTo
      ? `${yearFrom} - ${yearTo}`
      : yearFrom
        ? `From ${yearFrom}`
        : `To ${yearTo}`
    : 'Year';

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={compact ? 'justify-between' : 'min-w-[120px] justify-between'}
          type="button"
          aria-label={`Filter by year: ${hasSelection ? buttonText : 'none selected'}`}
        >
          <span className={compact ? '' : 'mr-2'} aria-hidden="true">
            <Calendar size={16} />
          </span>
          <span className={compact ? 'ml-1' : ''}>{compact && !hasSelection ? '' : buttonText}</span>
          <ChevronDown
            size={16}
            className={`${compact ? 'ml-1' : 'ml-2'} transition-transform ${isOpen ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-4 z-[100]" align="start" sideOffset={8}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Release Year</span>
            {hasSelection && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="h-auto py-1 px-2 text-xs text-destructive hover:text-destructive"
              >
                Clear
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label htmlFor="year-from" className="text-xs text-muted-foreground mb-1 block">
                From
              </label>
              <Input
                id="year-from"
                type="number"
                min={minYear}
                max={maxYear}
                value={localFrom}
                onChange={(e) => setLocalFrom(e.target.value)}
                placeholder={minYear.toString()}
                className="h-9"
              />
            </div>
            <span className="text-muted-foreground mt-5">-</span>
            <div className="flex-1">
              <label htmlFor="year-to" className="text-xs text-muted-foreground mb-1 block">
                To
              </label>
              <Input
                id="year-to"
                type="number"
                min={minYear}
                max={maxYear}
                value={localTo}
                onChange={(e) => setLocalTo(e.target.value)}
                placeholder={maxYear.toString()}
                className="h-9"
              />
            </div>
          </div>

          <Button onClick={handleApply} className="w-full" size="sm">
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
