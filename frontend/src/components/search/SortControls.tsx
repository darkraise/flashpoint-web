import { ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SortControlsProps {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSortChange: (key: 'sortBy' | 'sortOrder', value: string) => void;
  compact?: boolean;
}

export function SortControls({
  sortBy = 'title',
  sortOrder = 'asc',
  onSortChange,
  compact = false,
}: SortControlsProps) {
  const handleSortOrderToggle = () => {
    onSortChange('sortOrder', sortOrder === 'asc' ? 'desc' : 'asc');
  };

  return (
    <div className="flex items-center gap-2">
      <select
        value={sortBy}
        onChange={(e) => onSortChange('sortBy', e.target.value)}
        className={`${compact ? 'flex-1' : ''} px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-ring`}
        aria-label="Sort by"
      >
        <option value="title">Title</option>
        <option value="releaseDate">Release Date</option>
        <option value="dateAdded">Date Added</option>
        <option value="dateModified">Date Modified</option>
        <option value="developer">Developer</option>
      </select>
      <Button
        variant="outline"
        size="sm"
        onClick={handleSortOrderToggle}
        className={`h-10 ${compact ? 'px-2' : 'px-3'}`}
        type="button"
        title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
      >
        <ArrowUpDown size={16} />
        {!compact && <span className="ml-1 text-xs">{sortOrder === 'asc' ? 'A-Z' : 'Z-A'}</span>}
      </Button>
    </div>
  );
}
