export type TimeRange = '24h' | '7d' | '30d';

export function getHoursFromTimeRange(timeRange: TimeRange): number {
  switch (timeRange) {
    case '24h':
      return 24;
    case '7d':
      return 168;
    case '30d':
      return 720;
  }
}

export function getStartDateFromTimeRange(timeRange: TimeRange): Date {
  const hours = getHoursFromTimeRange(timeRange);
  const date = new Date();
  date.setHours(date.getHours() - hours);
  return date;
}

export function getEndDateFromTimeRange(): Date {
  return new Date();
}
