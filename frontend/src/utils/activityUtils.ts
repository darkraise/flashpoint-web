export type ActionCategory = 'auth' | 'crud' | 'error' | 'system';
export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

/**
 * Categorize an action string into one of four categories.
 * This logic is shared between frontend (badge styling) and backend (analytics).
 */
export function categorizeAction(action: string): ActionCategory {
  if (action.includes('fail') || action.includes('error')) {
    return 'error';
  }
  if (
    action.startsWith('auth') ||
    action === 'login' ||
    action === 'logout' ||
    action === 'register'
  ) {
    return 'auth';
  }
  if (
    action.includes('schedule') ||
    action.includes('cleanup') ||
    action.includes('maintenance')
  ) {
    return 'system';
  }
  return 'crud';
}

/**
 * Get the appropriate badge variant for an action based on its category.
 */
export function getActionBadgeVariant(action: string): BadgeVariant {
  const category = categorizeAction(action);
  switch (category) {
    case 'error':
      return 'destructive';
    case 'auth':
      return 'default';
    case 'system':
      return 'outline';
    case 'crud':
      return 'secondary';
  }
}
