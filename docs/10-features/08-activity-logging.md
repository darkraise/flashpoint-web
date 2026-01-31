# Activity Logging & Audit Trail

## Overview

The activity logging feature provides comprehensive audit trail capabilities by automatically tracking user actions throughout the application. Every significant operation is logged with details including the user, action type, resource affected, timestamp, IP address, and user agent. Administrators can view, filter, and analyze activity logs for security monitoring, troubleshooting, and compliance purposes.

## User-Facing Functionality

### View Activity Logs
- **Activity Table:**
  - Chronological list of all activities
  - User information (username, ID)
  - Action type (login, create, update, delete, etc.)
  - Resource type (users, games, playlists, roles, etc.)
  - Resource ID (specific item affected)
  - Timestamp (precise date and time)
  - IP address
  - User agent (browser/device info)
  - Pagination support (50 items per page)

### Filter Activities
- **Filter by User:**
  - Select specific user
  - View all actions by that user
  - Combine with other filters

- **Filter by Action:**
  - login, logout, register
  - create, update, delete operations
  - play, view actions
  - Custom action types

- **Filter by Resource:**
  - users, roles, permissions
  - games, playlists
  - settings
  - auth operations

- **Filter by Date Range:**
  - Start date
  - End date
  - Predefined ranges (today, week, month)

- **Filter by Username:**
  - Search by username
  - Partial match support

### Activity Details
- **Detailed View:**
  - Full activity record
  - Complete user agent string
  - Request details (future)
  - Response status (future)
  - Related activities (future)

### Export Activities (Future)
- Export to CSV
- Export to JSON
- Custom date ranges
- Filtered exports

## Technical Implementation

### Architecture

**Backend Components:**
- `ActivityService`: Activity logging operations
- Activity routes (routes/activities.ts): REST API
- `UserDatabaseService`: Database operations
- Activity logger middleware (middleware/activityLogger.ts)
- Automatic logging on key operations

**Frontend Components:**
- `ActivitiesView`: Main activity log viewer
- `ActivityTable`: Activity list with filters
- `useActivities` hook: Activity operations

### Database Schema

**activity_logs table:**
```sql
CREATE TABLE activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  username TEXT,
  action TEXT NOT NULL,
  resource TEXT,
  resource_id TEXT,
  details TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for efficient querying
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_action ON activity_logs(action);
CREATE INDEX idx_activity_logs_resource ON activity_logs(resource);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);
```

**Key Fields:**
- `user_id`: Reference to users table (NULL if user deleted)
- `username`: Username at time of action (preserved even if user deleted)
- `action`: Type of action performed (login, create, update, delete, etc.)
- `resource`: Type of resource affected (users, roles, games, etc.)
- `resource_id`: Specific ID of affected resource
- `details`: Optional JSON string with additional context
- `ip_address`: Client IP address
- `user_agent`: Browser/client user agent string
- `created_at`: Timestamp of action

### API Endpoints

#### GET /api/activities
Get activity logs with pagination and filters.

**Authentication:** Required
**Permission:** activities.read

**Query Parameters:**
```typescript
{
  page?: number;        // Page number (default: 1)
  limit?: number;       // Items per page (default: 50)
  userId?: number;      // Filter by user ID
  username?: string;    // Filter by username (partial match)
  action?: string;      // Filter by action type
  resource?: string;    // Filter by resource type
  startDate?: string;   // Filter by start date (ISO 8601)
  endDate?: string;     // Filter by end date (ISO 8601)
}
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": 1234,
      "userId": 1,
      "username": "admin",
      "action": "login",
      "resource": "auth",
      "resourceId": null,
      "details": null,
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...",
      "createdAt": "2024-03-21T10:30:45.123Z"
    },
    {
      "id": 1235,
      "userId": 1,
      "username": "admin",
      "action": "users.create",
      "resource": "users",
      "resourceId": "10",
      "details": "{\"username\":\"newuser\",\"roleId\":2}",
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...",
      "createdAt": "2024-03-21T10:35:12.456Z"
    }
    // ... more activities
  ],
  "total": 1543,
  "page": 1,
  "limit": 50,
  "totalPages": 31
}
```

**Errors:**
- 401: Not authenticated
- 403: Missing activities.read permission

### Activity Logging Middleware

**Automatic Logging:**

```typescript
// middleware/activityLogger.ts
export const logActivity = (action: string, resource?: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original res.end function
    const originalEnd = res.end;

    // Override res.end to log after response
    res.end = function(this: Response, ...args: any[]): Response {
      // Log activity asynchronously (non-blocking)
      setImmediate(async () => {
        try {
          const resourceId = req.params.id || req.body?.id;

          await activityService.log({
            userId: req.user?.id,
            username: req.user?.username,
            action,
            resource,
            resourceId,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
          });
        } catch (error) {
          // Log error but don't fail request
          console.error('Failed to log activity:', error);
        }
      });

      // Call original end function
      return originalEnd.apply(this, args as any);
    };

    next();
  };
};
```

