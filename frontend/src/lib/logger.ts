/**
 * Logging utility that only logs in development mode
 * Prevents console.log statements from appearing in production
 */

const isDev = import.meta.env.DEV;

export const logger = {
  /**
   * Debug-level logging (only in development)
   */
  debug: (...args: unknown[]) => {
    if (isDev) {
      console.log(...args);
    }
  },

  /**
   * Info-level logging (only in development)
   */
  info: (...args: unknown[]) => {
    if (isDev) {
      console.info(...args);
    }
  },

  /**
   * Warning-level logging (always logs)
   */
  warn: (...args: unknown[]) => {
    console.warn(...args);
  },

  /**
   * Error-level logging (always logs)
   */
  error: (...args: unknown[]) => {
    console.error(...args);
  },

  /**
   * Group logging (only in development)
   */
  group: (label: string) => {
    if (isDev) {
      console.group(label);
    }
  },

  /**
   * End group logging (only in development)
   */
  groupEnd: () => {
    if (isDev) {
      console.groupEnd();
    }
  },
};
