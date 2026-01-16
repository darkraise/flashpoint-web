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

    if (filters?.action) {
      sql += ' AND action = ?';
      params.push(filters.action);
    }

    if (filters?.resource) {
      sql += ' AND resource = ?';
      params.push(filters.resource);
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

    if (filters?.action) {
      countSql += ' AND action = ?';
      countParams.push(filters.action);
    }

    if (filters?.resource) {
      countSql += ' AND resource = ?';
      countParams.push(filters.resource);
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
}
