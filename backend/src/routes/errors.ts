import { Router, Request, Response } from 'express';
import { promises as fs } from 'fs';
import fsSync from 'fs';
import path from 'path';
import winston from 'winston';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { rateLimitStrict } from '../middleware/rateLimiter';
import { asyncHandler } from '../middleware/asyncHandler';
import { logger } from '../utils/logger';
import { config } from '../config';

const errorReportSchema = z.object({
  type: z.enum(['client_error', 'network_error', 'api_error', 'route_error']),
  message: z.string().max(2000),
  stack: z.string().max(5000).optional(),
  url: z.string().max(2000),
  timestamp: z.string().optional(),
  userAgent: z.string().optional(),
  context: z
    .record(z.string().max(100), z.unknown())
    .refine((obj) => Object.keys(obj).length <= 20, {
      message: 'Context object may have at most 20 keys',
    })
    .optional(),
});

const router = Router();

const LOG_DIR = config.logFile ? path.dirname(config.logFile) : path.join(__dirname, '../../logs');
const ERROR_LOG_FILE = path.join(LOG_DIR, 'client-errors.log');

if (!fsSync.existsSync(LOG_DIR)) {
  fsSync.mkdirSync(LOG_DIR, { recursive: true });
}

function getSeverityNumber(type: string): number {
  const severityMap: Record<string, number> = {
    client_error: 17, // ERROR
    api_error: 17, // ERROR
    network_error: 13, // WARN (may be transient)
    route_error: 13, // WARN
  };
  return severityMap[type] || 17;
}

const clientErrorLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }), // ISO 8601
    winston.format.errors({ stack: true }),
    winston.format((info) => {
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
      tailable: true,
    }),
  ],
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

async function logError(report: ErrorReport): Promise<void> {
  try {
    clientErrorLogger.info(report.message, {
      errorType: report.type,
      clientUrl: report.url,
      clientTimestamp: report.timestamp,
      userAgent: report.userAgent,
      userId: report.userId,
      stack: report.stack,
      context: report.context,
    });
  } catch (error) {
    logger.error('Failed to log client error:', error);
  }
}

async function getRecentErrors(limit: number = 100): Promise<ErrorReport[]> {
  try {
    const { createReadStream } = await import('fs');
    const { createInterface } = await import('readline');

    return await new Promise<ErrorReport[]>((resolve) => {
      try {
        const stream = createReadStream(ERROR_LOG_FILE, { encoding: 'utf8' });
        const rl = createInterface({ input: stream, crlfDelay: Infinity });

        const allLines: string[] = [];

        rl.on('line', (line) => {
          const trimmed = line.trim();
          if (trimmed) {
            allLines.push(trimmed);
          }
        });

        rl.on('close', () => {
          const errors: ErrorReport[] = [];
          for (let i = allLines.length - 1; i >= 0 && errors.length < limit; i--) {
            try {
              const logEntry = JSON.parse(allLines[i]);
              errors.push({
                type: logEntry.errorType || 'client_error',
                message: logEntry.message,
                stack: logEntry.stack,
                url: logEntry.clientUrl,
                timestamp: logEntry.clientTimestamp || logEntry.timestamp,
                userAgent: logEntry.userAgent,
                userId: logEntry.userId,
                context: logEntry.context,
              });
            } catch (parseError) {
              logger.warn('Failed to parse error log line:', parseError);
            }
          }
          resolve(errors);
        });

        stream.on('error', (err: NodeJS.ErrnoException) => {
          rl.close();
          stream.destroy();
          if (err.code === 'ENOENT') {
            resolve([]);
          } else {
            logger.error('Failed to read client errors:', err);
            resolve([]);
          }
        });
      } catch (err) {
        resolve([]);
      }
    });
  } catch (error) {
    logger.error('Failed to read client errors:', error);
    return [];
  }
}

router.post(
  '/report',
  rateLimitStrict,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const parseResult = errorReportSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid error report: ${parseResult.error.issues[0].message}`,
          },
        });
      }

      const validatedData = parseResult.data;

      const report: ErrorReport = {
        type: validatedData.type,
        message: validatedData.message,
        stack: validatedData.stack,
        url: validatedData.url,
        timestamp: validatedData.timestamp || new Date().toISOString(),
        userAgent: validatedData.userAgent || req.headers['user-agent'] || 'Unknown',
        context: validatedData.context,
      };

      const authReq = req as AuthenticatedRequest;
      if (authReq.user) {
        report.userId = authReq.user.id;
      }

      await logError(report);

      logger.info(`[Client Error] ${report.type} - ${report.message} (${report.url})`);

      res.json({ success: true });
    } catch (error) {
      logger.error('Error in /errors/report:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to log error report',
        },
      });
    }
  })
);

router.get(
  '/recent',
  authenticate,
  requirePermission('settings.update'),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
      const errors = await getRecentErrors(limit);

      res.json({
        success: true,
        data: {
          errors,
          count: errors.length,
          limit,
        },
      });
    } catch (error) {
      logger.error('Error in /errors/recent:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve error reports',
        },
      });
    }
  })
);

router.get(
  '/stats',
  authenticate,
  requirePermission('settings.update'),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const errors = await getRecentErrors(1000);

      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const stats = {
        total: errors.length,
        last24h: errors.filter((e) => new Date(e.timestamp) >= last24h).length,
        last7d: errors.filter((e) => new Date(e.timestamp) >= last7d).length,
        byType: {} as Record<string, number>,
        topUrls: {} as Record<string, number>,
        topMessages: {} as Record<string, number>,
      };

      for (const error of errors) {
        stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
        stats.topUrls[error.url] = (stats.topUrls[error.url] || 0) + 1;

        const shortMessage = error.message.substring(0, 100);
        stats.topMessages[shortMessage] = (stats.topMessages[shortMessage] || 0) + 1;
      }

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
        data: stats,
      });
    } catch (error) {
      logger.error('Error in /errors/stats:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve error statistics',
        },
      });
    }
  })
);

export default router;
