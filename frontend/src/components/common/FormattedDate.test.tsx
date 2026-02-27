import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

import { FormattedDate } from './FormattedDate';

// Create hoisted mock
const { mockFormatDate, mockFormatTime, mockFormatDateTime } = vi.hoisted(() => ({
  mockFormatDate: vi.fn(),
  mockFormatTime: vi.fn(),
  mockFormatDateTime: vi.fn(),
}));

// Mock the useDateTimeFormat hook
vi.mock('@/hooks/useDateTimeFormat', () => ({
  useDateTimeFormat: vi.fn(() => ({
    formatDate: mockFormatDate,
    formatTime: mockFormatTime,
    formatDateTime: mockFormatDateTime,
  })),
}));

describe('FormattedDate', () => {
  const testDate = new Date('2024-06-15T14:30:00Z');

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockFormatDate.mockReturnValue('June 15, 2024');
    mockFormatTime.mockReturnValue('2:30 PM');
    mockFormatDateTime.mockReturnValue('June 15, 2024, 2:30 PM');
  });

  describe('rendering', () => {
    it('should render as a span element', () => {
      render(<FormattedDate date={testDate} />);

      const span = screen.getByText('June 15, 2024, 2:30 PM');
      expect(span.tagName).toBe('SPAN');
    });

    it('should apply custom className', () => {
      render(<FormattedDate date={testDate} className="custom-date-class" />);

      const span = screen.getByText('June 15, 2024, 2:30 PM');
      expect(span).toHaveClass('custom-date-class');
    });
  });

  describe('type="datetime" (default)', () => {
    it('should format as datetime by default', () => {
      render(<FormattedDate date={testDate} />);

      expect(mockFormatDateTime).toHaveBeenCalledWith(testDate);
      expect(screen.getByText('June 15, 2024, 2:30 PM')).toBeInTheDocument();
    });

    it('should explicitly format as datetime when type is specified', () => {
      render(<FormattedDate date={testDate} type="datetime" />);

      expect(mockFormatDateTime).toHaveBeenCalledWith(testDate);
    });
  });

  describe('type="date"', () => {
    it('should format as date only', () => {
      render(<FormattedDate date={testDate} type="date" />);

      expect(mockFormatDate).toHaveBeenCalledWith(testDate);
      expect(screen.getByText('June 15, 2024')).toBeInTheDocument();
    });

    it('should not call formatTime or formatDateTime', () => {
      render(<FormattedDate date={testDate} type="date" />);

      expect(mockFormatTime).not.toHaveBeenCalled();
      expect(mockFormatDateTime).not.toHaveBeenCalled();
    });
  });

  describe('type="time"', () => {
    it('should format as time only', () => {
      render(<FormattedDate date={testDate} type="time" />);

      expect(mockFormatTime).toHaveBeenCalledWith(testDate);
      expect(screen.getByText('2:30 PM')).toBeInTheDocument();
    });

    it('should not call formatDate or formatDateTime', () => {
      render(<FormattedDate date={testDate} type="time" />);

      expect(mockFormatDate).not.toHaveBeenCalled();
      expect(mockFormatDateTime).not.toHaveBeenCalled();
    });
  });

  describe('date input types', () => {
    it('should accept Date object', () => {
      const dateObj = new Date('2024-01-01');
      render(<FormattedDate date={dateObj} />);

      expect(mockFormatDateTime).toHaveBeenCalledWith(dateObj);
    });

    it('should accept ISO string', () => {
      const isoString = '2024-06-15T14:30:00Z';
      render(<FormattedDate date={isoString} />);

      expect(mockFormatDateTime).toHaveBeenCalledWith(isoString);
    });

    it('should accept timestamp number', () => {
      const timestamp = 1718459400000;
      render(<FormattedDate date={timestamp} />);

      expect(mockFormatDateTime).toHaveBeenCalledWith(timestamp);
    });
  });

  describe('edge cases', () => {
    it('should show "Unknown" for falsy date values', () => {
      // @ts-expect-error - Testing invalid input
      render(<FormattedDate date={null} />);

      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });

    it('should show "Unknown" for undefined date', () => {
      // @ts-expect-error - Testing invalid input
      render(<FormattedDate date={undefined} />);

      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });

    it('should show "Unknown" for empty string', () => {
      // @ts-expect-error - Testing edge case
      render(<FormattedDate date="" />);

      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });

    it('should fallback to string representation on format error', () => {
      mockFormatDateTime.mockImplementation(() => {
        throw new Error('Invalid date');
      });

      const invalidDate = 'not-a-date';
      render(<FormattedDate date={invalidDate} />);

      expect(screen.getByText('not-a-date')).toBeInTheDocument();
    });

    it('should handle format errors for date type', () => {
      mockFormatDate.mockImplementation(() => {
        throw new Error('Invalid date');
      });

      render(<FormattedDate date="invalid" type="date" />);

      expect(screen.getByText('invalid')).toBeInTheDocument();
    });

    it('should handle format errors for time type', () => {
      mockFormatTime.mockImplementation(() => {
        throw new Error('Invalid date');
      });

      render(<FormattedDate date="invalid" type="time" />);

      expect(screen.getByText('invalid')).toBeInTheDocument();
    });
  });

  describe('integration with different locales', () => {
    it('should use the formatter from useDateTimeFormat hook', () => {
      // The hook handles locale-specific formatting
      mockFormatDateTime.mockReturnValue('15/06/2024 14:30');

      render(<FormattedDate date={testDate} />);

      expect(screen.getByText('15/06/2024 14:30')).toBeInTheDocument();
    });

    it('should display formatted output regardless of format style', () => {
      mockFormatDate.mockReturnValue('2024-06-15');
      mockFormatTime.mockReturnValue('14:30:00');
      mockFormatDateTime.mockReturnValue('2024-06-15 14:30:00');

      const { rerender } = render(<FormattedDate date={testDate} type="date" />);
      expect(screen.getByText('2024-06-15')).toBeInTheDocument();

      rerender(<FormattedDate date={testDate} type="time" />);
      expect(screen.getByText('14:30:00')).toBeInTheDocument();

      rerender(<FormattedDate date={testDate} type="datetime" />);
      expect(screen.getByText('2024-06-15 14:30:00')).toBeInTheDocument();
    });
  });
});
