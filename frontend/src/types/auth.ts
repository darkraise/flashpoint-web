/**
 * Authentication and User Management Types
 */

// ===================================
// User Types
// ===================================

export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  permissions: string[];
}

export interface UserDetails {
  id: number;
  username: string;
  email: string;
  roleId: number;
  roleName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

// ===================================
// Authentication Types
// ===================================

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

export interface RegisterResponse {
  user: User;
  tokens: AuthTokens;
}

// ===================================
// Role Types
// ===================================

export interface Permission {
  id: number;
  name: string;
  description: string;
  resource: string;
  action: string;
  createdAt: string;
}

export interface Role {
  id: number;
  name: string;
  description: string;
  priority: number;
  createdAt: string;
  updatedAt: string;
  permissions: Permission[];
}

export interface CreateRoleData {
  name: string;
  description?: string;
  priority?: number;
  permissionIds?: number[];
}

export interface UpdateRoleData {
  name?: string;
  description?: string;
  priority?: number;
}

// ===================================
// User Management Types
// ===================================

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

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

// Standardized pagination metadata
export interface PaginationMetadata {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Standardized paginated response
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMetadata;
}

export interface UsersResponse {
  data: UserDetails[];
  pagination: PaginationMetadata;
}

// ===================================
// Activity Log Types
// ===================================

export interface ActivityLog {
  id: number;
  userId: number | null;
  username: string | null;
  action: string;
  resource: string | null;
  resourceId: string | null;
  details: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface ActivityFilters {
  userId?: number;
  username?: string;
  action?: string;
  resource?: string;
  startDate?: string;
  endDate?: string;
}

export interface ActivitiesResponse {
  data: ActivityLog[];
  pagination: PaginationMetadata;
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
  updatedBy: number | null;
}

export interface UpdateAuthSettingsData {
  guestAccessEnabled?: boolean;
  userRegistrationEnabled?: boolean;
  requireEmailVerification?: boolean;
  sessionTimeoutMinutes?: number;
  maxLoginAttempts?: number;
  lockoutDurationMinutes?: number;
}