**Usage in Routes:**

```typescript
// User routes
router.post('/',
  authenticate,
  requirePermission('users.create'),
  logActivity('users.create', 'users'),  // Automatic logging
  async (req, res) => {
    const user = await userService.createUser(req.body);
    res.status(201).json(user);
  }
);

router.patch('/:id',
  authenticate,
  requirePermission('users.update'),
  logActivity('users.update', 'users'),  // Automatic logging
  async (req, res) => {
    const user = await userService.updateUser(req.params.id, req.body);
    res.json(user);
  }
);

router.delete('/:id',
  authenticate,
  requirePermission('users.delete'),
  logActivity('users.delete', 'users'),  // Automatic logging
  async (req, res) => {
    await userService.deleteUser(req.params.id);
    res.json({ success: true });
  }
);
```

**Manual Logging (in services):**

```typescript
// AuthService - Manual logging for special cases
async login(credentials: LoginCredentials, ipAddress: string) {
  const result = await this.authenticateUser(credentials);

  // Log successful login
  await activityService.log({
    userId: result.user.id,
    username: result.user.username,
    action: 'login',
    resource: 'auth',
    ipAddress,
    userAgent: req.headers['user-agent']
  });

  return result;
}

async register(data: RegisterData) {
  const result = await this.createUser(data);

  // Log registration
  await activityService.log({
    userId: result.user.id,
    username: result.user.username,
    action: 'register',
    resource: 'auth',
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });

  return result;
}
```

### ActivityService Implementation

```typescript
export class ActivityService {
  /**
   * Log an activity
   */
  async log(data: {
    userId?: number;
    username?: string;
    action: string;
    resource?: string;
    resourceId?: string;
    details?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    try {
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
          data.details || null,
          data.ipAddress || null,
          data.userAgent || null
        ]
      );
    } catch (error) {
      logger.error('Failed to log activity:', error);
      // Don't throw - logging failure shouldn't break app
    }
  }

  /**
   * Get activity logs with filters
   */
  async getLogs(
    page: number,
    limit: number,
    filters: {
      userId?: number;
      username?: string;
      action?: string;
      resource?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<PaginatedResult<ActivityLog>> {
    const offset = (page - 1) * limit;

    // Build WHERE clause dynamically
    const conditions: string[] = [];
    const params: any[] = [];

    if (filters.userId !== undefined) {
      conditions.push('user_id = ?');
      params.push(filters.userId);
    }

    if (filters.username) {
      conditions.push('username LIKE ?');
      params.push(`%${filters.username}%`);
    }

    if (filters.action) {
      conditions.push('action = ?');
      params.push(filters.action);
    }

    if (filters.resource) {
      conditions.push('resource = ?');
      params.push(filters.resource);
    }

    if (filters.startDate) {
      conditions.push('created_at >= ?');
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      conditions.push('created_at <= ?');
      params.push(filters.endDate);
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    // Get total count
    const countResult = UserDatabaseService.get(
      `SELECT COUNT(*) as count FROM activity_logs ${whereClause}`,
      params
    );

    // Get paginated results
    const logs = UserDatabaseService.all(
      `SELECT * FROM activity_logs
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return {
      data: logs,
      total: countResult.count,
      page,
      limit,
      totalPages: Math.ceil(countResult.count / limit)
    };
  }
}
```

## Logged Actions

### Authentication Actions
- `login` - User login
- `logout` - User logout
- `register` - New user registration
- `auth.refresh` - Token refresh

### User Management Actions
- `users.list` - View user list
- `users.view` - View user details
- `users.create` - Create new user
- `users.update` - Update user information
- `users.delete` - Delete user
- `users.updateTheme` - Change theme settings
- `users.updateSettings` - Update user settings

### Role Management Actions
- `roles.list` - View roles list
- `roles.view` - View role details
- `roles.create` - Create new role
- `roles.update` - Update role metadata
- `roles.update_permissions` - Update role permissions
- `roles.delete` - Delete role

### Playlist Actions (Future)
- `playlists.create` - Create playlist
- `playlists.update` - Update playlist
- `playlists.delete` - Delete playlist
- `playlists.add_games` - Add games to playlist
- `playlists.remove_games` - Remove games from playlist

### Game Actions
- `games.view` - View game details
- `play.start` - Start play session
- `play.end` - End play session

## UI Components

### ActivitiesView
**Location:** `frontend/src/views/ActivitiesView.tsx`

**Features:**
- Activity table with pagination
- Filter controls
- Real-time updates (future)
- Export functionality (future)
- Search capabilities

### ActivityTable
**Location:** `frontend/src/components/activities/ActivityTable.tsx`

**Features:**
- Sortable columns
- Action badges (color-coded)
- Resource type icons
- User links (navigate to user details)
- Timestamp formatting
- IP address display
- User agent tooltip

**Column Structure:**
- ID (numeric)
- Timestamp (formatted date/time)
- User (username with link)
- Action (badge with icon)
- Resource (type + ID)
- IP Address
- User Agent (truncated with tooltip)

## Common Use Cases

### 1. View All Activities
```typescript
const { data: activities } = useQuery({
  queryKey: ['activities', page],
  queryFn: () => api.get('/activities', {
    params: {
      page,
      limit: 50
    }
  }).then(res => res.data)
});

