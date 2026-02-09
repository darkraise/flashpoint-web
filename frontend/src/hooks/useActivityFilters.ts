import { useState, useCallback, useEffect } from 'react';

export interface ActivityFilterState {
  username: string;
  action: string;
  resource: string;
  startDate: Date | undefined;
  endDate: Date | undefined;
  dateRangeError: string;
}

const INITIAL_FILTER_STATE: ActivityFilterState = {
  username: '',
  action: '',
  resource: '',
  startDate: undefined,
  endDate: undefined,
  dateRangeError: '',
};

export function useActivityFilters() {
  const [filters, setFilters] = useState<ActivityFilterState>(INITIAL_FILTER_STATE);

  const updateFilter = useCallback(
    <K extends keyof ActivityFilterState>(key: K, value: ActivityFilterState[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const clearFilters = useCallback(() => {
    setFilters(INITIAL_FILTER_STATE);
  }, []);

  useEffect(() => {
    if (filters.startDate && filters.endDate) {
      if (filters.endDate < filters.startDate) {
        setFilters((prev) => ({
          ...prev,
          dateRangeError: 'End date must be after or equal to start date',
        }));
      } else {
        setFilters((prev) => ({ ...prev, dateRangeError: '' }));
      }
    } else {
      setFilters((prev) => ({ ...prev, dateRangeError: '' }));
    }
  }, [filters.startDate, filters.endDate]);

  return { filters, updateFilter, clearFilters };
}
