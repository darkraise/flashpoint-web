/**
 * Format an ISO date string to a readable format like "Jan 15, 2024"
 * @param dateString - ISO date string or null/undefined
 * @returns Formatted date string or "Unknown" if invalid
 */
export function formatDate(dateString?: string | null): string {
  if (!dateString) {
    return 'Unknown';
  }

  try {
    const date = new Date(dateString);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Unknown';
    }

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch (error) {
    return 'Unknown';
  }
}

/**
 * Format a release date string which might be partial (YYYY or YYYY-MM)
 * @param dateString - Date string in various formats
 * @returns Formatted date string or "Unknown"
 */
export function formatReleaseDate(dateString?: string | null): string {
  if (!dateString) {
    return 'Unknown';
  }

  // Handle year-only format (YYYY)
  if (/^\d{4}$/.test(dateString)) {
    return dateString;
  }

  // Handle year-month format (YYYY-MM)
  if (/^\d{4}-\d{2}$/.test(dateString)) {
    try {
      const [year, month] = dateString.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      });
    } catch (error) {
      return dateString;
    }
  }

  // Handle full date format
  return formatDate(dateString);
}
