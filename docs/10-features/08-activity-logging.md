# Activity Logging & Audit Trail

## Overview

Activity logging automatically tracks user actions throughout the application.
Every significant operation is logged with details including the user, action
type, resource affected, timestamp, IP address, and user agent for security
monitoring, troubleshooting, and compliance.

## Architecture

**Backend Components:**

- `ActivityService`: Activity logging operations
- Activity routes (routes/activities.ts): REST API
- `UserDatabaseService`: Database operations
- Activity logger middleware (middleware/activityLogger.ts)

**Frontend Components:**

- `ActivitiesView`: Main activity log viewer
- `ActivityTable`: Activity list with filters

## Database Schema

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

CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_action ON activity_logs(action);
CREATE INDEX idx_activity_logs_resource ON activity_logs(resource);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);
```

**Key Fields:**

- `user_id`: Reference to users table (NULL if user deleted)
- `username`: Username at time of action (preserved)
- `action`: Type of action (login, create, update, delete, etc.)
- `resource`: Type of resource affected (users, roles, games, etc.)
- `resource_id`: Specific ID of affected resource
- `details`: Optional JSON with additional context
- `ip_address`: Client IP address
- `user_agent`: Browser/client user agent string

## API Endpoints

#### GET /api/activities

Get activity logs with pagination and filters.

**Permission:** activities.read

**Query Parameters:**

- `page` - Page number (default: 1)
- `limit` - Items per page (default: 50)
- `userId` - Filter by user ID
- `username` - Filter by username (partial match)
- `action` - Filter by action type
- `resource` - Filter by resource type
- `startDate` - Filter by start date (ISO 8601)
- `endDate` - Filter by end date (ISO 8601)

**Response:**

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
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0...",
      "createdAt": "2024-03-21T10:30:45.123Z"
    }
  ],
  "total": 1543,
  "page": 1,
  "limit": 50,
  "totalPages": 31
}
```

## Logged Actions

**Authentication:**

- `login` - User login
- `logout` - User logout
- `register` - New user registration
- `auth.refresh` - Token refresh

**User Management:**

- `users.create` - Create new user
- `users.update` - Update user information
- `users.delete` - Delete user
- `users.updateSettings` - Update user settings

**Role Management:**

- `roles.create` - Create new role
- `roles.update` - Update role metadata
- `roles.update_permissions` - Update role permissions
- `roles.delete` - Delete role

**Game Actions:**

- `games.view` - View game details
- `play.start` - Start play session
- `play.end` - End play session

## Logging Middleware

```typescript
export const logActivity = (action: string, resource?: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalEnd = res.end;

    res.end = function (this: Response, ...args: any[]): Response {
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
            userAgent: req.headers['user-agent'],
          });
        } catch (error) {
          console.error('Failed to log activity:', error);
        }
      });

      return originalEnd.apply(this, args as any);
    };

    next();
  };
};
```

**Usage in Routes:**

```typescript
router.post(
  '/',
  authenticate,
  requirePermission('users.create'),
  logActivity('users.create', 'users'),
  async (req, res) => {
    const user = await userService.createUser(req.body);
    res.status(201).json(user);
  }
);
```

## Permissions

Activity log operations require:

- `activities.read` - View activity logs

**Default Assignments:**

- **Admin:** activities.read
- **User:** None
- **Guest:** None

## Security Considerations

**Data Retention:**

- Activity logs stored indefinitely by default
- Consider implementing data retention policy
- Archive old logs to separate table/database
- Implement automated cleanup (> 1 year old)

**Sensitive Information:**

- User agent strings may contain version info
- IP addresses are personally identifiable
- Details field may contain sensitive data
- Consider masking/hashing sensitive fields

**Privacy Compliance:**

- GDPR considerations for user data
- Right to be forgotten (delete user activities)
- Data minimization (only log necessary info)
- Purpose limitation (security/audit only)

**Access Control:**

- Strict permission checks (activities.read)
- Only admins should access logs
- Audit log access itself (who viewed logs)

## Best Practices

1. Log strategically - focus on significant actions
2. Use async logging to avoid blocking requests
3. Log failures shouldn't break app functionality
4. Use JSON in details field for complex data
5. Ensure queries are efficient with indexes
6. Always paginate results
7. Provide comprehensive filter options
8. Comply with data protection regulations
9. Implement data retention policies
10. Monitor log growth and performance

## Common Use Cases

### 1. View All Activities

```typescript
const { data: activities } = useQuery({
  queryKey: ['activities', page],
  queryFn: () =>
    api
      .get('/activities', {
        params: { page, limit: 50 },
      })
      .then((res) => res.data),
});
```

### 2. Filter by User

```typescript
const { data: activities } = useQuery({
  queryKey: ['activities', { userId }],
  queryFn: () =>
    api
      .get('/activities', {
        params: { userId, page: 1, limit: 50 },
      })
      .then((res) => res.data),
});
```

### 3. Filter by Date Range

```typescript
const startDate = '2024-03-01T00:00:00.000Z';
const endDate = '2024-03-31T23:59:59.999Z';

const { data: activities } = useQuery({
  queryKey: ['activities', { startDate, endDate }],
  queryFn: () =>
    api
      .get('/activities', {
        params: { startDate, endDate, page: 1, limit: 50 },
      })
      .then((res) => res.data),
});
```

## Troubleshooting

**Logs not appearing:**

- Check if middleware is applied to route
- Verify activityService.log() is called
- Look for errors in console/logs
- Ensure database write permissions
- Check if logging is async (setImmediate)

**Slow log queries:**

- Verify indexes exist on filtered columns
- Limit result set with pagination
- Avoid querying large date ranges
- Consider archiving old logs
- Check database performance

**Missing log data:**

- Verify all required fields provided
- Check for NULL constraints
- Ensure user context available
- Validate IP address extraction
- Check user agent header

**Duplicate logs:**

- Ensure middleware not applied twice
- Check for manual + automatic logging
- Verify setImmediate usage
- Look for double route definitions
