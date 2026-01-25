import { UserDatabaseService } from './UserDatabaseService';
import { ActivityLog, LogActivityData } from '../types/auth';
import { PaginatedResponse, createPaginatedResponse, calculateOffset } from '../utils/pagination';

export class ActivityService {
  /**
   * Log activity
   */
  async log(data: LogActivityData): Promise<void> {
    const detailsJson = data.details ? JSON.stringify(data.details) : null;

    UserDatabaseService.run(
      `INSERT INTO activity_logs
       (user_id, username, action, resource, resource_id, details, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.userId || null,
        data.username || null,
        data.action,
        data.resource || null,
        data.resourceId || null,
        detailsJson,
        data.ipAddress || null,
        data.userAgent || null
      ]
    );
  }

  /**
   * Get activity logs with pagination
   */
  async getLogs(
    page: number = 1,
    limit: number = 50,
    filters?: {
      userId?: number;
      username?: string;
      action?: string;
      resource?: string;
      dateFrom?: string;
      dateTo?: string;
    }
  ): Promise<PaginatedResponse<ActivityLog>> {
    const offset = calculateOffset(page, limit);

    let sql = `
      SELECT id, user_id as userId, username, action, resource, resource_id as resourceId,
             details, ip_address as ipAddress, user_agent as userAgent, created_at as createdAt
      FROM activity_logs
      WHERE 1=1
    `;

    const params: any[] = [];

    if (filters?.userId) {
      sql += ' AND user_id = ?';
      params.push(filters.userId);
    }

    if (filters?.username) {
      sql += ' AND username LIKE ?';
      params.push(`%${filters.username}%`);
    }

    if (filters?.action) {
      sql += ' AND action LIKE ?';
      params.push(`${filters.action}%`);
    }

    if (filters?.resource) {
      sql += ' AND resource LIKE ?';
      params.push(`${filters.resource}%`);
    }

    if (filters?.dateFrom) {
      sql += ' AND created_at >= ?';
      params.push(filters.dateFrom);
    }

    if (filters?.dateTo) {
      sql += ' AND created_at <= ?';
      params.push(filters.dateTo);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const logs = UserDatabaseService.all(sql, params).map(log => ({
      ...log,
      details: log.details ? JSON.parse(log.details) : null
    }));

    // Count total
    let countSql = 'SELECT COUNT(*) as count FROM activity_logs WHERE 1=1';
    const countParams: any[] = [];

    if (filters?.userId) {
      countSql += ' AND user_id = ?';
      countParams.push(filters.userId);
    }

    if (filters?.username) {
      countSql += ' AND username LIKE ?';
      countParams.push(`%${filters.username}%`);
    }

    if (filters?.action) {
      countSql += ' AND action LIKE ?';
      countParams.push(`${filters.action}%`);
    }

    if (filters?.resource) {
      countSql += ' AND resource LIKE ?';
      countParams.push(`${filters.resource}%`);
    }

    if (filters?.dateFrom) {
      countSql += ' AND created_at >= ?';
      countParams.push(filters.dateFrom);
    }

    if (filters?.dateTo) {
      countSql += ' AND created_at <= ?';
      countParams.push(filters.dateTo);
    }

    const total = UserDatabaseService.get(countSql, countParams)?.count || 0;

    return createPaginatedResponse(logs, total, page, limit);
  }

  /**
   * Clean up old logs (retention policy)
   */
  async cleanup(retentionDays: number = 90): Promise<number> {
    const result = UserDatabaseService.run(
      `DELETE FROM activity_logs WHERE created_at < datetime('now', '-${retentionDays} days')`
    );

    return result.changes;
  }

  /**
   * Get aggregate statistics for dashboard
   */
  async getStats(timeRange: '24h' | '7d' | '30d' = '24h', customRange?: { startDate?: string; endDate?: string }) {
    // Calculate time window
    let startDate: string;
    let endDate: string = new Date().toISOString();

    if (customRange?.startDate && customRange?.endDate) {
      startDate = customRange.startDate;
      endDate = customRange.endDate;
    } else {
      const hours = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720; // 24h, 7d, 30d
      startDate = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    }

    // Get current period stats
    const currentStats = UserDatabaseService.get(
      `SELECT
        COUNT(*) as total,
        COUNT(DISTINCT user_id) as uniqueUsers,
        COUNT(CASE WHEN action IN ('login', 'logout', 'register', 'auth.login.failed') THEN 1 END) as authEvents,
        COUNT(CASE WHEN action IN ('login', 'register') THEN 1 END) as authSuccessful,
        COUNT(CASE WHEN action = 'auth.login.failed' THEN 1 END) as authFailed,
        COUNT(CASE WHEN action LIKE '%fail%' OR action LIKE '%error%' THEN 1 END) as failedOperations,
        COUNT(CASE WHEN user_id IS NULL THEN 1 END) as systemEvents
       FROM activity_logs
       WHERE created_at >= ? AND created_at <= ?`,
      [startDate, endDate]
    ) as {
      total: number;
      uniqueUsers: number;
      authEvents: number;
      authSuccessful: number;
      authFailed: number;
      failedOperations: number;
      systemEvents: number;
    } | null;

    // Get peak hour
    const peakHourData = UserDatabaseService.get(
      `SELECT
        CAST(strftime('%H', created_at) AS INTEGER) as hour,
        COUNT(*) as count
       FROM activity_logs
       WHERE created_at >= ? AND created_at <= ?
       GROUP BY hour
       ORDER BY count DESC
       LIMIT 1`,
      [startDate, endDate]
    ) as { hour: number; count: number } | null;

    // Get previous period stats for trends
    const previousPeriodStart = new Date(new Date(startDate).getTime() - (new Date(endDate).getTime() - new Date(startDate).getTime())).toISOString();
    const previousStats = UserDatabaseService.get(
      `SELECT
        COUNT(*) as total,
        COUNT(DISTINCT user_id) as uniqueUsers,
        COUNT(CASE WHEN action IN ('login', 'logout', 'register', 'auth.login.failed') THEN 1 END) as authEvents
       FROM activity_logs
       WHERE created_at >= ? AND created_at < ?`,
      [previousPeriodStart, startDate]
    ) as {
      total: number;
      uniqueUsers: number;
      authEvents: number;
    } | null;

    // Calculate trends
    const calculateTrend = (current: number, previous: number) => {
      if (previous === 0) {
        // When starting from zero, don't show misleading 100%
        return 0;
      }
      return Math.round(((current - previous) / previous) * 100);
    };

    // Format peak hour
    const formatHourRange = (hour: number) => {
      const start = hour % 12 === 0 ? 12 : hour % 12;
      const end = (hour + 1) % 12 === 0 ? 12 : (hour + 1) % 12;
      const startPeriod = hour < 12 ? 'AM' : 'PM';
      const endPeriod = hour + 1 < 12 ? 'AM' : 'PM';
      return `${start}:00 ${startPeriod} - ${end}:00 ${endPeriod}`;
    };

    return {
      total: currentStats?.total || 0,
      uniqueUsers: currentStats?.uniqueUsers || 0,
      peakHour: peakHourData
        ? {
            hour: peakHourData.hour,
            count: peakHourData.count,
            formattedRange: formatHourRange(peakHourData.hour)
          }
        : { hour: 0, count: 0, formattedRange: '12:00 AM - 1:00 AM' },
      authEvents: {
        total: currentStats?.authEvents || 0,
        successful: currentStats?.authSuccessful || 0,
        failed: currentStats?.authFailed || 0
      },
      failedOperations: currentStats?.failedOperations || 0,
      systemEvents: currentStats?.systemEvents || 0,
      trends: {
        totalChange: calculateTrend(currentStats?.total || 0, previousStats?.total || 0),
        userChange: calculateTrend(currentStats?.uniqueUsers || 0, previousStats?.uniqueUsers || 0),
        authChange: calculateTrend(currentStats?.authEvents || 0, previousStats?.authEvents || 0)
      }
    };
  }

  /**
   * Get activity trend over time
   */
  async getTrend(days: number = 7) {
    const granularity = days <= 1 ? 'hour' : 'day';
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    let groupFormat: string;
    if (granularity === 'hour') {
      groupFormat = "datetime(strftime('%Y-%m-%d %H:00:00', created_at))";
    } else {
      groupFormat = "date(created_at)";
    }

    const trendData = UserDatabaseService.all(
      `SELECT
        ${groupFormat} as timestamp,
        COUNT(*) as total,
        COUNT(CASE WHEN action IN ('login', 'logout', 'register', 'auth.login.failed') THEN 1 END) as authEvents,
        COUNT(CASE WHEN action LIKE '%fail%' OR action LIKE '%error%' THEN 1 END) as failedActions,
        COUNT(DISTINCT user_id) as uniqueUsers
       FROM activity_logs
       WHERE created_at >= ?
       GROUP BY ${groupFormat}
       ORDER BY timestamp ASC`,
      [startDate]
    ) as Array<{
      timestamp: string;
      total: number;
      authEvents: number;
      failedActions: number;
      uniqueUsers: number;
    }>;

    return {
      data: trendData,
      meta: {
        granularity,
        startDate,
        endDate: new Date().toISOString(),
        dataPoints: trendData.length
      }
    };
  }

  /**
   * Get top actions by frequency
   */
  async getTopActions(limit: number = 10, timeRange: '24h' | '7d' | '30d' = '24h') {
    const hours = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720;
    const startDate = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    // Get total count for percentage calculation
    const totalResult = UserDatabaseService.get(
      `SELECT COUNT(*) as total FROM activity_logs WHERE created_at >= ?`,
      [startDate]
    ) as { total: number } | null;
    const totalActivities = totalResult?.total || 0;

    // Get top actions
    const topActions = UserDatabaseService.all(
      `SELECT
        action,
        COUNT(*) as count,
        (
          SELECT resource
          FROM activity_logs a2
          WHERE a2.action = a1.action AND a2.created_at >= ?
          GROUP BY resource
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ) as topResource,
        (
          SELECT username
          FROM activity_logs a3
          WHERE a3.action = a1.action AND a3.created_at >= ?
          LIMIT 1
        ) as exampleUsername,
        (
          SELECT created_at
          FROM activity_logs a4
          WHERE a4.action = a1.action AND a4.created_at >= ?
          ORDER BY created_at DESC
          LIMIT 1
        ) as exampleTimestamp
       FROM activity_logs a1
       WHERE created_at >= ?
       GROUP BY action
       ORDER BY count DESC
       LIMIT ?`,
      [startDate, startDate, startDate, startDate, limit]
    ) as Array<{
      action: string;
      count: number;
      topResource: string | null;
      exampleUsername: string | null;
      exampleTimestamp: string;
    }>;

    // Categorize actions
    const categorizeAction = (action: string): 'auth' | 'crud' | 'error' | 'system' => {
      if (action.includes('auth') || action.includes('login') || action.includes('logout') || action.includes('register')) {
        return 'auth';
      }
      if (action.includes('fail') || action.includes('error')) {
        return 'error';
      }
      if (action.includes('create') || action.includes('update') || action.includes('delete')) {
        return 'crud';
      }
      return 'system';
    };

    return {
      data: topActions.map(action => ({
        action: action.action,
        count: action.count,
        percentage: totalActivities > 0 ? (action.count / totalActivities) * 100 : 0,
        category: categorizeAction(action.action),
        topResource: action.topResource,
        exampleActivity: {
          username: action.exampleUsername || 'System',
          timestamp: action.exampleTimestamp
        }
      })),
      meta: {
        totalActivities,
        uniqueActions: topActions.length
      }
    };
  }

  /**
   * Get activity breakdown by dimension
   */
  async getBreakdown(
    groupBy: 'resource' | 'user' | 'ip',
    limit: number = 10,
    timeRange: '24h' | '7d' | '30d' = '24h'
  ) {
    const hours = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720;
    const startDate = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    // Get total count for percentage calculation
    const totalResult = UserDatabaseService.get(
      `SELECT COUNT(*) as total FROM activity_logs WHERE created_at >= ?`,
      [startDate]
    ) as { total: number } | null;
    const totalActivities = totalResult?.total || 0;

    let sql: string;
    let groupField: string;

    switch (groupBy) {
      case 'resource':
        groupField = 'resource';
        sql = `SELECT
          resource as key,
          COUNT(*) as count,
          (
            SELECT action
            FROM activity_logs a2
            WHERE a2.resource = a1.resource AND a2.created_at >= ?
            GROUP BY action
            ORDER BY COUNT(*) DESC
            LIMIT 1
          ) as topAction
        FROM activity_logs a1
        WHERE created_at >= ? AND resource IS NOT NULL
        GROUP BY resource
        ORDER BY count DESC
        LIMIT ?`;
        break;

      case 'user':
        groupField = 'user_id';
        sql = `SELECT
          username as key,
          user_id as userId,
          COUNT(*) as count,
          MAX(created_at) as lastActivity,
          (
            SELECT action
            FROM activity_logs a2
            WHERE a2.user_id = a1.user_id AND a2.created_at >= ?
            GROUP BY action
            ORDER BY COUNT(*) DESC
            LIMIT 1
          ) as topAction
        FROM activity_logs a1
        WHERE created_at >= ? AND user_id IS NOT NULL
        GROUP BY user_id, username
        ORDER BY count DESC
        LIMIT ?`;
        break;

      case 'ip':
        groupField = 'ip_address';
        sql = `SELECT
          ip_address as key,
          COUNT(*) as count,
          COUNT(DISTINCT user_id) as associatedUserCount,
          GROUP_CONCAT(DISTINCT username) as associatedUsers,
          COUNT(CASE WHEN action = 'auth.login.failed' THEN 1 END) as failedAttempts
        FROM activity_logs
        WHERE created_at >= ? AND ip_address IS NOT NULL
        GROUP BY ip_address
        ORDER BY count DESC
        LIMIT ?`;
        break;

      default:
        throw new Error(`Invalid groupBy parameter: ${groupBy}`);
    }

    const results = UserDatabaseService.all(sql, groupBy === 'user' || groupBy === 'resource' ? [startDate, startDate, limit] : [startDate, limit]) as any[];

    return {
      data: results.map((row: any) => ({
        key: row.key || 'Unknown',
        count: row.count,
        percentage: totalActivities > 0 ? (row.count / totalActivities) * 100 : 0,
        metadata: groupBy === 'user'
          ? {
              userId: row.userId,
              lastActivity: row.lastActivity,
              topAction: row.topAction
            }
          : groupBy === 'ip'
          ? {
              associatedUserCount: row.associatedUserCount,
              associatedUsers: row.associatedUsers ? row.associatedUsers.split(',').slice(0, 5) : [],
              failedAttempts: row.failedAttempts
            }
          : {
              topAction: row.topAction
            }
      })),
      meta: {
        groupBy,
        total: totalActivities
      }
    };
  }
}
