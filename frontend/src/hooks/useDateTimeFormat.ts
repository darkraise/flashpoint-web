import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { logger } from '@/lib/logger';
import { usersApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { format as dateFnsFormat } from 'date-fns';

export function useDateTimeFormat() {
  const { isAuthenticated } = useAuthStore();

  const { data: userSettings } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => usersApi.getAllSettings(),
    staleTime: 5 * 60 * 1000,
    enabled: isAuthenticated,
  });

  const dateFormat = userSettings?.date_format || 'MM/dd/yyyy';
  const timeFormat = userSettings?.time_format || 'hh:mm a';

  const formatDate = useCallback(
    (date: Date | string | number): string => {
      const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
      try {
        return dateFnsFormat(dateObj, dateFormat);
      } catch (error) {
        logger.error('Error formatting date:', error);
        return String(date);
      }
    },
    [dateFormat]
  );

  const formatTime = useCallback(
    (date: Date | string | number): string => {
      const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
      try {
        return dateFnsFormat(dateObj, timeFormat);
      } catch (error) {
        logger.error('Error formatting time:', error);
        return String(date);
      }
    },
    [timeFormat]
  );

  const formatDateTime = useCallback(
    (date: Date | string | number): string => {
      const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
      try {
        return dateFnsFormat(dateObj, `${dateFormat} ${timeFormat}`);
      } catch (error) {
        logger.error('Error formatting datetime:', error);
        return String(date);
      }
    },
    [dateFormat, timeFormat]
  );

  return {
    dateFormat,
    timeFormat,
    formatDate,
    formatTime,
    formatDateTime,
  };
}
