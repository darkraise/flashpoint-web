# Backend Architecture

This document describes the architectural patterns and design decisions used in the Flashpoint Web backend service.

## Architecture Overview

The backend follows a **service layer pattern** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                        HTTP Layer                            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Routes (Express Router)                              │  │
│  │  - Handle HTTP requests/responses                     │  │
│  │  - Input validation                                   │  │
│  │  - Response formatting                                │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     Middleware Layer                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  - Authentication (JWT verification)                  │  │
│  │  - Authorization (RBAC permission checking)           │  │
│  │  - Activity logging                                   │  │
│  │  - Error handling                                     │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Service Layer                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Business Logic Services                              │  │
│  │  - AuthService, UserService, GameService              │  │
│  │  - RoleService, PlayTrackingService                   │  │
│  │  - Transaction management                             │  │
│  │  - Business rule enforcement                          │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Data Access Layer                           │
│  ┌──────────────────────┐      ┌───────────────────────┐    │
│  │  DatabaseService     │      │ UserDatabaseService   │    │
│  │  (flashpoint.sqlite) │      │ (user.db)             │    │
│  │  - Read-only         │      │ - Read/Write          │    │
│  │  - Hot-reload        │      │ - Migrations          │    │
│  └──────────────────────┘      └───────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Design Patterns

### 1. Service Layer Pattern

**Purpose**: Separate business logic from HTTP handling.

**Implementation**:
- Routes handle HTTP concerns (parsing, validation, formatting)
- Services contain business logic and database operations
- Services are reusable across multiple routes
- Services can call other services

**Example**:
```typescript
// Route (routes/users.ts)
router.get('/', authenticate, async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const users = await userService.getUsers(page, 50);
  res.json(users);
});

// Service (services/UserService.ts)
async getUsers(page: number, limit: number) {
  // Business logic
  const offset = (page - 1) * limit;
  const users = UserDatabaseService.all(
    'SELECT * FROM users LIMIT ? OFFSET ?',
    [limit, offset]
  );
  return users;
}
```

### 2. Singleton Pattern

**Purpose**: Single database connection per process.

**Implementation**:
- `DatabaseService` and `UserDatabaseService` use static methods
- Database connection created once on initialization
- Shared across all requests

**Example**:
```typescript
export class DatabaseService {
  private static db: BetterSqlite3.Database | null = null;

  static async initialize(): Promise<void> {
    this.db = new BetterSqlite3(config.flashpointDbPath);
  }

  static getDatabase(): BetterSqlite3.Database {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }
}
```

### 3. Middleware Chain Pattern

**Purpose**: Composable request processing.

**Implementation**:
- Each middleware handles one concern
- Middleware can short-circuit the chain
- Order matters (auth before RBAC)

**Example**:
```typescript
router.post('/users',
  authenticate,              // Verify JWT token
  requirePermission('users.create'),  // Check permission
  logActivity('create', 'users'),     // Log activity
  async (req, res) => {      // Route handler
    // Handle request
  }
);
```

### 4. Repository Pattern (via Database Services)

**Purpose**: Abstract data access from business logic.

**Implementation**:
- Database services provide query methods
- Services use database services, not raw SQL
- Centralized query logic

**Example**:
```typescript
// Instead of writing SQL in services:
const user = UserDatabaseService.get(
  'SELECT * FROM users WHERE id = ?',
  [userId]
);

// Database service handles connection, error handling, logging
```

### 5. Observer Pattern (File Watching)

**Purpose**: React to external database changes.

**Implementation**:
- `DatabaseService` watches flashpoint.sqlite for changes
- Debounced reload (500ms) prevents excessive reloads
- Hot-reload without server restart

**Example**:
```typescript
private static startWatching(): void {
  this.watcher = fs.watch(config.flashpointDbPath, (eventType) => {
    if (eventType === 'change') {
      if (this.reloadTimeout) {
        clearTimeout(this.reloadTimeout);
      }
      this.reloadTimeout = setTimeout(() => {
        this.reloadFromDisk();
      }, 500);
    }
  });
}
```

## Architectural Decisions

### 1. Two-Database Architecture

**Decision**: Use separate databases for Flashpoint data and user data.

**Rationale**:
- Flashpoint database is managed by external Launcher
- Prevents conflicts from simultaneous writes
- User data needs different schema and write access
- Clear separation of concerns

