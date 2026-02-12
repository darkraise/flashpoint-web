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

/**
 * Client-side token metadata. Actual access/refresh tokens are stored in HTTP-only cookies.
 */
export interface AuthTokens {
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

export interface Permission {
  id: number;
  name: string;
  description: string | null;
  resource: string;
  action: string;
  createdAt: string;
}

export interface Role {
  id: number;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  permissions: Permission[];
}

export interface CreateRoleData {
  name: string;
  description?: string;
  permissionIds?: number[];
}

export interface UpdateRoleData {
  name?: string;
  description?: string;
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

export interface ChangePasswordData {
  currentPassword?: string;
  newPassword: string;
}

export interface PaginationMetadata {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMetadata;
}

export interface UsersResponse {
  data: UserDetails[];
  pagination: PaginationMetadata;
}

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
  sortBy?: 'createdAt' | 'username' | 'action' | 'resource' | 'ipAddress';
  sortOrder?: 'asc' | 'desc';
}

export interface ActivitiesResponse {
  data: ActivityLog[];
  pagination: PaginationMetadata;
}

export interface ActivityStats {
  total: number;
  uniqueUsers: number;
  peakHour: {
    hour: number;
    count: number;
    formattedRange: string;
  };
  authEvents: {
    total: number;
    successful: number;
    failed: number;
  };
  failedOperations: number;
  systemEvents: number;
  trends: {
    totalChange: number;
    userChange: number;
    authChange: number;
  };
}

export interface ActivityStatsResponse {
  success: boolean;
  data: ActivityStats;
  meta: {
    calculatedAt: string;
    timeRange: string;
  };
}

export interface ActivityTrendData {
  timestamp: string;
  total: number;
  authEvents: number;
  failedActions: number;
  uniqueUsers: number;
}

export interface ActivityTrendResponse {
  success: boolean;
  data: ActivityTrendData[];
  meta: {
    granularity: 'hour' | 'day';
    startDate: string;
    endDate: string;
    dataPoints: number;
  };
}

export interface TopAction {
  action: string;
  count: number;
  percentage: number;
  category: 'auth' | 'crud' | 'error' | 'system';
  topResource: string | null;
  exampleActivity: {
    username: string;
    timestamp: string;
  };
}

export interface TopActionsResponse {
  success: boolean;
  data: TopAction[];
  meta: {
    totalActivities: number;
    uniqueActions: number;
  };
}

export interface ActivityBreakdownItem {
  key: string;
  count: number;
  percentage: number;
  metadata: {
    userId?: number;
    lastActivity?: string;
    topAction?: string;
    associatedUserCount?: number;
    associatedUsers?: string[];
    failedAttempts?: number;
  };
}

export interface ActivityBreakdownResponse {
  success: boolean;
  data: ActivityBreakdownItem[];
  meta: {
    groupBy: 'resource' | 'user' | 'ip';
    total: number;
  };
}

export type TimeRange = '24h' | '7d' | '30d';

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
