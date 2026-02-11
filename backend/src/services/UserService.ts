import { UserDatabaseService } from './UserDatabaseService';
import { PermissionCache } from './PermissionCache';
import { AuthService } from './AuthService';
import { hashPassword, verifyPassword } from '../utils/password';
import { AppError } from '../middleware/errorHandler';
import { User, CreateUserData, UpdateUserData } from '../types/auth';
import { PaginatedResponse, createPaginatedResponse, calculateOffset } from '../utils/pagination';
import { logger } from '../utils/logger';

export class UserService {
  private authService = new AuthService();
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

    // Remove total_count from result objects and coerce isActive to boolean
    const cleaned = users.map(({ total_count, ...rest }) => ({
      ...rest,
      isActive: Boolean(rest.isActive),
    })) as User[];

    return createPaginatedResponse(cleaned, total, page, limit);
  }

  async getUserById(id: number): Promise<User | null> {
    const user = UserDatabaseService.get<{
      id: number;
      username: string;
      email: string;
      roleId: number;
      roleName: string;
      isActive: number;
      createdAt: string;
      updatedAt: string;
      lastLoginAt: string | null;
    }>(
      `SELECT u.id, u.username, u.email, u.role_id as roleId, r.name as roleName,
              u.is_active as isActive, u.created_at as createdAt,
              u.updated_at as updatedAt, u.last_login_at as lastLoginAt
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      [id]
    );

    return user
      ? {
          ...user,
          isActive: Boolean(user.isActive),
          lastLoginAt: user.lastLoginAt ?? undefined,
        }
      : null;
  }

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

  async updateUser(id: number, data: UpdateUserData): Promise<User> {
    const user = await this.getUserById(id);
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    // Build update query dynamically
    const updates: string[] = [];
    const params: unknown[] = [];

    if (data.email !== undefined) {
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

      // Revoke all refresh tokens when deactivating a user
      if (!data.isActive) {
        await this.authService.revokeAllUserTokens(id);
        logger.info(`[UserService] All refresh tokens revoked after deactivating user ${id}`);
      }
    }

    if (updates.length === 0) {
      return user; // No changes
    }

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);

    // Wrap in transaction to prevent TOCTOU race on email uniqueness
    const db = UserDatabaseService.getDatabase();
    db.transaction(() => {
      if (data.email !== undefined) {
        const existing = db
          .prepare('SELECT id FROM users WHERE email = ? AND id != ?')
          .get(data.email, id);
        if (existing) {
          throw new AppError(409, 'Email already exists');
        }
      }
      db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    })();

    // Invalidate permission cache if role changed
    if (data.roleId !== undefined) {
      PermissionCache.invalidateUser(id);
      logger.info(`[UserService] User ${id} role changed, permission cache invalidated`);
    }

    return (await this.getUserById(id))!;
  }

  async deleteUser(id: number): Promise<void> {
    const user = await this.getUserById(id);
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    // Prevent deleting the last admin
    if (user.roleName === 'admin') {
      const adminCount =
        UserDatabaseService.get<{ count: number }>(
          "SELECT COUNT(*) as count FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = 'admin'",
          []
        )?.count || 0;

      if (adminCount <= 1) {
        throw new AppError(403, 'Cannot delete the last admin user');
      }
    }

    // Delete from all dependent tables in a transaction to avoid FK constraint errors
    const db = UserDatabaseService.getDatabase();
    db.transaction(() => {
      db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(id);
      db.prepare('DELETE FROM user_favorites WHERE user_id = ?').run(id);
      db.prepare('DELETE FROM user_game_plays WHERE user_id = ?').run(id);
      db.prepare('DELETE FROM user_game_stats WHERE user_id = ?').run(id);
      db.prepare('DELETE FROM user_stats WHERE user_id = ?').run(id);
      db.prepare('DELETE FROM user_settings WHERE user_id = ?').run(id);
      db.prepare('DELETE FROM user_playlists WHERE user_id = ?').run(id);
      db.prepare('DELETE FROM users WHERE id = ?').run(id);
    })();

    // Invalidate permission cache for deleted user
    PermissionCache.invalidateUser(id);
  }

  async changePassword(
    id: number,
    currentPassword: string,
    newPassword: string,
    isAdminReset: boolean = false
  ): Promise<void> {
    const user = UserDatabaseService.get<{ password_hash: string }>(
      'SELECT password_hash FROM users WHERE id = ?',
      [id]
    );

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

    // Revoke all refresh tokens to invalidate existing sessions
    await this.authService.revokeAllUserTokens(id);
    logger.info(`[UserService] All refresh tokens revoked after password change for user ${id}`);
  }

  async getUserSetting(userId: number, key: string): Promise<string | null> {
    const result = UserDatabaseService.get<{ setting_value: string }>(
      `SELECT setting_value FROM user_settings
       WHERE user_id = ? AND setting_key = ?`,
      [userId, key]
    );
    return result?.setting_value ?? null;
  }

  async getUserSettings(userId: number): Promise<Record<string, string>> {
    const results = UserDatabaseService.all<{ setting_key: string; setting_value: string }>(
      `SELECT setting_key, setting_value FROM user_settings WHERE user_id = ?`,
      [userId]
    );

    return results.reduce(
      (acc: Record<string, string>, row) => {
        acc[row.setting_key] = row.setting_value;
        return acc;
      },
      {} as Record<string, string>
    );
  }

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

  async getThemeSettings(userId: number): Promise<{ mode: string; primaryColor: string }> {
    const mode = await this.getUserSetting(userId, 'theme_mode');
    const primaryColor = await this.getUserSetting(userId, 'primary_color');

    return {
      mode: mode || 'dark',
      primaryColor: primaryColor || 'blue',
    };
  }
}