**Trade-offs**:
- Cannot use foreign keys between databases
- Need to sync game IDs manually
- More complex backup strategy

### 2. Synchronous Database Access

**Decision**: Use `better-sqlite3` (synchronous) instead of async alternatives.

**Rationale**:
- SQLite is single-threaded; async provides no benefit
- Synchronous code is simpler and more readable
- Better performance for SQLite workloads
- No callback/promise overhead

**Trade-offs**:
- Blocks event loop during queries (acceptable for SQLite)
- Not suitable for network databases (PostgreSQL, MySQL)

### 3. JWT-Based Authentication

**Decision**: Use JWT tokens instead of session cookies.

**Rationale**:
- Stateless authentication (no session storage)
- Works well with separate frontend/backend
- Easy to scale horizontally
- Mobile-friendly

**Trade-offs**:
- Cannot invalidate tokens before expiration
- Token size larger than session ID
- Need refresh token mechanism

**Implementation**:
```typescript
// Access token (short-lived, 1 hour)
const accessToken = jwt.sign(
  { userId, username, role },
  config.jwtSecret,
  { expiresIn: '1h' }
);

// Refresh token (long-lived, 30 days, stored in DB)
const refreshToken = randomBytes(32).toString('hex');
```

### 4. RBAC over ACL

**Decision**: Role-Based Access Control instead of Access Control Lists.

**Rationale**:
- Easier to manage permissions for groups of users
- Standard pattern for most applications
- Simpler permission checks
- Sufficient granularity for this application

**Trade-offs**:
- Less flexible than per-user permissions
- Cannot easily grant user-specific permissions

### 5. Activity Logging

**Decision**: Log all user actions to database.

**Rationale**:
- Audit trail for security
- User behavior analytics
- Debugging user issues
- Compliance requirements

**Implementation**:
- Non-blocking (setImmediate)
- Automatic cleanup (90-day retention)
- Filterable by user, action, resource

### 6. Play Session Tracking

**Decision**: Track individual play sessions, then aggregate.

**Rationale**:
- Detailed play history per user
- Can calculate accurate statistics
- Support for session duration
- Abandoned session detection

**Schema**:
```sql
-- Individual sessions
user_game_plays (session_id, user_id, game_id, started_at, ended_at)

-- Aggregated stats
user_game_stats (user_id, game_id, total_plays, total_playtime)
user_stats (user_id, total_games_played, total_playtime)
```

## Error Handling Strategy

### AppError Class

Custom error class for operational errors:

```typescript
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
  }
}
```

### Error Handling Flow

```
1. Error thrown in service/route
2. Caught by Express error middleware
3. Logged with Winston
4. Formatted as JSON response
5. Sent to client with appropriate status code
```

### Error Categories

- **400 Bad Request**: Invalid input
- **401 Unauthorized**: Authentication failed
- **403 Forbidden**: Permission denied
- **404 Not Found**: Resource not found
- **409 Conflict**: Duplicate resource
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Unexpected errors

## Database Architecture

### Connection Management

**Flashpoint Database**:
- Single connection per process
- Read-only mode disabled to allow play stat updates
- File watcher for hot-reload
- Automatic reconnection on file change

**User Database**:
- Single connection per process
- Full read/write access
- Foreign key enforcement enabled
- Schema migrations on startup

### Transaction Strategy

```typescript
// User database supports transactions
const db = UserDatabaseService.getDatabase();
const transaction = db.transaction(() => {
  // Multiple operations
  UserDatabaseService.run('INSERT INTO users ...');
  UserDatabaseService.run('INSERT INTO user_stats ...');
});

transaction(); // Execute atomically
```

### Query Optimization

1. **Indexes**: All foreign keys and frequently queried columns
2. **Pagination**: Limit results to prevent memory issues
3. **Prepared Statements**: Reusable for better performance
4. **Selective Columns**: Only query needed columns

## Security Architecture

### Authentication Flow

```
1. User sends credentials to /api/auth/login
2. AuthService verifies password (bcrypt)
3. Generate access token (JWT, 1h expiry)
4. Generate refresh token (random, 30d expiry)
5. Store refresh token in database
6. Return both tokens to client
```

### Authorization Flow

```
1. Client sends request with Authorization header
2. Auth middleware verifies JWT token
3. Extract user info from token payload
4. Load user permissions from database
5. RBAC middleware checks required permission
6. Allow or deny request
```

### Password Security

