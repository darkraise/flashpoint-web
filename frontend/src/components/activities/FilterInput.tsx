import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface FilterInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  onPageReset?: () => void;
}

export function FilterInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  onPageReset,
}: FilterInputProps): JSX.Element {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>): void {
    onChange(e.target.value);
    onPageReset?.();
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
      />
    </div>
  );
}
