import { UserDatabaseService } from './UserDatabaseService';
import { ActivityLog, LogActivityData } from '../types/auth';
import { PaginatedResponse, createPaginatedResponse, calculateOffset } from '../utils/pagination';
import {
  ActivityBreakdownRow,
  UserBreakdownRow,
  ResourceBreakdownRow,
  IpBreakdownRow,
} from '../types/database-rows';
import { TimeRange, getHoursFromTimeRange } from '../utils/timeRangeUtils';
import { AUTH_ACTIONS, categorizeAction } from '../utils/activityUtils';

/**
 * Generate SQL IN clause from AUTH_ACTIONS constant.
 * Keeps the constant as the single source of truth for auth action strings.
 */
const AUTH_ACTIONS_SQL = `'${AUTH_ACTIONS.join("', '")}'`;

interface ActivityFilters {
  userId?: number;
  username?: string;
  action?: string;
  resource?: string;
  startDate?: string;
  endDate?: string;
}

export class ActivityService {
  /**
   * Build WHERE clause from filters for reuse across queries
   */
  private buildWhereClause(filters?: ActivityFilters): { sql: string; params: unknown[] } {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filters?.userId !== undefined) {
      conditions.push('user_id = ?');
      params.push(filters.userId);
    }

    if (filters?.username) {
      conditions.push('username LIKE ?');
      params.push(`%${filters.username}%`);
    }

    if (filters?.action) {
      conditions.push('action LIKE ?');
      params.push(`${filters.action}%`);
    }

    if (filters?.resource) {
      conditions.push('resource LIKE ?');
      params.push(`${filters.resource}%`);
    }

    if (filters?.startDate) {
      conditions.push('created_at >= ?');
      params.push(filters.startDate);
    }

    if (filters?.endDate) {
      conditions.push('created_at <= ?');
      params.push(filters.endDate);
    }

