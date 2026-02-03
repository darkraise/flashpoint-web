/**
 * Convert cron expression to human-readable format
 */
export function cronToReadable(cronExpression: string): string {
  const parts = cronExpression.trim().split(' ');
  if (parts.length !== 5) return cronExpression; // Invalid cron, return as-is

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  // Common patterns
  if (cronExpression === '* * * * *') return 'Every minute';
  if (cronExpression === '0 * * * *') return 'Every hour';
  if (cronExpression === '0 0 * * *') return 'Daily at midnight';
  if (cronExpression === '0 0 * * 0') return 'Weekly on Sunday at midnight';
  if (cronExpression === '0 0 1 * *') return 'Monthly on the 1st at midnight';

  // Every N minutes
  if (
    minute.startsWith('*/') &&
    hour === '*' &&
    dayOfMonth === '*' &&
    month === '*' &&
    dayOfWeek === '*'
  ) {
    const mins = minute.substring(2);
    return `Every ${mins} minute${mins !== '1' ? 's' : ''}`;
  }

  // Every N hours
  if (
    minute === '0' &&
    hour.startsWith('*/') &&
    dayOfMonth === '*' &&
    month === '*' &&
    dayOfWeek === '*'
  ) {
    const hrs = hour.substring(2);
    return `Every ${hrs} hour${hrs !== '1' ? 's' : ''}`;
  }

  // At specific time daily
  if (
    !minute.includes('*') &&
    !hour.includes('*') &&
    dayOfMonth === '*' &&
    month === '*' &&
    dayOfWeek === '*'
  ) {
    return `Daily at ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
  }

  // Default: return the cron expression itself
  return cronExpression;
}

/**
 * Validate cron expression format
 */
export function isValidCron(cronExpression: string): boolean {
  const parts = cronExpression.trim().split(' ');
  if (parts.length !== 5) return false;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  // Validate each part
  const validatePart = (part: string, min: number, max: number): boolean => {
    // Handle wildcard
    if (part === '*') return true;

    // Handle step values (*/N)
    if (part.startsWith('*/')) {
      const step = parseInt(part.substring(2));
      return !isNaN(step) && step > 0 && step <= max;
    }

    // Handle ranges (N-M)
    if (part.includes('-')) {
      const [start, end] = part.split('-').map((v) => parseInt(v));
      return !isNaN(start) && !isNaN(end) && start >= min && end <= max && start <= end;
    }

    // Handle lists (N,M,O)
    if (part.includes(',')) {
      const values = part.split(',').map((v) => parseInt(v));
      return values.every((v) => !isNaN(v) && v >= min && v <= max);
    }

    // Handle single value
    const value = parseInt(part);
    return !isNaN(value) && value >= min && value <= max;
  };

  return (
    validatePart(minute, 0, 59) &&
    validatePart(hour, 0, 23) &&
    validatePart(dayOfMonth, 1, 31) &&
    validatePart(month, 1, 12) &&
    validatePart(dayOfWeek, 0, 6)
  );
}

/**
 * Format duration in seconds
 */
export function formatDuration(seconds: number | undefined): string {
  if (seconds === undefined || seconds === null) return 'N/A';

  // Handle zero or very short durations
  if (seconds === 0) return '< 1s';
  if (seconds < 1) return '< 1s';

  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  } else if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    if (secs === 0) {
      return `${mins}m`;
    }
    return `${mins}m ${secs}s`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.round((seconds % 3600) / 60);
    if (mins === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${mins}m`;
  }
}
