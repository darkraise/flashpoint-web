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