    const sql = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    return { sql, params };
  }

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
        data.userAgent || null,
      ]
    );
  }

  /**
   * Get activity logs with pagination
   */
  async getLogs(
    page: number = 1,
    limit: number = 50,
    filters?: ActivityFilters,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<PaginatedResponse<ActivityLog>> {
    const offset = calculateOffset(page, limit);

    const columnMap: Record<string, string> = {
      createdAt: 'created_at',
      username: 'username',
      action: 'action',
      resource: 'resource',
      ipAddress: 'ip_address',
    };
    const dbColumn = columnMap[sortBy] || 'created_at';
    const order = sortOrder.toUpperCase();

    const { sql: whereClause, params: whereParams } = this.buildWhereClause(filters);

    const sql = `
      SELECT id, user_id as userId, username, action, resource, resource_id as resourceId,
             details, ip_address as ipAddress, user_agent as userAgent, created_at as createdAt
      FROM activity_logs
      ${whereClause}
      ORDER BY ${dbColumn} ${order}
      LIMIT ? OFFSET ?
    `;

    const logs = UserDatabaseService.all<ActivityLog>(sql, [...whereParams, limit, offset]).map(
      (log) => ({
        ...log,
        details: log.details ? JSON.parse(log.details as string) : null,
      })
    );

    const countSql = `SELECT COUNT(*) as count FROM activity_logs ${whereClause}`;
    const total = UserDatabaseService.get<{ count: number }>(countSql, whereParams)?.count || 0;

    return createPaginatedResponse(logs, total, page, limit);
  }

  /**
   * Clean up old logs (retention policy)
   */
  async cleanup(retentionDays: number = 90): Promise<number> {
    const result = UserDatabaseService.run(
      `DELETE FROM activity_logs WHERE created_at < datetime('now', '-' || ? || ' days')`,
      [retentionDays]
    );

    return result.changes;
  }

  /**
   * Get aggregate statistics for dashboard
   */
  async getStats(
    timeRange: TimeRange = '24h',
    customRange?: { startDate?: string; endDate?: string }
  ) {
    let startDate: string;
    let endDate: string = new Date().toISOString();

    if (customRange?.startDate && customRange?.endDate) {
      startDate = customRange.startDate;
      endDate = customRange.endDate;
    } else {
      const hours = getHoursFromTimeRange(timeRange);
      startDate = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    }

    // Get current period stats
    const currentStats = UserDatabaseService.get<{
      total: number;
      uniqueUsers: number;
      authEvents: number;
      authSuccessful: number;
      authFailed: number;
      failedOperations: number;
      systemEvents: number;
    }>(
      `SELECT
        COUNT(*) as total,
        COUNT(DISTINCT user_id) as uniqueUsers,
        COUNT(CASE WHEN action IN (${AUTH_ACTIONS_SQL}) THEN 1 END) as authEvents,
        COUNT(CASE WHEN action IN ('login', 'register') THEN 1 END) as authSuccessful,
        COUNT(CASE WHEN action = 'auth.login.failed' THEN 1 END) as authFailed,
        COUNT(CASE WHEN action LIKE '%fail%' OR action LIKE '%error%' THEN 1 END) as failedOperations,
        COUNT(CASE WHEN user_id IS NULL THEN 1 END) as systemEvents
       FROM activity_logs
       WHERE created_at >= ? AND created_at <= ?`,
      [startDate, endDate]
    );

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
    const previousPeriodStart = new Date(
      new Date(startDate).getTime() - (new Date(endDate).getTime() - new Date(startDate).getTime())
    ).toISOString();
    const previousStats = UserDatabaseService.get(
      `SELECT
        COUNT(*) as total,
        COUNT(DISTINCT user_id) as uniqueUsers,
        COUNT(CASE WHEN action IN (${AUTH_ACTIONS_SQL}) THEN 1 END) as authEvents
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
            formattedRange: formatHourRange(peakHourData.hour),
          }
        : { hour: 0, count: 0, formattedRange: '12:00 AM - 1:00 AM' },
      authEvents: {
        total: currentStats?.authEvents || 0,
        successful: currentStats?.authSuccessful || 0,
        failed: currentStats?.authFailed || 0,
      },
      failedOperations: currentStats?.failedOperations || 0,
      systemEvents: currentStats?.systemEvents || 0,
      trends: {
        totalChange: calculateTrend(currentStats?.total || 0, previousStats?.total || 0),
        userChange: calculateTrend(currentStats?.uniqueUsers || 0, previousStats?.uniqueUsers || 0),
        authChange: calculateTrend(currentStats?.authEvents || 0, previousStats?.authEvents || 0),
      },
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
      groupFormat = 'date(created_at)';
    }

    const trendData = UserDatabaseService.all(
      `SELECT
        ${groupFormat} as timestamp,
        COUNT(*) as total,
        COUNT(CASE WHEN action IN (${AUTH_ACTIONS_SQL}) THEN 1 END) as authEvents,
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
        dataPoints: trendData.length,
      },
    };
  }

  /**
   * Get top actions by frequency
   */
  async getTopActions(limit: number = 10, timeRange: TimeRange = '24h') {
    const hours = getHoursFromTimeRange(timeRange);
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

    return {
      data: topActions.map((action) => ({
        action: action.action,
        count: action.count,
        percentage: totalActivities > 0 ? (action.count / totalActivities) * 100 : 0,
        category: categorizeAction(action.action),
        topResource: action.topResource,
        exampleActivity: {
          username: action.exampleUsername || 'System',
          timestamp: action.exampleTimestamp,
        },
      })),
      meta: {
        totalActivities,
        uniqueActions: topActions.length,
      },
    };
  }

  /**
   * Get activity breakdown by dimension
   */
  async getBreakdown(
    groupBy: 'resource' | 'user' | 'ip',
    limit: number = 10,
    timeRange: TimeRange = '24h'
  ) {
    const hours = getHoursFromTimeRange(timeRange);
    const startDate = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    // Get total count for percentage calculation
    const totalResult = UserDatabaseService.get(
      `SELECT COUNT(*) as total FROM activity_logs WHERE created_at >= ?`,
      [startDate]
    ) as { total: number } | null;
    const totalActivities = totalResult?.total || 0;

    let sql: string;

    switch (groupBy) {
      case 'resource':
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

    const results = UserDatabaseService.all(
      sql,
      groupBy === 'user' || groupBy === 'resource'
        ? [startDate, startDate, limit]
        : [startDate, limit]
    ) as ActivityBreakdownRow[];

    return {
      data: results.map((row: ActivityBreakdownRow) => ({
        key: row.key || 'Unknown',
        count: row.count,
        percentage: totalActivities > 0 ? (row.count / totalActivities) * 100 : 0,
        metadata:
          groupBy === 'user'
            ? {
                userId: (row as UserBreakdownRow).userId,
                lastActivity: (row as UserBreakdownRow).lastActivity,
                topAction: (row as UserBreakdownRow).topAction,
              }
            : groupBy === 'ip'
              ? {
                  associatedUserCount: (row as IpBreakdownRow).associatedUserCount,
                  associatedUsers: (row as IpBreakdownRow).associatedUsers
                    ? (row as IpBreakdownRow).associatedUsers.split(',').slice(0, 5)
                    : [],
                  failedAttempts: (row as IpBreakdownRow).failedAttempts,
                }
              : {
                  topAction: (row as ResourceBreakdownRow).topAction,
                },
      })),
      meta: {
        groupBy,
        total: totalActivities,
      },
    };
  }
}
