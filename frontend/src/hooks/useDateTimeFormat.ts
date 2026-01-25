import { useQuery } from '@tanstack/react-query';
import { usersApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { format as dateFnsFormat } from 'date-fns';

/**
 * Hook to get the user's date and time format settings
 * Falls back to system defaults if user hasn't set preferences
 */
export function useDateTimeFormat() {
  const { isAuthenticated } = useAuthStore();

  // Fetch user settings (includes date_format and time_format)
  const { data: userSettings } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => usersApi.getAllSettings(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: isAuthenticated,
  });

  // Extract date and time format from user settings with defaults
  const dateFormat = userSettings?.date_format || 'MM/dd/yyyy';
  const timeFormat = userSettings?.time_format || 'hh:mm a';

  /**
   * Format a date using the application's date format
   */
  const formatDate = (date: Date | string | number): string => {
    const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    try {
      return dateFnsFormat(dateObj, dateFormat);
    } catch (error) {
      console.error('Error formatting date:', error);
      return String(date);
    }
  };

  /**
   * Format a time using the application's time format
   */
  const formatTime = (date: Date | string | number): string => {
    const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    try {
      return dateFnsFormat(dateObj, timeFormat);
    } catch (error) {
      console.error('Error formatting time:', error);
      return String(date);
    }
  };

  /**
   * Format a date and time using both application's formats
   */
  const formatDateTime = (date: Date | string | number): string => {
    const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    try {
      return dateFnsFormat(dateObj, `${dateFormat} ${timeFormat}`);
    } catch (error) {
      console.error('Error formatting datetime:', error);
      return String(date);
    }
  };

  return {
    dateFormat,
    timeFormat,
    formatDate,
    formatTime,
    formatDateTime,
  };
}
