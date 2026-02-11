import { describe, it, expect } from 'vitest';
import { getHoursFromTimeRange, TimeRange } from './timeRangeUtils';

describe('getHoursFromTimeRange', () => {
  it('should return 24 hours for "24h"', () => {
    const result = getHoursFromTimeRange('24h' as TimeRange);
    expect(result).toBe(24);
  });

  it('should return 168 hours for "7d"', () => {
    const result = getHoursFromTimeRange('7d' as TimeRange);
    expect(result).toBe(168); // 7 days * 24 hours
  });

  it('should return 720 hours for "30d"', () => {
    const result = getHoursFromTimeRange('30d' as TimeRange);
    expect(result).toBe(720); // 30 days * 24 hours
  });

  it('should handle all TimeRange values', () => {
    const timeRanges: TimeRange[] = ['24h', '7d', '30d'];
    const expectedHours = [24, 168, 720];

    timeRanges.forEach((range, index) => {
      expect(getHoursFromTimeRange(range)).toBe(expectedHours[index]);
    });
  });
});
