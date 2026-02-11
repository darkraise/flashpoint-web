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

/** Handles partial dates (YYYY or YYYY-MM) in addition to full dates */
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
      const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1);
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
