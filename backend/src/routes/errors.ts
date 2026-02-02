import { Router, Request, Response } from 'express';
import { promises as fs } from 'fs';
import fsSync from 'fs';
import path from 'path';
import winston from 'winston';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { logger } from '../utils/logger';
import { config } from '../config';

const router = Router();

// Client error logs go to the same directory as backend logs
const LOG_DIR = config.logFile ? path.dirname(config.logFile) : path.join(__dirname, '../../logs');
const ERROR_LOG_FILE = path.join(LOG_DIR, 'client-errors.log');

// Ensure logs directory exists for file transport at startup
if (!fsSync.existsSync(LOG_DIR)) {
  fsSync.mkdirSync(LOG_DIR, { recursive: true });
}

/**
 * Map client error types to OTEL severity numbers
 */
function getSeverityNumber(type: string): number {
  const severityMap: Record<string, number> = {
    client_error: 17,   // ERROR
    api_error: 17,      // ERROR
    network_error: 13,  // WARN (may be transient)
    route_error: 13,    // WARN
  };
  return severityMap[type] || 17;
}

/**
 * Client error logger with OTEL-compatible format
 */
const clientErrorLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }), // ISO 8601
    winston.format.errors({ stack: true }),
    winston.format((info) => {
      // Add OTEL severity fields based on error type
      const errorType = (info.errorType as string) || 'client_error';
      info.severity = errorType === 'network_error' ? 'WARN' : 'ERROR';
      info.severityNumber = getSeverityNumber(errorType);
      return info;
    })(),
    winston.format.json()
  ),
  defaultMeta: { service: 'flashpoint-web-client' },
  transports: [
    new winston.transports.File({
      filename: ERROR_LOG_FILE,
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      tailable: true
    })
  ]
});

logger.info(`[ClientErrors] Log file: ${ERROR_LOG_FILE}`);

interface ErrorReport {
  type: 'client_error' | 'network_error' | 'api_error' | 'route_error';
  message: string;
  stack?: string;
  url: string;
  timestamp: string;
  userAgent: string;
  userId?: number;
  context?: Record<string, unknown>;
}

type AuthenticatedRequest = Request & { user?: { id: number } };

/**
 * Ensure logs directory exists
 */
async function ensureLogDir(): Promise<void> {
  try {
    await fs.mkdir(LOG_DIR, { recursive: true });
  } catch (error) {
    logger.error('Failed to create logs directory:', error);
  }
}

/**
 * Log error report to file in OTEL-compatible JSON format
 */
async function logError(report: ErrorReport): Promise<void> {
  try {
    clientErrorLogger.info(report.message, {
      errorType: report.type,
      clientUrl: report.url,
      clientTimestamp: report.timestamp,
      userAgent: report.userAgent,
      userId: report.userId,
      stack: report.stack,
      context: report.context
    });
  } catch (error) {
    logger.error('Failed to log client error:', error);
  }
}

/**
 * Read recent error reports from log file
 */
async function getRecentErrors(limit: number = 100): Promise<ErrorReport[]> {
  try {
    await ensureLogDir();

    try {
      const content = await fs.readFile(ERROR_LOG_FILE, 'utf8');
      const lines = content.trim().split('\n');

      // Parse JSONL lines (newest first)
      const errors: ErrorReport[] = [];
      for (let i = lines.length - 1; i >= 0 && errors.length < limit; i--) {
        const line = lines[i].trim();
        if (line) {
          try {
            const logEntry = JSON.parse(line);
            // Convert back to ErrorReport format for API response
            errors.push({
              type: logEntry.errorType || 'client_error',
              message: logEntry.message,
              stack: logEntry.stack,
              url: logEntry.clientUrl,
              timestamp: logEntry.clientTimestamp || logEntry.timestamp,
              userAgent: logEntry.userAgent,
              userId: logEntry.userId,
              context: logEntry.context
            });
          } catch (parseError) {
            logger.warn('Failed to parse error log line:', parseError);
          }
        }
      }

      return errors;
    } catch (readError) {
      // File doesn't exist yet - handle ENOENT error
      if (readError && typeof readError === 'object' && 'code' in readError && readError.code === 'ENOENT') {
        return [];
      }
      throw readError;
    }
  } catch (error) {
    logger.error('Failed to read client errors:', error);
    return [];
  }
}

/**
 * POST /api/errors/report
 * Report a client-side error
 * Public endpoint (no authentication required, but rate-limited)
 */
router.post('/report', async (req: Request, res: Response) => {
  try {
    const report: ErrorReport = req.body;

    // Validate required fields
    if (!report.type || !report.message || !report.url) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields: type, message, url'
        }
      });
    }

    // Add user ID if authenticated
    const authReq = req as AuthenticatedRequest;
    if (authReq.user) {
      report.userId = authReq.user.id;
    }

    // Add timestamp if not provided
    if (!report.timestamp) {
      report.timestamp = new Date().toISOString();
    }

    // Add user agent if not provided
    if (!report.userAgent) {
      report.userAgent = req.headers['user-agent'] || 'Unknown';
    }

    // Log to file
    await logError(report);

    logger.info(`[Client Error] ${report.type} - ${report.message} (${report.url})`);

    res.json({ success: true });
  } catch (error) {
    logger.error('Error in /errors/report:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to log error report'
      }
    });
  }
});

/**
 * GET /api/errors/recent
 * Get recent client error reports
 * Requires: settings.update permission (admin only)
 */
router.get(
  '/recent',
  authenticate,
  requirePermission('settings.update'),
  async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const errors = await getRecentErrors(limit);

      res.json({
        success: true,
        data: {
          errors,
          count: errors.length,
          limit
        }
      });
    } catch (error) {
      logger.error('Error in /errors/recent:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve error reports'
        }
      });
    }
  }
);

/**
 * GET /api/errors/stats
 * Get error statistics for dashboard
 * Requires: settings.update permission (admin only)
 */
router.get(
  '/stats',
  authenticate,
  requirePermission('settings.update'),
  async (req: Request, res: Response) => {
    try {
      const errors = await getRecentErrors(1000);

      // Calculate stats
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const stats = {
        total: errors.length,
        last24h: errors.filter(e => new Date(e.timestamp) >= last24h).length,
        last7d: errors.filter(e => new Date(e.timestamp) >= last7d).length,
        byType: {} as Record<string, number>,
        topUrls: {} as Record<string, number>,
        topMessages: {} as Record<string, number>
      };

      // Group by type
      for (const error of errors) {
        stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
        stats.topUrls[error.url] = (stats.topUrls[error.url] || 0) + 1;

        // Truncate message for grouping
        const shortMessage = error.message.substring(0, 100);
        stats.topMessages[shortMessage] = (stats.topMessages[shortMessage] || 0) + 1;
      }

      // Sort and limit top items
      const sortAndLimit = (obj: Record<string, number>, limit: number) => {
        return Object.entries(obj)
          .sort((a, b) => b[1] - a[1])
          .slice(0, limit)
          .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
      };

      stats.topUrls = sortAndLimit(stats.topUrls, 10);
      stats.topMessages = sortAndLimit(stats.topMessages, 10);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error in /errors/stats:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve error statistics'
        }
      });
    }
  }
);

export default router;
