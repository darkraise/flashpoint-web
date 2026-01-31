import { CardSizeControl } from './CardSizeControl';

interface ViewOptionsProps {
  className?: string;
}

/**
 * Reusable view options component for controlling game display
 * Currently includes CardSizeControl for grid/list view and size adjustments
 */
export function ViewOptions({ className }: ViewOptionsProps) {
  return (
    <div className={className}>
      <CardSizeControl />
    </div>
  );
}
