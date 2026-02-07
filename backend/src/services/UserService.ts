import { UserDatabaseService } from './UserDatabaseService';
import { PermissionCache } from './PermissionCache';
import { hashPassword, verifyPassword } from '../utils/password';
import { AppError } from '../middleware/errorHandler';
import { User, CreateUserData, UpdateUserData } from '../types/auth';
import { PaginatedResponse, createPaginatedResponse, calculateOffset } from '../utils/pagination';
import { logger } from '../utils/logger';

export class UserService {
  /**
   * Get all users with pagination
   */
  async getUsers(page: number = 1, limit: number = 50): Promise<PaginatedResponse<User>> {
    const offset = calculateOffset(page, limit);

    // Single query with window function for total count (was 2 separate queries)
    const users = UserDatabaseService.all(
      `SELECT u.id, u.username, u.email, u.role_id as roleId, r.name as roleName,
              u.is_active as isActive, u.created_at as createdAt,
              u.updated_at as updatedAt, u.last_login_at as lastLoginAt,
              COUNT(*) OVER() as total_count
       FROM users u
       JOIN roles r ON u.role_id = r.id
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    ) as (User & { total_count: number })[];

    const total = users.length > 0 ? users[0].total_count : 0;

    // Remove total_count from result objects
    users.forEach((user) => {
      delete (user as unknown as Record<string, unknown>).total_count;
    });

    return createPaginatedResponse(users as User[], total, page, limit);
  }

  /**
   * Get user by ID
   */
  async getUserById(id: number): Promise<User | null> {
    const user = UserDatabaseService.get(
      `SELECT u.id, u.username, u.email, u.role_id as roleId, r.name as roleName,
              u.is_active as isActive, u.created_at as createdAt,
              u.updated_at as updatedAt, u.last_login_at as lastLoginAt
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      [id]
    );

    return user || null;
  }

  /**
   * Create new user
   */
  async createUser(data: CreateUserData): Promise<User> {
    // Hash password before transaction
    const passwordHash = await hashPassword(data.password);

    // Wrap uniqueness checks and insert in transaction to prevent race condition
    const db = UserDatabaseService.getDatabase();
    const userId = db.transaction(() => {
      // Check username uniqueness inside transaction
      const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(data.username);
      if (existingUser) {
        throw new AppError(409, 'Username already exists');
      }

      // Check email uniqueness inside transaction
      const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(data.email);
      if (existingEmail) {
        throw new AppError(409, 'Email already exists');
      }

      // Create user
      const result = db
        .prepare(
          'INSERT INTO users (username, email, password_hash, role_id, is_active) VALUES (?, ?, ?, ?, ?)'
        )
        .run(data.username, data.email, passwordHash, data.roleId, data.isActive !== false ? 1 : 0);

      return result.lastInsertRowid as number;
    })();

    // Return created user (outside transaction is fine)
    return (await this.getUserById(userId))!;
  }

  /**
   * Update user
   */
  async updateUser(id: number, data: UpdateUserData): Promise<User> {
    const user = await this.getUserById(id);
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    // Build update query dynamically
    const updates: string[] = [];
    const params: unknown[] = [];

    if (data.email !== undefined) {
      // Check if email is taken by another user
      const existing = UserDatabaseService.get('SELECT id FROM users WHERE email = ? AND id != ?', [
        data.email,
        id,
      ]);
      if (existing) {
        throw new AppError(409, 'Email already exists');
      }
      updates.push('email = ?');
      params.push(data.email);
    }

    if (data.roleId !== undefined) {
      updates.push('role_id = ?');
      params.push(data.roleId);
    }

    if (data.isActive !== undefined) {
      updates.push('is_active = ?');
      params.push(data.isActive ? 1 : 0);
    }

    if (updates.length === 0) {
      return user; // No changes
    }

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);

    UserDatabaseService.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

    // Invalidate permission cache if role changed
    if (data.roleId !== undefined) {
      PermissionCache.invalidateUser(id);
      logger.info(`[UserService] User ${id} role changed, permission cache invalidated`);
    }

    return (await this.getUserById(id))!;
  }

  /**
   * Delete user
   */
  async deleteUser(id: number): Promise<void> {
    const user = await this.getUserById(id);
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    // Prevent deleting the last admin
    if (user.roleName === 'admin') {
      const adminCount =
        UserDatabaseService.get(
          'SELECT COUNT(*) as count FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = "admin"',
          []
        )?.count || 0;

      if (adminCount <= 1) {
        throw new AppError(403, 'Cannot delete the last admin user');
      }
    }

    UserDatabaseService.run('DELETE FROM users WHERE id = ?', [id]);
  }

  /**
   * Change user password
   */
  async changePassword(
    id: number,
    currentPassword: string,
    newPassword: string,
    isAdminReset: boolean = false
  ): Promise<void> {
    const user = UserDatabaseService.get('SELECT password_hash FROM users WHERE id = ?', [id]);

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    // Verify current password using centralized utility (skip if admin reset)
    if (!isAdminReset) {
      const isValid = await verifyPassword(currentPassword, user.password_hash);
      if (!isValid) {
        throw new AppError(401, 'Current password is incorrect');
      }
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update password
    UserDatabaseService.run('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?', [
      passwordHash,
      new Date().toISOString(),
      id,
    ]);
  }

  /**
   * Get user setting by key
   */
  async getUserSetting(userId: number, key: string): Promise<string | null> {
    const result = UserDatabaseService.get(
      `SELECT setting_value FROM user_settings
       WHERE user_id = ? AND setting_key = ?`,
      [userId, key]
    );
    return result?.setting_value ?? null;
  }

  /**
   * Get all settings for a user
   */
  async getUserSettings(userId: number): Promise<Record<string, string>> {
    const results = UserDatabaseService.all(
      `SELECT setting_key, setting_value FROM user_settings WHERE user_id = ?`,
      [userId]
    );

    return results.reduce(
      (acc: Record<string, string>, row: any) => {
        acc[row.setting_key] = row.setting_value;
        return acc;
      },
      {} as Record<string, string>
    );
  }

  /**
   * Set user setting (upsert)
   */
  async setUserSetting(userId: number, key: string, value: string): Promise<void> {
    const user = await this.getUserById(userId);
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    const now = new Date().toISOString();
    UserDatabaseService.run(
      `INSERT INTO user_settings (user_id, setting_key, setting_value, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id, setting_key)
       DO UPDATE SET setting_value = excluded.setting_value,
                     updated_at = ?`,
      [userId, key, value, now, now]
    );
  }

  /**
   * Update theme settings in user_settings table (atomic transaction)
   */
  async updateThemeSettings(userId: number, mode: string, primaryColor: string): Promise<void> {
    const user = await this.getUserById(userId);
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    // Execute both updates in parallel for better performance
    await Promise.all([
      this.setUserSetting(userId, 'theme_mode', mode),
      this.setUserSetting(userId, 'primary_color', primaryColor),
    ]);
  }

  /**
   * Get theme settings from user_settings table
   */
  async getThemeSettings(userId: number): Promise<{ mode: string; primaryColor: string }> {
    const mode = await this.getUserSetting(userId, 'theme_mode');
    const primaryColor = await this.getUserSetting(userId, 'primary_color');

    return {
      mode: mode || 'dark',
      primaryColor: primaryColor || 'blue',
    };
  }
}
