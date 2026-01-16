import { UserDatabaseService } from './UserDatabaseService';
import { hashPassword } from '../utils/password';
import { AppError } from '../middleware/errorHandler';
import { User, CreateUserData, UpdateUserData } from '../types/auth';
import { PaginatedResponse, createPaginatedResponse, calculateOffset } from '../utils/pagination';

export class UserService {
  /**
   * Get all users with pagination
   */
  async getUsers(page: number = 1, limit: number = 50): Promise<PaginatedResponse<User>> {
    const offset = calculateOffset(page, limit);

    const users = UserDatabaseService.all(
      `SELECT u.id, u.username, u.email, u.role_id as roleId, r.name as roleName,
              u.is_active as isActive, u.created_at as createdAt,
              u.updated_at as updatedAt, u.last_login_at as lastLoginAt,
              u.theme_color as themeColor, u.surface_color as surfaceColor
       FROM users u
       JOIN roles r ON u.role_id = r.id
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const total = UserDatabaseService.get('SELECT COUNT(*) as count FROM users', [])?.count || 0;

    return createPaginatedResponse(users, total, page, limit);
  }

  /**
   * Get user by ID
   */
  async getUserById(id: number): Promise<User | null> {
    const user = UserDatabaseService.get(
      `SELECT u.id, u.username, u.email, u.role_id as roleId, r.name as roleName,
              u.is_active as isActive, u.created_at as createdAt,
              u.updated_at as updatedAt, u.last_login_at as lastLoginAt,
              u.theme_color as themeColor, u.surface_color as surfaceColor
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
    // Check if username exists
    const existingUser = UserDatabaseService.get(
      'SELECT id FROM users WHERE username = ?',
      [data.username]
    );
    if (existingUser) {
      throw new AppError(409, 'Username already exists');
    }

    // Check if email exists
    const existingEmail = UserDatabaseService.get(
      'SELECT id FROM users WHERE email = ?',
      [data.email]
    );
    if (existingEmail) {
      throw new AppError(409, 'Email already exists');
    }

    // Hash password
    const passwordHash = await hashPassword(data.password);

    // Create user
    const result = UserDatabaseService.run(
      'INSERT INTO users (username, email, password_hash, role_id) VALUES (?, ?, ?, ?)',
      [data.username, data.email, passwordHash, data.roleId]
    );

    const userId = result.lastInsertRowid as number;

    // Return created user
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
    const params: any[] = [];

    if (data.email !== undefined) {
      // Check if email is taken by another user
      const existing = UserDatabaseService.get(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [data.email, id]
      );
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

    updates.push("updated_at = datetime('now')");
    params.push(id);

    UserDatabaseService.run(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

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
      const adminCount = UserDatabaseService.get(
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
  async changePassword(id: number, currentPassword: string, newPassword: string): Promise<void> {
    const user = UserDatabaseService.get(
      'SELECT password_hash FROM users WHERE id = ?',
      [id]
    );

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    // Verify current password
    const bcrypt = require('bcrypt');
    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      throw new AppError(401, 'Current password is incorrect');
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update password
    UserDatabaseService.run(
      "UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?",
      [passwordHash, id]
    );
  }

  /**
   * Update user theme color
   */
  async updateUserTheme(id: number, themeColor: string, surfaceColor?: string): Promise<void> {
    const user = await this.getUserById(id);
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    if (surfaceColor !== undefined) {
      UserDatabaseService.run(
        "UPDATE users SET theme_color = ?, surface_color = ?, updated_at = datetime('now') WHERE id = ?",
        [themeColor, surfaceColor, id]
      );
    } else {
      UserDatabaseService.run(
        "UPDATE users SET theme_color = ?, updated_at = datetime('now') WHERE id = ?",
        [themeColor, id]
      );
    }
  }
}
