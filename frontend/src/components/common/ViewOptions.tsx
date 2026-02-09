import { CardSizeControl } from './CardSizeControl';

interface ViewOptionsProps {
  className?: string;
}

export function ViewOptions({ className }: ViewOptionsProps) {
  return (
    <div className={className}>
      <CardSizeControl />
    </div>
  );
}
