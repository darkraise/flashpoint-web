export type ActionCategory = 'auth' | 'crud' | 'error' | 'system';

/**
 * Authentication-related actions used in SQL queries and analytics.
 * Used for aggregating auth events in getStats(), getTrend(), and getPreviousPeriodStats().
 */
export const AUTH_ACTIONS = ['login', 'logout', 'register', 'auth.login.failed'] as const;

export type AuthAction = (typeof AUTH_ACTIONS)[number];

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
  if (action.includes('schedule') || action.includes('cleanup') || action.includes('maintenance')) {
    return 'system';
  }
  return 'crud';
}
