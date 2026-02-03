# Backend Architecture

Architectural patterns and design decisions for the Flashpoint Web backend service.

## Architecture Overview

Service layer pattern with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                        HTTP Layer (Routes)                   │
│  - Handle HTTP requests/responses                            │
│  - Input validation, Response formatting                     │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                   Middleware Layer                           │
│  - Authentication, RBAC, Activity logging, Error handling   │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                   Service Layer                              │
│  - Business Logic, Database operations, Transactions        │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                  Data Access Layer                           │
│  - DatabaseService (flashpoint.sqlite, read-only)           │
│  - UserDatabaseService (user.db, read/write)                │
└─────────────────────────────────────────────────────────────┘
```

## Design Patterns

### 1. Service Layer Pattern

Routes handle HTTP concerns; Services contain business logic.

```typescript
// Route (routes/users.ts)
router.get('/', authenticate, async (req, res) => {
  const users = await userService.getUsers(1, 50);
  res.json(users);
});

// Service (services/UserService.ts)
async getUsers(page: number, limit: number) {
  const offset = (page - 1) * limit;
  return UserDatabaseService.all(
    'SELECT * FROM users LIMIT ? OFFSET ?',
    [limit, offset]
  );
}
```

### 2. Singleton Pattern

Single database connection per process, shared across all requests.

```typescript
export class DatabaseService {
  private static db: BetterSqlite3.Database | null = null;

  static async initialize(): Promise<void> {
    this.db = new BetterSqlite3(config.flashpointDbPath);
  }

  static getDatabase(): BetterSqlite3.Database {
    if (!this.db) throw new Error('Database not initialized');
    return this.db;
  }
}
```

### 3. Middleware Chain Pattern

Composable request processing; each middleware handles one concern.

```typescript
router.post('/users',
  authenticate,                      // Verify JWT
  requirePermission('users.create'),  // Check permission
  logActivity('create', 'users'),     // Log activity
  async (req, res) => { /* handle */ }
);
```

### 4. Repository Pattern (via Database Services)

Abstract data access from business logic; centralized query logic.

## Architectural Decisions

### 1. Two-Database Architecture

**Rationale:**
- Flashpoint database managed by external Launcher
- Prevents conflicts from simultaneous writes
- User data needs different schema and write access
- Clear separation of concerns

### 2. Synchronous Database Access (better-sqlite3)

**Rationale:**
- SQLite is single-threaded; async provides no benefit
- Simpler, more readable code
- Better performance for SQLite workloads
- No callback/promise overhead

### 3. JWT-Based Authentication

**Rationale:**
- Stateless authentication (no session storage)
- Works across multiple backend instances
- Mobile-friendly

**Implementation:**
- Access token: 1 hour expiry
- Refresh token: 30 days expiry, stored in DB

### 4. RBAC over ACL

**Rationale:**
- Easier to manage permissions for groups of users
- Standard pattern for most applications
- Simpler permission checks
- Sufficient granularity

### 5. Activity Logging

**Rationale:**
- Audit trail for security
- User behavior analytics
- Debugging user issues
- Compliance requirements

**Implementation:**
- Non-blocking (setImmediate)
- Automatic cleanup (90-day retention)

### 6. Play Session Tracking

**Rationale:**
- Detailed play history per user
- Calculate accurate statistics
- Support for session duration
- Abandoned session detection

## Error Handling Strategy

### AppError Class

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

### Error Categories

- `400`: Bad Request (invalid input)
- `401`: Unauthorized (auth failed)
- `403`: Forbidden (permission denied)
- `404`: Not Found (resource missing)
- `409`: Conflict (duplicate resource)
- `429`: Too Many Requests (rate limit)
- `500`: Internal Server Error (unexpected)

## Database Architecture

### Connection Management

**Flashpoint Database:**
- Single read-only connection per process
- File watcher for hot-reload
- Automatic reconnection on file change
- Debounced reload (500ms)

**User Database:**
- Single read/write connection per process
- Foreign key enforcement enabled
- Schema migrations on startup

### Query Optimization

- Indexes on foreign keys and frequently queried columns
- Pagination to prevent memory issues
- Prepared statements for reusable queries
- Selective columns (avoid SELECT *)

### Transaction Strategy

```typescript
const transaction = db.transaction(() => {
  UserDatabaseService.run('INSERT INTO users ...');
  UserDatabaseService.run('INSERT INTO user_stats ...');
});
transaction(); // Execute atomically
```

## Security Architecture

### Authentication Flow

1. User sends credentials to `/api/auth/login`
2. AuthService verifies password (bcrypt)
3. Generate access token (JWT, 1h expiry)
4. Generate refresh token (random, 30d expiry)
5. Store refresh token in database
6. Return both tokens to client

### Authorization Flow

1. Client sends Authorization header
2. Auth middleware verifies JWT token
3. Extract user info from token payload
4. Load user permissions from database
5. RBAC middleware checks required permission
6. Allow or deny request

### Password Security

- **Hashing**: bcrypt with 10 rounds
- **Salt**: Automatic per-password salt
- **Strength**: Not enforced (can be added)
- **Reset**: Not implemented (can be added)

### Login Protection

- Attempt tracking (log all attempts)
- Rate limiting (5 failed attempts per 15 minutes)
- IP-based tracking
- Auto-cleanup (remove attempts >24 hours old)

## Performance Considerations

### Database Performance

- Better-sqlite3 faster than async alternatives
- Connection reuse (single per process)
- Prepared statements cached and reused
- Comprehensive indexing strategy

### Response Time Targets

- Game search: < 100ms (p95)
- Game details: < 50ms (p95)
- User operations: < 200ms (p95, includes bcrypt)
- Play tracking: < 50ms (p95)

### Caching Strategy

**Currently Implemented:**
- Permission caching in-memory (5-minute TTL)
- 90%+ reduction in permission queries

**Future Recommendations:**
- Redis for distributed session storage
- Cache game metadata queries
- Cache filter options (platforms, tags)

## Monitoring and Observability

### Logging

Winston logger with structured logging:
```typescript
logger.info('User logged in', { userId, username, ipAddress });
logger.error('Database error', { error: err.message });
```

### Activity Logs

Database-backed activity logging:
- All user actions logged
- IP address and user agent captured
- Queryable for analytics
- Automatic retention policy (90 days)

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

1. Create SQL file in `src/migrations/` with sequential number
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

## Related Documentation

- [README.md](./README.md) - Backend overview
- [Configuration](./configuration.md) - Environment setup
- [Database Schema](./database/schema.md) - Schema reference
