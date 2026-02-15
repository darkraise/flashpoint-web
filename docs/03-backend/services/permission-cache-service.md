# PermissionCache Service

## Overview

The PermissionCache service provides an in-memory caching layer for user and
role permissions, significantly reducing database queries and improving
authorization performance.

**Location:** `backend/src/services/PermissionCache.ts`

**Type:** Singleton service (static methods)

**Purpose:** Cache user permissions to avoid repeated database queries during
authorization checks

## Performance Impact

**Before Caching:**

- Every authenticated request queries database for permissions
- ~50-100ms per permission check (includes database query)
- High database load under concurrent requests

**After Caching:**

- 90%+ of permission checks served from cache
- ~1-5ms per permission check (in-memory lookup)
- Significantly reduced database load

**Example Load:**

- 100 requests/second × 2 permission checks/request = 200 DB queries/second
- With caching: ~20 DB queries/second (90% cache hit rate)
- **10x reduction in database queries**

## Architecture

### Cache Structure

```typescript
interface CacheEntry<T> {
  data: T;
  expiresAt: number; // Unix timestamp
}

class PermissionCache {
  // User permissions cache: Map<userId, CacheEntry<permissions[]>>
  private static userPermissionsCache: Map<number, CacheEntry<string[]>>;

  // Role permissions cache: Map<roleId, CacheEntry<permissions[]>>
  private static rolePermissionsCache: Map<number, CacheEntry<string[]>>;

  // Cleanup interval reference
  private static cleanupInterval: NodeJS.Timeout | null;
}
```

### TTL (Time To Live)

**User Permissions:**

- TTL: 5 minutes (300,000 ms)
- Rationale: Balance between performance and permission update latency
- Trade-off: Permission changes may take up to 5 minutes to propagate

**Role Permissions:**

- TTL: 10 minutes (600,000 ms)
- Rationale: Roles change less frequently than user-role assignments
- Trade-off: Role permission changes may take up to 10 minutes to propagate

### Cache Lifecycle

```
1. Server starts
   ↓
2. PermissionCache.startCleanup() called
   ↓
3. Cleanup interval started (every 5 minutes)
   ↓
4. Cache entries added on permission lookups
   ↓
5. Cache entries automatically expire based on TTL
   ↓
6. Cleanup interval removes expired entries
   ↓
7. Server shutdown → PermissionCache.stopCleanup()
```

## API Reference

### getUserPermissions(userId: number): string[] | null

Get user permissions from cache.

**Parameters:**

- `userId` (number): User ID to lookup

**Returns:**

- `string[]`: Array of permission strings if cache hit
- `null`: If cache miss or entry expired

**Example:**

```typescript
const cached = PermissionCache.getUserPermissions(5);
if (cached) {
  // Use cached permissions
  return cached;
} else {
  // Query database
  const permissions = await queryDatabase(5);
  PermissionCache.setUserPermissions(5, permissions);
  return permissions;
}
```

### setUserPermissions(userId: number, permissions: string[]): void

Store user permissions in cache.

**Parameters:**

- `userId` (number): User ID
- `permissions` (string[]): Array of permission strings

**Side Effects:**

- Creates cache entry with 5-minute TTL
- Logs debug message to console

**Example:**

```typescript
const permissions = ['games.read', 'games.play'];
PermissionCache.setUserPermissions(5, permissions);
```

### getRolePermissions(roleId: number): string[] | null

Get role permissions from cache.

**Parameters:**

- `roleId` (number): Role ID to lookup

**Returns:**

- `string[]`: Array of permission strings if cache hit
- `null`: If cache miss or entry expired

**Example:**

```typescript
const cached = PermissionCache.getRolePermissions(2);
if (cached) {
  // Use cached permissions
  return cached;
} else {
  // Query database
  const permissions = await queryRolePermissions(2);
  PermissionCache.setRolePermissions(2, permissions);
  return permissions;
}
```

### setRolePermissions(roleId: number, permissions: string[]): void

Store role permissions in cache.

**Parameters:**

- `roleId` (number): Role ID
- `permissions` (string[]): Array of permission strings

**Side Effects:**

- Creates cache entry with 10-minute TTL
- Logs debug message to console

**Example:**