// Displays paginated activity log
```

### 2. Filter by User
```typescript
const { data: activities } = useQuery({
  queryKey: ['activities', { userId }],
  queryFn: () => api.get('/activities', {
    params: {
      userId,
      page: 1,
      limit: 50
    }
  }).then(res => res.data)
});

// Shows all activities by specific user
```

### 3. Filter by Action Type
```typescript
const { data: logins } = useQuery({
  queryKey: ['activities', { action: 'login' }],
  queryFn: () => api.get('/activities', {
    params: {
      action: 'login',
      page: 1,
      limit: 50
    }
  }).then(res => res.data)
});

// Shows only login activities
```

### 4. Filter by Date Range
```typescript
const startDate = '2024-03-01T00:00:00.000Z';
const endDate = '2024-03-31T23:59:59.999Z';

const { data: activities } = useQuery({
  queryKey: ['activities', { startDate, endDate }],
  queryFn: () => api.get('/activities', {
    params: {
      startDate,
      endDate,
      page: 1,
      limit: 50
    }
  }).then(res => res.data)
});

// Shows activities within date range
```

### 5. Monitor User Actions
```typescript
// View all actions by specific user
const { data: userActivities } = useQuery({
  queryKey: ['activities', { username: 'admin' }],
  queryFn: () => api.get('/activities', {
    params: {
      username: 'admin',
      page: 1,
      limit: 100
    }
  }).then(res => res.data)
});

// Audit trail for specific user
```

### 6. Track Resource Changes
```typescript
// View all changes to users resource
const { data: userChanges } = useQuery({
  queryKey: ['activities', { resource: 'users' }],
  queryFn: () => api.get('/activities', {
    params: {
      resource: 'users',
      page: 1,
      limit: 50
    }
  }).then(res => res.data)
});

// Shows create, update, delete operations on users
```

## Permissions

Activity log operations require specific permissions:

- `activities.read` - View activity logs

**Default Permission Assignments:**
- **Admin:** activities.read
- **User:** None (cannot view logs)
- **Guest:** None

## Security Considerations

### Data Retention
- Activity logs stored indefinitely by default
- Consider implementing data retention policy
- Archive old logs to separate table/database
- Implement automated cleanup (e.g., > 1 year old)

### Sensitive Information
- User agent strings may contain version info
- IP addresses are personally identifiable
- Details field may contain sensitive data
- Consider masking/hashing sensitive fields

### Privacy Compliance
- GDPR considerations for user data
- Right to be forgotten (delete user activities)
- Data minimization (only log necessary info)
- Purpose limitation (security/audit only)

### Access Control
- Strict permission checks (activities.read)
- Only admins should access logs
- Implement role-based filtering (users see own logs)
- Audit log access itself (who viewed logs)

## Best Practices

1. **Log Strategically:** Don't log every API call, focus on significant actions
2. **Async Logging:** Use setImmediate to avoid blocking requests
3. **Error Handling:** Log failures shouldn't break app functionality
4. **Structured Data:** Use JSON in details field for complex data
5. **Index Properly:** Ensure queries are efficient with indexes
6. **Pagination:** Always paginate results, never fetch all logs
7. **Filtering:** Provide comprehensive filter options
8. **Privacy:** Comply with data protection regulations
9. **Retention:** Implement data retention policies
10. **Monitoring:** Monitor log growth and performance

## Troubleshooting

### Logs not appearing
- Check if middleware is applied to route
- Verify activityService.log() is called
- Look for errors in console/logs
- Ensure database write permissions
- Check if logging is async (setImmediate)

### Slow log queries
- Verify indexes exist on filtered columns
- Limit result set with pagination
- Avoid querying large date ranges
- Consider archiving old logs
- Check database performance

### Missing log data
- Verify all required fields provided
- Check for NULL constraints
- Ensure user context available
- Validate IP address extraction
- Check user agent header

### Duplicate logs
- Ensure middleware not applied twice
- Check for manual + automatic logging
- Verify setImmediate usage
- Look for double route definitions

## Future Enhancements

- Real-time activity stream (WebSocket)
- Activity search (full-text)
- Export to CSV/JSON
- Activity analytics dashboard
- Suspicious activity alerts
- Activity replay/reconstruction
- Automated log rotation
- Log aggregation (multiple instances)
- Integration with SIEM systems
- Compliance reporting tools
- User activity timeline visualization
- Comparative activity analysis
- Anomaly detection
- Activity-based recommendations
- Audit log signing (tamper-proof)
