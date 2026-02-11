import axios from 'axios';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

// Separate instance without interceptors to prevent infinite loops on failure
const errorReportingApi = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
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

export async function reportError(
  errorInfo: Omit<ErrorReport, 'timestamp' | 'userAgent'>
): Promise<boolean> {
  const isDev = import.meta.env.DEV;

  const report: ErrorReport = {
    ...errorInfo,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    stack: isDev ? errorInfo.stack : undefined,
  };

  try {
    if (!navigator.onLine) {
      queueErrorReport(report);
      if (isDev) {
        logger.debug('[ErrorReporter] Offline - queued error for later:', report);
      }
      return false;
    }

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

    queueErrorReport(report);
    toast.error('Failed to report error. It will be sent when connection is restored.');
    return false;
  }
}

export function queueErrorReport(report: ErrorReport): void {
  try {
    const queue = getErrorQueue();

    const queuedError: QueuedError = {
      ...report,
      retryCount: 0,
    };

    queue.push(queuedError);

    if (queue.length > MAX_QUEUE_SIZE) {
      queue.shift();
    }

    localStorage.setItem(ERROR_QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    if (import.meta.env.DEV) {
      logger.error('[ErrorReporter] Failed to queue error:', error);
    }
  }
}

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

/** Flush queued errors to the backend. Called on reconnect and on init. */
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

      if (queuedError.retryCount >= 3) {
        successfullyReported.push(i);
        if (isDev) {
          logger.warn('[ErrorReporter] Giving up on error after 3 retries:', queuedError);
        }
      }
    }
  }

  if (successfullyReported.length > 0) {
    const remainingQueue = queue.filter((_, index) => !successfullyReported.includes(index));
    localStorage.setItem(ERROR_QUEUE_KEY, JSON.stringify(remainingQueue));

    if (isDev) {
      logger.debug(`[ErrorReporter] ${successfullyReported.length} queued errors processed`);
    }
  }
}

export function initErrorReporter(): void {
  const isDev = import.meta.env.DEV;

  if (isDev) {
    logger.debug('[ErrorReporter] Initialized');
  }

  window.addEventListener('online', () => {
    if (isDev) {
      logger.debug('[ErrorReporter] Connection restored, sending queued errors...');
    }
    sendQueuedErrors().catch(() => {});
  });

  if (navigator.onLine) {
    setTimeout(() => {
      sendQueuedErrors().catch(() => {});
    }, 1000);
  }
}