```typescript
const permissions = ['games.read', 'games.play', 'playlists.create'];
PermissionCache.setRolePermissions(2, permissions);
```

### invalidateUser(userId: number): void

Remove user's permission cache entry.

**Parameters:**

- `userId` (number): User ID to invalidate

**Use Cases:**

- User role changed
- User permissions updated
- Manual cache invalidation

**Example:**

```typescript
// After changing user role
await userService.updateUserRole(5, 2);
PermissionCache.invalidateUser(5);
```

### invalidateRole(roleId: number): void

Remove role's permission cache entry AND propagate invalidation to all users
with that role.

**Parameters:**

- `roleId` (number): Role ID to invalidate

**Use Cases:**

- Role permissions updated
- Manual cache invalidation

**Example:**

```typescript
// After updating role permissions
await roleService.updateRolePermissions(2, [1, 2, 3]);
PermissionCache.invalidateRole(2);
```

**How it works:**

When a role's permissions change, this method:

1. Clears the specific role's cache entry: `rolePermissionsCache.delete(roleId)`
2. **Clears the entire user permissions cache**: `userPermissionsCache.clear()`

**Why clear all user cache entries:**

- Clearing just the role cache entry isn't enough
- Users with that role have cached permissions from the old role permissions
- Next request would still use the old cached user permissions
- By clearing the entire user cache, all users must refetch permissions on
  their next request
- This ensures all users with the changed role immediately get fresh
  permissions

**Role Invalidation Propagation:**

The propagation ensures permission changes immediately cascade to all affected
users:

1. **Role permission changes** → `invalidateRole(roleId)` called
2. **Role cache entry cleared** → Next role permission lookup queries database
3. **All user cache cleared** → Every user must refetch permissions on next
   request
4. **New permissions fetched** → Database queries include new role permissions
5. **Cache repopulated** → Users get fresh permissions immediately

**Performance impact:**

- Temporary increase in database queries as users refetch permissions
- Cache hits resume within seconds as users re-populate the cache
- Trade-off: Ensures permission changes are immediately visible

**Alternative: More granular invalidation:**

If performance becomes an issue with large user bases:

```typescript
// Could track users by role and only invalidate those
const usersWithRole = this.db.all(
  'SELECT id FROM users WHERE role_id = ?',
  [roleId]
);
for (const user of usersWithRole) {
  PermissionCache.invalidateUser(user.id);
}
```

But for now, the simpler approach of clearing all user cache is more
reliable.

### invalidateAllUsers(): void

Clear all user permission cache entries.

**Use Cases:**

- Bulk user permission changes
- Role structure changes
- System-wide permission refresh

**Example:**

```typescript
// After bulk permission update
await permissionService.bulkUpdate(userIds);
PermissionCache.invalidateAllUsers();
```

### invalidateAllRoles(): void

Clear all role permission cache entries.

**Use Cases:**

- Bulk role permission changes
- Permission structure changes
- System-wide role refresh

**Example:**

```typescript
// After updating permission definitions
await permissionService.rebuildPermissions();
PermissionCache.invalidateAllRoles();
```

### clearAll(): void

Clear entire cache (both user and role caches).

**Use Cases:**

- Bulk permission changes
- System maintenance
- Testing/debugging
- Admin-initiated clear via API

**Example:**

```typescript
PermissionCache.clearAll();
logger.info('All permission caches cleared');
```

### cleanup(): void

Remove expired cache entries from both user and role caches.

**Behavior:**

- Iterates through all cache entries
- Removes entries where `expiresAt < Date.now()`
- Logs count of removed entries if any were expired
- Called automatically by the cleanup interval

**Note:** This is called automatically every 5 minutes when `startCleanup()` has
been invoked. Manual calls are typically not needed.

**Example:**

```typescript
// Manual cleanup (rarely needed)
PermissionCache.cleanup();
```

### getStats(): CacheStats

Get cache statistics.

**Returns:**

```typescript
{
  userCacheSize: number,      // Number of cached users
  roleCacheSize: number,      // Number of cached roles
  totalSize: number           // Total entries
}
```

**Example:**

```typescript
const stats = PermissionCache.getStats();
console.log(`Cache contains ${stats.userCacheSize} users`);
```

### startCleanup(): void

Start automatic cleanup interval (called on server start).

