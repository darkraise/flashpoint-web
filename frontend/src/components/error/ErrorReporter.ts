import axios from 'axios';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth';
import { logger } from '@/lib/logger';

// Create a separate axios instance for error reporting without interceptors
// This prevents infinite loops when error reporting itself fails
const errorReportingApi = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to error reporting requests
errorReportingApi.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const ERROR_QUEUE_KEY = 'flashpoint-error-queue';
const MAX_QUEUE_SIZE = 10;

export interface ErrorReport {
  type: 'client_error' | 'network_error' | 'api_error' | 'route_error';
  message: string;
  stack?: string;
  url: string;
  timestamp: string;
  userAgent: string;
  userId?: number;
  context?: Record<string, unknown>;
}

interface QueuedError extends ErrorReport {
  retryCount: number;
}

/**
 * Report an error to the backend
 * @param errorInfo Error information (omit timestamp and userAgent)
 * @returns Promise<boolean> Success status
 */
export async function reportError(
  errorInfo: Omit<ErrorReport, 'timestamp' | 'userAgent'>
): Promise<boolean> {
  const isDev = import.meta.env.DEV;

  const report: ErrorReport = {
    ...errorInfo,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    // Don't send stack traces in production
    stack: isDev ? errorInfo.stack : undefined,
  };

  try {
    // Check if online
    if (!navigator.onLine) {
      queueErrorReport(report);
      if (isDev) {
        logger.debug('[ErrorReporter] Offline - queued error for later:', report);
      }
      return false;
    }

    // Send to backend using dedicated axios instance (no error interceptors)
    await errorReportingApi.post('/errors/report', report);

    if (isDev) {
      logger.debug('[ErrorReporter] Error reported successfully:', report);
    }

    toast.success('Error reported successfully');
    return true;
  } catch (error) {
    if (isDev) {
      logger.error('[ErrorReporter] Failed to report error:', error);
    }

    // Queue for later if sending failed
    queueErrorReport(report);
    toast.error('Failed to report error. It will be sent when connection is restored.');
    return false;
  }
}

/**
 * Queue an error report for later sending (when offline)
 * @param report Complete error report
 */
export function queueErrorReport(report: ErrorReport): void {
  try {
    const queue = getErrorQueue();

    const queuedError: QueuedError = {
      ...report,
      retryCount: 0,
    };

    queue.push(queuedError);

    // Limit queue size
    if (queue.length > MAX_QUEUE_SIZE) {
      queue.shift(); // Remove oldest error
    }

    localStorage.setItem(ERROR_QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    if (import.meta.env.DEV) {
      logger.error('[ErrorReporter] Failed to queue error:', error);
    }
  }
}

/**
 * Get the current error queue from localStorage
 * @returns Array of queued errors
 */
function getErrorQueue(): QueuedError[] {
  try {
    const queueJson = localStorage.getItem(ERROR_QUEUE_KEY);
    if (!queueJson) return [];

    const queue = JSON.parse(queueJson);
    return Array.isArray(queue) ? queue : [];
  } catch (error) {
    if (import.meta.env.DEV) {
      logger.error('[ErrorReporter] Failed to read error queue:', error);
    }
    return [];
  }
}

/**
 * Send all queued errors to the backend
 * Called automatically when connection is restored
 */
export async function sendQueuedErrors(): Promise<void> {
  if (!navigator.onLine) return;

  const queue = getErrorQueue();
  if (queue.length === 0) return;

  const isDev = import.meta.env.DEV;

  if (isDev) {
    logger.debug(`[ErrorReporter] Sending ${queue.length} queued errors...`);
  }

  const successfullyReported: number[] = [];

  for (let i = 0; i < queue.length; i++) {
    const queuedError = queue[i];

    try {
      await errorReportingApi.post('/errors/report', queuedError);
      successfullyReported.push(i);

      if (isDev) {
        logger.debug('[ErrorReporter] Queued error sent successfully:', queuedError);
      }
    } catch (error) {
      queuedError.retryCount++;

      if (isDev) {
        logger.error('[ErrorReporter] Failed to send queued error:', error);
      }

      // Give up after 3 retries
      if (queuedError.retryCount >= 3) {
        successfullyReported.push(i);
        if (isDev) {
          logger.warn('[ErrorReporter] Giving up on error after 3 retries:', queuedError);
        }
      }
    }
  }

  // Remove successfully reported errors
  if (successfullyReported.length > 0) {
    const remainingQueue = queue.filter((_, index) => !successfullyReported.includes(index));
    localStorage.setItem(ERROR_QUEUE_KEY, JSON.stringify(remainingQueue));

    if (isDev) {
      logger.debug(`[ErrorReporter] ${successfullyReported.length} queued errors processed`);
    }
  }
}

/**
 * Initialize the error reporter
 * Sets up the online event listener to send queued errors
 */
export function initErrorReporter(): void {
  const isDev = import.meta.env.DEV;

  if (isDev) {
    logger.debug('[ErrorReporter] Initialized');
  }

  // Send queued errors when connection is restored
  window.addEventListener('online', () => {
    if (isDev) {
      logger.debug('[ErrorReporter] Connection restored, sending queued errors...');
    }
    sendQueuedErrors();
  });

  // Try to send queued errors on init (in case we're online)
  if (navigator.onLine) {
    setTimeout(() => {
      sendQueuedErrors();
    }, 1000);
  }
}
