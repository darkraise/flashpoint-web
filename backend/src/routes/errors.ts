import { Router, Request, Response } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';

const router = Router();

const LOG_DIR = path.join(__dirname, '../../logs');
const ERROR_LOG_FILE = path.join(LOG_DIR, 'client-errors.log');

interface ErrorReport {
  type: 'client_error' | 'network_error' | 'api_error' | 'route_error';
  message: string;
  stack?: string;
  url: string;
  timestamp: string;
  userAgent: string;
  userId?: number;
  context?: Record<string, any>;
}

/**
 * Ensure logs directory exists
 */
async function ensureLogDir(): Promise<void> {
  try {
    await fs.mkdir(LOG_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create logs directory:', error);
  }
}

/**
 * Log error report to file in JSONL format
 */
async function logError(report: ErrorReport): Promise<void> {
  try {
    await ensureLogDir();

    const logLine = JSON.stringify(report) + '\n';
    await fs.appendFile(ERROR_LOG_FILE, logLine, 'utf8');
  } catch (error) {
    console.error('Failed to log client error:', error);
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
            const report = JSON.parse(line);
            errors.push(report);
          } catch (parseError) {
            console.warn('Failed to parse error log line:', parseError);
          }
        }
      }

      return errors;
    } catch (readError: any) {
      // File doesn't exist yet
      if (readError.code === 'ENOENT') {
        return [];
      }
      throw readError;
    }
  } catch (error) {
    console.error('Failed to read client errors:', error);
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
    if ((req as any).user) {
      report.userId = (req as any).user.id;
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

    console.log(`[Client Error] ${report.type} - ${report.message} (${report.url})`);

    res.json({ success: true });
  } catch (error) {
    console.error('Error in /errors/report:', error);
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
        errors,
        count: errors.length,
        limit
      });
    } catch (error) {
      console.error('Error in /errors/recent:', error);
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

export default router;