**Behavior:**

- Runs cleanup every 5 minutes
- Idempotent (won't start multiple intervals)
- Logs startup message

**Example:**

```typescript
// In server.ts
await PermissionCache.startCleanup();
```

### stopCleanup(): void

Stop automatic cleanup interval (called on server shutdown).

**Behavior:**

- Clears interval if running
- Idempotent (safe to call multiple times)
- Logs shutdown message

**Example:**

```typescript
// In graceful shutdown
process.on('SIGTERM', () => {
  PermissionCache.stopCleanup();
  process.exit(0);
});
```

## Integration Points

### AuthService Integration

**Location:** `backend/src/services/AuthService.ts`

```typescript
private getUserPermissions(userId: number): string[] {
  // Try cache first
  const cached = PermissionCache.getUserPermissions(userId);
  if (cached !== null) {
    return cached;
  }

  // Cache miss - query database
  const permissions = UserDatabaseService.all(
    `SELECT DISTINCT p.name FROM permissions p
     JOIN role_permissions rp ON p.id = rp.permission_id
     JOIN users u ON u.role_id = rp.role_id
     WHERE u.id = ?`,
    [userId]
  );

  const permissionNames = permissions.map(p => p.name);

  // Cache result
  PermissionCache.setUserPermissions(userId, permissionNames);

  return permissionNames;
}
```

### RoleService Integration

**Location:** `backend/src/services/RoleService.ts`

```typescript
async updateRolePermissions(roleId: number, permissionIds: number[]): Promise<void> {
  // ... update logic ...

  // Invalidate cache for this role
  PermissionCache.invalidateRole(roleId);
  logger.info(`[RoleService] Role ${roleId} permissions updated, cache invalidated`);
}
```

### UserService Integration

**Location:** `backend/src/services/UserService.ts`

```typescript
async updateUser(id: number, data: UpdateUserData): Promise<User> {
  // ... update logic ...

  // Invalidate cache if role changed
  if (data.roleId !== undefined) {
    PermissionCache.invalidateUser(id);
    logger.info(`[UserService] User ${id} role changed, cache invalidated`);
  }

  return updatedUser;
}
```

### Server Lifecycle Integration

**Location:** `backend/src/server.ts`

```typescript
async function startServer() {
  // ... initialization ...

  // Start permission cache cleanup
  PermissionCache.startCleanup();
  logger.info('✅ Permission cache initialized');

  // ... start server ...

  // Graceful shutdown
  const shutdown = () => {
    logger.info('Shutting down gracefully...');
    PermissionCache.stopCleanup();
    // ... other cleanup ...
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
```

## Cache Management Endpoints

### GET /\_cache/permissions/stats

**Admin only** - Get cache statistics.

**Response:**

```json
{
  "userCacheSize": 42,
  "roleCacheSize": 3,
  "totalSize": 45,
  "description": {
    "userCacheSize": "Number of cached user permissions",
    "roleCacheSize": "Number of cached role permissions",
    "totalSize": "Total cached entries",
    "ttl": {
      "userPermissions": "5 minutes",
      "rolePermissions": "10 minutes"
    }
  }
}
```

### POST /\_cache/permissions/clear

**Admin only** - Clear permission cache.

**Request Body:**

```json
{
  "type": "user",
  "id": 5
}
```

**Options:**

- `{ "type": "user", "id": 5 }` - Clear user 5's cache
- `{ "type": "role", "id": 2 }` - Clear role 2's cache
- `{ "type": "all" }` - Clear all caches

## Monitoring and Debugging

### Logging

**Cache Hits:**

```
[PermissionCache] Cache HIT for user 5
```

**Cache Invalidation:**

```
[PermissionCache] Invalidated cache for user 5
[PermissionCache] Invalidated cache for role 2
```

**Cleanup:**

```
[PermissionCache] Cleanup interval started
[PermissionCache] Cleanup removed 15 expired entries
[PermissionCache] Cleanup interval stopped
```

### Metrics to Monitor

**Cache Hit Rate:**

```typescript
const hitRate = (cacheHits / totalRequests) * 100;
// Target: >90%
```

**Cache Size:**

```typescript
const stats = PermissionCache.getStats();
// Monitor for unbounded growth
// Expected: ~equal to active user count
```

**Permission Lookup Time:**

```typescript
// Before caching: 50-100ms
// After caching: 1-5ms
// Target improvement: >90% reduction
```

## Best Practices

### Cache Invalidation

**✅ DO:**

- Invalidate user cache when user role changes
- Invalidate role cache when role permissions change
- Clear all caches after bulk permission updates
- Use manual invalidation for critical changes

**❌ DON'T:**

- Rely on cache for real-time permission revocation (up to 5-minute delay)
- Skip invalidation after permission changes
- Invalidate unnecessarily (wastes CPU)

### Performance Tuning

**Adjust TTL:**

```typescript
// Lower TTL for stricter security (more DB queries)
private static readonly USER_PERMISSIONS_TTL = 1 * 60 * 1000; // 1 minute

// Higher TTL for better performance (longer update delay)
private static readonly USER_PERMISSIONS_TTL = 15 * 60 * 1000; // 15 minutes
```

**Cleanup Interval:**

```typescript
// More frequent cleanup (lower memory, higher CPU)
setInterval(() => this.cleanup(), 1 * 60 * 1000); // 1 minute

// Less frequent cleanup (higher memory, lower CPU)
setInterval(() => this.cleanup(), 10 * 60 * 1000); // 10 minutes
```

### Security Considerations

**Cache Timing:**

- Permission changes may take up to 5 minutes to propagate
- For immediate revocation, manually clear cache
- Critical operations should clear cache automatically

**Cache Poisoning:**

- Cache only stores permission strings (low risk)
- No user input stored in cache
- Cache automatically expires

**Memory Limits:**

- In-memory cache grows with user count
- Automatic cleanup prevents unbounded growth
- Monitor cache size in production

## Troubleshooting

### Permissions Not Updating

**Symptom:** User's permissions don't reflect recent changes

**Causes:**

1. Cache not invalidated after permission change
2. TTL hasn't expired yet (up to 5 minutes)

**Solutions:**

```bash
# Manually clear user's cache
curl -X POST http://localhost:3100/_cache/permissions/clear \
  -H "Authorization: Bearer {admin_token}" \
  -d '{"type": "user", "id": 5}'

# Or clear all caches
curl -X POST http://localhost:3100/_cache/permissions/clear \
  -H "Authorization: Bearer {admin_token}" \
  -d '{"type": "all"}'
```

### High Memory Usage

**Symptom:** Server memory usage increasing over time

**Causes:**

1. Cleanup interval not running
2. Too many unique users
3. TTL too long

**Solutions:**

```typescript
// Check cleanup is running
PermissionCache.getStats(); // Should show reasonable size

// Verify cleanup interval
// Should see cleanup logs every 5 minutes

// Reduce TTL if needed
private static readonly USER_PERMISSIONS_TTL = 2 * 60 * 1000; // 2 minutes
```

### Cache Misses

**Symptom:** Low cache hit rate (<50%)

**Causes:**

1. TTL too short
2. Frequent permission changes
3. Users not making repeated requests

**Solutions:**

```typescript
// Increase TTL
private static readonly USER_PERMISSIONS_TTL = 10 * 60 * 1000; // 10 minutes

// Check if permissions are changing frequently
// Review invalidation logs
```

## Future Enhancements

### Potential Improvements

1. **Redis Backend:**
   - Distributed caching across multiple instances
   - Persistent cache across restarts
   - Shared cache for horizontal scaling

2. **Cache Warming:**
   - Pre-populate cache on server start
   - Load frequently accessed permissions
   - Reduce initial cache miss rate

3. **Metrics Dashboard:**
   - Real-time cache hit rate
   - Cache size over time
   - Invalidation frequency

4. **Adaptive TTL:**
   - Shorter TTL for frequently changing permissions
   - Longer TTL for stable permissions
   - Smart invalidation based on change patterns

5. **Cache Tags:**
   - Tag cache entries by resource
   - Invalidate by tag (e.g., all users with role X)
   - More granular invalidation

## Related Documentation

- [Authentication & Authorization](../../10-features/01-authentication-authorization.md)
- [Role-Based Access Control](../../10-features/07-role-permissions.md)
- [Backend Architecture](../architecture.md)
- [Security Considerations](../../09-deployment/security-considerations.md)
