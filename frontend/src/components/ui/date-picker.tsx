import * as React from "react";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useDateTimeFormat } from "@/hooks/useDateTimeFormat";

export interface DatePickerProps {
  /** The selected date */
  date?: Date;
  /** Callback when date changes */
  onDateChange?: (date: Date | undefined) => void;
  /** Placeholder text when no date selected */
  placeholder?: string;
  /** Disable the picker */
  disabled?: boolean;
  /** Function to disable specific dates */
  disabledDates?: (date: Date) => boolean;
  /** Allow clearing the selected date */
  clearable?: boolean;
  /** Additional className for the trigger button */
  className?: string;
  /** ID for the input (accessibility) */
  id?: string;
  /** Required field indicator */
  required?: boolean;
}

export function DatePicker({
  date,
  onDateChange,
  placeholder = "Pick a date",
  disabled = false,
  disabledDates,
  clearable = true,
  className,
  id,
  required = false,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const { formatDate } = useDateTimeFormat();

  const handleSelect = (selectedDate: Date | undefined) => {
    onDateChange?.(selectedDate);
    setOpen(false);
  };

  const handleClear = () => {
    setOpen(false);
    onDateChange?.(undefined);
  };

  // Format date using user's preference from settings
  const displayDate = date ? formatDate(date) : null;

  return (
    <div className="flex gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            className={cn(
              "flex-1 justify-start text-left font-normal",
              !date && "text-muted-foreground",
              className
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {displayDate || placeholder}
            {required && !date ? (
              <span className="ml-1 text-destructive">*</span>
            ) : null}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleSelect}
            disabled={disabledDates}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      {clearable ? (
        <Button
          variant="outline"
          size="icon"
          onClick={handleClear}
          disabled={!date || disabled}
          aria-label="Clear date"
          title="Clear date"
        >
          <X className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}
