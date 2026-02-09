/**
 * Authentication and Authorization Types
 */

// ===================================
// User Types
// ===================================

export interface User {
  id: number;
  username: string;
  email: string;
  roleId: number;
  roleName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  themeColor?: string;
  surfaceColor?: string;
}

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  role: string;
  permissions: string[];
  themeColor?: string;
  surfaceColor?: string;
}

export interface CreateUserData {
  username: string;
  email: string;
  password: string;
  roleId: number;
  isActive?: boolean;
}

export interface UpdateUserData {
  email?: string;
  roleId?: number;
  isActive?: boolean;
}

// ===================================
// Authentication Types
// ===================================

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// ===================================
// Role and Permission Types
// ===================================

export interface Permission {
  id: number;
  name: string;
  description?: string;
  resource: string;
  action: string;
}

export interface Role {
  id: number;
  name: string;
  description?: string;
  priority: number;
  permissions: Permission[];
  createdAt: string;
  updatedAt: string;
}

// ===================================
// Activity Log Types
// ===================================

export interface ActivityLog {
  id: number;
  userId?: number;
  username?: string;
  action: string;
  resource?: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface LogActivityData {
  userId?: number;
  username?: string;
  action: string;
  resource?: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

// ===================================
// Auth Settings Types
// ===================================

export interface AuthSettings {
  guestAccessEnabled: boolean;
  userRegistrationEnabled: boolean;
  requireEmailVerification: boolean;
  sessionTimeoutMinutes: number;
  maxLoginAttempts: number;
  lockoutDurationMinutes: number;
  updatedAt: string;
  updatedBy?: number;
}