- **Hashing**: bcrypt with 10 rounds
- **Salt**: Automatic per-password salt
- **Validation**: Password strength not enforced (can be added)
- **Reset**: Not implemented (can be added with email)

### Login Protection

- **Attempt Tracking**: Log all login attempts
- **Rate Limiting**: 5 failed attempts per 15 minutes
- **IP-Based**: Track by username and IP address
- **Automatic Cleanup**: Remove attempts older than 24 hours

## Performance Considerations

### Database Performance

- **Better-sqlite3**: Faster than async alternatives for SQLite
- **Connection Reuse**: Single connection per process
- **Prepared Statements**: Cached and reused
- **Indexes**: Comprehensive indexing strategy

### Response Time Targets

- Game search: < 100ms (p95)
- Game details: < 50ms (p95)
- User operations: < 200ms (p95, includes bcrypt)
- Play tracking: < 50ms (p95)

### Caching Strategy

**Currently Implemented:**
- **Permission Caching** (PermissionCache service):
  - In-memory cache for user and role permissions
  - User permissions: 5-minute TTL
  - Role permissions: 10-minute TTL
  - Automatic cleanup every 5 minutes
  - Automatic invalidation on permission changes
  - 90%+ reduction in permission queries
  - Admin endpoints for cache management and statistics

**Future Recommendations:**
- Redis for distributed session storage
- Cache game metadata queries
- Cache filter options (platforms, tags)
- Cache frequently accessed game details

### Scalability

**Current limitations**:
- Single process (SQLite limitation)
- Single database file per instance
- File-based database

**Scaling options**:
- Read replicas for user.db
- Separate game-service instances
- CDN for static assets
- Horizontal scaling of read-only operations

## Monitoring and Observability

### Logging

Winston logger with structured logging:
```typescript
logger.info('User logged in', {
  userId: user.id,
  username: user.username,
  ipAddress: req.ip
});
```

### Activity Logs

Database-backed activity logging:
- All user actions logged
- IP address and user agent captured
- Queryable for analytics
- Automatic retention policy

### Health Checks

`/health` endpoint returns:
- Server status
- Database connection status
- Flashpoint path
- Game service URL
- Timestamp

## Extension Points

### Adding New Permissions

1. Insert into `permissions` table
2. Assign to roles via `role_permissions`
3. Use `requirePermission()` in routes

### Adding New Services

1. Create service class in `src/services/`
2. Implement business logic methods
3. Use database services for data access
4. Export and use in routes

### Adding Middleware

1. Create middleware function in `src/middleware/`
2. Export function
3. Apply to routes or globally

### Database Migrations

1. Create SQL file in `src/migrations/`
2. Add migration logic to `UserDatabaseService.runMigrations()`
3. Test on clean database

## Best Practices

### Service Methods

- Return typed data (use TypeScript interfaces)
- Throw `AppError` for business logic errors
- Keep methods focused and single-purpose
- Use transactions for multi-step operations

### Route Handlers

- Validate input early
- Use middleware for auth/permissions
- Handle errors with try/catch
- Return consistent JSON structure

### Database Queries

- Use parameterized queries (prevent SQL injection)
- Add indexes for frequently queried columns
- Use LIMIT for potentially large results
- Prefer prepared statements for reusable queries

### Error Handling

- Use `AppError` for expected errors
- Log unexpected errors with full stack trace
- Never expose internal errors to clients
- Provide helpful error messages

## Testing Strategy

### Unit Tests

- Test individual service methods
- Mock database services
- Focus on business logic

### Integration Tests

- Test route handlers end-to-end
- Use test database
- Verify HTTP responses

### Database Tests

- Test migrations
- Verify schema constraints
- Test transaction rollback

## Future Improvements

### Short-term

- [ ] Redis caching for performance
- [ ] Email verification for registration
- [ ] Password reset functionality
- [ ] API rate limiting per user
- [ ] Request validation with Joi/Zod

### Long-term

- [ ] WebSocket support for real-time updates
- [ ] GraphQL alternative API
- [ ] Migrate to PostgreSQL for better concurrency
- [ ] Microservices architecture
- [ ] Distributed tracing (OpenTelemetry)

## Related Documentation

- [README.md](./README.md) - Backend overview
- [Configuration](./configuration.md) - Environment setup
- [API Routes](./api-routes.md) - API reference
- [Database Schema](./database/schema.md) - Schema reference
