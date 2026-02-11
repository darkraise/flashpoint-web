/**
 * Shared chart color palette.
 */
export const CHART_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#84cc16', // lime
  '#6366f1', // indigo
];

/**
 * Truncate a title string with ellipsis.
 */
export function truncateTitle(title: string, maxLength: number = 25): string {
  return title.length > maxLength ? title.substring(0, maxLength) + '...' : title;
}

/**
 * Format seconds as compact playtime string for chart labels.
 * e.g., "2.5h", "45m", "30s"
 */
export function formatPlaytimeCompact(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
  } else {
    const hours = (seconds / 3600).toFixed(1);
    return `${hours}h`;
  }
}

/**
 * Get a CSS variable value from the document root.
 * Returns the computed value or a fallback.
 */
export function getCSSVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
