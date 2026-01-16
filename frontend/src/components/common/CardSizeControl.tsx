import { useUIStore, CardSize, ListColumns } from '@/store/ui';
import { Grid3x3, Grid2x2, LayoutGrid, List, Columns2, Columns3, Columns4 } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

export function CardSizeControl() {
  const { viewMode, setViewMode, cardSize, setCardSize, listColumns, setListColumns } = useUIStore();

  const cardSizes: { value: CardSize; label: string; icon: typeof LayoutGrid }[] = [
    { value: 'small', label: 'Small', icon: Grid3x3 },
    { value: 'medium', label: 'Medium', icon: Grid2x2 },
    { value: 'large', label: 'Large', icon: LayoutGrid }
  ];

  const columnOptions: { value: ListColumns; label: string; icon: typeof List }[] = [
    { value: 1, label: '1 Column', icon: List },
    { value: 2, label: '2 Columns', icon: Columns2 },
    { value: 3, label: '3 Columns', icon: Columns3 },
    { value: 4, label: '4 Columns', icon: Columns4 }
  ];

  return (
    <div className="flex items-center gap-4">
      {/* View Mode Toggle */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">View:</span>
        <ToggleGroup type="single" value={viewMode} onValueChange={(value: string) => value && setViewMode(value as 'grid' | 'list')}>
          <ToggleGroupItem value="grid" aria-label="Grid view" className="gap-1.5">
            <LayoutGrid size={16} />
            <span className="hidden sm:inline">Grid</span>
          </ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label="List view" className="gap-1.5">
            <List size={16} />
            <span className="hidden sm:inline">List</span>
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Grid Size Controls */}
      {viewMode === 'grid' && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Size:</span>
          <ToggleGroup type="single" value={cardSize} onValueChange={(value: string) => value && setCardSize(value as CardSize)}>
            {cardSizes.map(({ value, label, icon: Icon }) => (
              <ToggleGroupItem key={value} value={value} aria-label={`${label} cards`} className="gap-1.5">
                <Icon size={16} />
                <span className="hidden sm:inline">{label}</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      )}

      {/* List Column Controls */}
      {viewMode === 'list' && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Columns:</span>
          <ToggleGroup type="single" value={listColumns.toString()} onValueChange={(value: string) => value && setListColumns(parseInt(value) as ListColumns)}>
            {columnOptions.map(({ value, label, icon: Icon }) => (
              <ToggleGroupItem key={value} value={value.toString()} aria-label={label} className="gap-1.5">
                <Icon size={16} />
                <span className="hidden lg:inline">{value}</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      )}
    </div>
  );
}
