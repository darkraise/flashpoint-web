/**
 * System role constants
 * These role IDs are defined in the initial migration (001_user-schema.sql)
 * and should NOT be modified or deleted as they are core to the system.
 */
export const SYSTEM_ROLES = {
  ADMIN: 1,
  USER: 2,
  GUEST: 3,
} as const;

/**
 * Check if a role ID is a system role
 */
export function isSystemRole(roleId: number): boolean {
  return (Object.values(SYSTEM_ROLES) as number[]).includes(roleId);
}

/**
 * System role names
 */
export const SYSTEM_ROLE_NAMES = {
  [SYSTEM_ROLES.ADMIN]: 'admin',
  [SYSTEM_ROLES.USER]: 'user',
  [SYSTEM_ROLES.GUEST]: 'guest',
} as const;
