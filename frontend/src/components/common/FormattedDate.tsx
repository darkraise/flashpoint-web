import { useDateTimeFormat } from '@/hooks/useDateTimeFormat';

interface FormattedDateProps {
  date: Date | string | number;
  type?: 'date' | 'time' | 'datetime';
  className?: string;
}

export function FormattedDate({ date, type = 'datetime', className }: FormattedDateProps) {
  const { formatDate, formatTime, formatDateTime } = useDateTimeFormat();

  const getFormattedValue = () => {
    if (!date) return 'Unknown';

    switch (type) {
      case 'date':
        return formatDate(date);
      case 'time':
        return formatTime(date);
      case 'datetime':
      default:
        return formatDateTime(date);
    }
  };

  return <span className={className}>{getFormattedValue()}</span>;
}
