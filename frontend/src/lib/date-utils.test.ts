import { describe, it, expect } from 'vitest';

import { formatDate, formatReleaseDate } from './date-utils';

describe('date-utils', () => {
  describe('formatDate', () => {
    it('should format a valid ISO date string', () => {
      const result = formatDate('2024-06-15T14:30:00Z');

      // Result should contain month, day, and year
      expect(result).toContain('Jun');
      expect(result).toContain('15');
      expect(result).toContain('2024');
    });

    it('should format a date-only string', () => {
      const result = formatDate('2024-01-01');

      expect(result).toContain('Jan');
      expect(result).toContain('1');
      expect(result).toContain('2024');
    });

    it('should format different months correctly', () => {
      expect(formatDate('2024-03-15')).toContain('Mar');
      expect(formatDate('2024-07-04')).toContain('Jul');
      expect(formatDate('2024-12-25')).toContain('Dec');
    });

    it('should return "Unknown" for null', () => {
      const result = formatDate(null);
      expect(result).toBe('Unknown');
    });

    it('should return "Unknown" for undefined', () => {
      const result = formatDate(undefined);
      expect(result).toBe('Unknown');
    });

    it('should return "Unknown" for empty string', () => {
      const result = formatDate('');
      expect(result).toBe('Unknown');
    });

    it('should return "Unknown" for invalid date string', () => {
      const result = formatDate('not-a-date');
      expect(result).toBe('Unknown');
    });

    it('should return "Unknown" for malformed date', () => {
      const result = formatDate('2024-13-45'); // Invalid month/day
      expect(result).toBe('Unknown');
    });

    it('should handle edge case dates', () => {
      // First day of year
      expect(formatDate('2024-01-01')).toContain('Jan');
      // Last day of year
      expect(formatDate('2024-12-31')).toContain('Dec');
    });
  });

  describe('formatReleaseDate', () => {
    describe('year-only format (YYYY)', () => {
      it('should return year as-is for year-only format', () => {
        const result = formatReleaseDate('2024');
        expect(result).toBe('2024');
      });

      it('should handle older years', () => {
        expect(formatReleaseDate('1990')).toBe('1990');
        expect(formatReleaseDate('2000')).toBe('2000');
      });

      it('should handle future years', () => {
        expect(formatReleaseDate('2030')).toBe('2030');
      });
    });

    describe('year-month format (YYYY-MM)', () => {
      it('should format year-month as "Month Year"', () => {
        const result = formatReleaseDate('2024-06');

        expect(result).toContain('Jun');
        expect(result).toContain('2024');
      });

      it('should handle January', () => {
        const result = formatReleaseDate('2024-01');
        expect(result).toContain('Jan');
      });

      it('should handle December', () => {
        const result = formatReleaseDate('2024-12');
        expect(result).toContain('Dec');
      });

      it('should not include day in output', () => {
        const result = formatReleaseDate('2024-06');
        // Should not contain a day number like "15" or "1"
        // Just month and year
        expect(result).toMatch(/[A-Za-z]+\s+\d{4}/);
      });
    });

    describe('full date format', () => {
      it('should format full date using formatDate', () => {
        const result = formatReleaseDate('2024-06-15');

        expect(result).toContain('Jun');
        expect(result).toContain('15');
        expect(result).toContain('2024');
      });

      it('should handle ISO date format', () => {
        const result = formatReleaseDate('2024-06-15T00:00:00Z');

        expect(result).toContain('Jun');
        expect(result).toContain('2024');
      });
    });

    describe('edge cases', () => {
      it('should return "Unknown" for null', () => {
        expect(formatReleaseDate(null)).toBe('Unknown');
      });

      it('should return "Unknown" for undefined', () => {
        expect(formatReleaseDate(undefined)).toBe('Unknown');
      });

      it('should return "Unknown" for empty string', () => {
        expect(formatReleaseDate('')).toBe('Unknown');
      });

      it('should return "Unknown" for invalid date', () => {
        expect(formatReleaseDate('invalid')).toBe('Unknown');
      });

      it('should handle partial year format (not matching YYYY)', () => {
        // These don't match YYYY pattern, so fall through to formatDate
        // '24' and '202' get parsed by Date constructor in unexpected ways
        const result24 = formatReleaseDate('24');
        const result202 = formatReleaseDate('202');
        // Just verify they don't crash and return something
        expect(typeof result24).toBe('string');
        expect(typeof result202).toBe('string');
      });

      it('should handle malformed year-month format', () => {
        // Single digit month (2024-6) doesn't match YYYY-MM pattern
        // Falls through to formatDate which parses it
        const result = formatReleaseDate('2024-6');
        // The Date constructor can parse this, so it returns a formatted date
        expect(typeof result).toBe('string');
      });
    });

    describe('format consistency', () => {
      it('should return consistent format for full dates', () => {
        const dates = ['2024-01-15', '2024-06-01', '2024-12-31'];

        for (const date of dates) {
          const result = formatReleaseDate(date);
          // Should match pattern like "Jan 15, 2024"
          expect(result).toMatch(/[A-Z][a-z]{2}\s+\d{1,2},\s+\d{4}/);
        }
      });

      it('should return consistent format for year-month', () => {
        const dates = ['2024-01', '2024-06', '2024-12'];

        for (const date of dates) {
          const result = formatReleaseDate(date);
          // Should match pattern like "Jun 2024"
          expect(result).toMatch(/[A-Z][a-z]{2}\s+\d{4}/);
        }
      });
    });
  });
});
