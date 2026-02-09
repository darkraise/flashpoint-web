import { useRef, useCallback, memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Check } from 'lucide-react';
import { PlaylistIcon } from './PlaylistIcon';
import { cn } from '@/lib/utils';
import type { PlaylistIconName } from '@/lib/playlistIcons';

const COLUMNS = 8;
const ROW_HEIGHT = 64; // 56px button (h-14) + 8px gap (gap-2)
const OVERSCAN = 3; // Number of rows to render outside visible area for smooth scrolling
const ICON_SIZE = 26; // Optimal icon size for 56px button with visual balance
const CHECK_SIZE = 12; // Check icon size inside selection badge

interface VirtualizedIconGridProps {
  icons: readonly PlaylistIconName[];
  selectedIcon: PlaylistIconName | null | undefined;
  onSelectIcon: (iconName: PlaylistIconName) => void;
  formatIconName: (name: string) => string;
}

/**
 * Virtualized icon grid using @tanstack/react-virtual
 * Renders only visible rows + overscan for performance with 600+ icons
 *
 * Performance characteristics:
 * - 600 icons / 8 columns = 75 total rows
 * - 400px height / 64px row height = ~6-7 visible rows
 * - With overscan=3: renders ~13 rows = 104 icons (instead of all 600)
 * - Reduces DOM nodes by 83% for massive performance improvement
 *
 * TODO: Implement keyboard navigation for grid pattern (arrow keys, roving tabIndex)
 * Currently users must Tab through all icons, which is inefficient for 600 icons.
 * See: https://www.w3.org/WAI/ARIA/apg/patterns/grid/
 *
 * @example
 * <VirtualizedIconGrid
 *   icons={allIcons}
 *   selectedIcon={value}
 *   onSelectIcon={onChange}
 *   formatIconName={formatName}
 * />
 */
export const VirtualizedIconGrid = memo(function VirtualizedIconGrid({
  icons,
  selectedIcon,
  onSelectIcon,
  formatIconName,
}: VirtualizedIconGridProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowCount = Math.ceil(icons.length / COLUMNS);

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: OVERSCAN,
  });

  const getIconsForRow = useCallback(
    (rowIndex: number): readonly PlaylistIconName[] => {
      const startIndex = rowIndex * COLUMNS;
      return icons.slice(startIndex, startIndex + COLUMNS);
    },
    [icons]
  );

  return (
    <div
      ref={parentRef}
      className="h-[400px] overflow-auto focus:outline-none"
      style={{
        scrollbarWidth: 'thin',
        scrollbarColor: 'hsl(var(--primary) / 0.3) transparent',
        scrollbarGutter: 'stable',
      }}
      role="grid"
      aria-label="Icon grid"
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const rowIcons = getIconsForRow(virtualRow.index);
          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className="grid grid-cols-8 gap-2 px-4"
              role="row"
            >
              {rowIcons.map((iconName) => (
                <IconButton
                  key={iconName}
                  iconName={iconName}
                  isSelected={selectedIcon === iconName}
                  onSelect={onSelectIcon}
                  formatIconName={formatIconName}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
});

/**
 * Memoized icon button to prevent unnecessary re-renders during scroll
 * Only re-renders when iconName or isSelected changes
 */
const IconButton = memo(function IconButton({
  iconName,
  isSelected,
  onSelect,
  formatIconName,
}: {
  iconName: PlaylistIconName;
  isSelected: boolean;
  onSelect: (name: PlaylistIconName) => void;
  formatIconName: (name: string) => string;
}) {
  const handleClick = useCallback(() => {
    onSelect(iconName);
  }, [iconName, onSelect]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'relative flex items-center justify-center',
        'h-14 w-14 rounded-lg border-2 transition-[transform,border-color,background-color] duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        'group',
        isSelected
          ? 'border-primary bg-primary/20 scale-105'
          : 'border-border bg-background hover:border-primary/50 hover:bg-primary/5 hover:scale-105'
      )}
      aria-label={`Select ${formatIconName(iconName)} icon`}
      aria-pressed={isSelected}
      role="gridcell"
    >
      <PlaylistIcon
        iconName={iconName}
        size={ICON_SIZE}
        className={cn(
          'transition-all duration-200',
          isSelected
            ? 'text-primary'
            : 'text-foreground/70 group-hover:text-primary group-hover:scale-110'
        )}
      />

      {isSelected ? (
        <div className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-primary flex items-center justify-center animate-in zoom-in-50 duration-200">
          <Check size={CHECK_SIZE} className="text-primary-foreground" />
        </div>
      ) : null}
    </button>
  );
});
