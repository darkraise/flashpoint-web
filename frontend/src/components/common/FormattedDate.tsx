import { useDateTimeFormat } from '@/hooks/useDateTimeFormat';

interface FormattedDateProps {
  date: Date | string | number;
  type?: 'date' | 'time' | 'datetime';
  className?: string;
}

/**
 * Component to display formatted dates/times using application settings
 */
export function FormattedDate({ date, type = 'datetime', className }: FormattedDateProps) {
  const { formatDate, formatTime, formatDateTime } = useDateTimeFormat();

  const getFormattedValue = () => {
    if (!date) return 'Unknown';

    try {
      switch (type) {
        case 'date':
          return formatDate(date);
        case 'time':
          return formatTime(date);
        case 'datetime':
        default:
          return formatDateTime(date);
      }
    } catch (error) {
      console.error('Error formatting date:', error);
      return String(date);
    }
  };

  return <span className={className}>{getFormattedValue()}</span>;
}
