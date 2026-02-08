# Backend Service

The backend is a REST API built with Express and TypeScript that serves as the
central hub for the Flashpoint Web application. It manages game metadata, user
accounts, authentication, and serves game content directly via integrated
game-proxying (formerly provided by a separate game-service).

## Overview

- **Framework**: Express.js with TypeScript
- **Port**: 3100
- **Databases**:
  - SQLite (flashpoint.sqlite) - Read-only game metadata
  - SQLite (user.db) - User management and application data
- **Authentication**: JWT-based with RBAC (Role-Based Access Control)
- **Architecture**: Service layer pattern with middleware

## Key Features

- Game metadata queries from Flashpoint Archive database
- User authentication and authorization with JWT
- Role-based permission system (admin, user, guest)
- Play session tracking with automatic cleanup
- Activity logging for auditing
- Database hot-reload when Flashpoint Launcher updates
- Integrated game content serving (proxy and ZIP mounting)

## Quick Start

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your Flashpoint installation path

npm run dev     # Development server
npm run build   # Build for production
npm start       # Run production build
```

## Environment Variables

**Required:**

- `FLASHPOINT_PATH` - Path to Flashpoint installation (all other paths derived
  automatically)
- `DOMAIN` - Frontend URL (default: http://localhost:5173)

See [configuration.md](./configuration.md) for complete environment variable
documentation.

## Core Concepts

### Two-Database Architecture

1. **Flashpoint Database** (flashpoint.sqlite)
   - Read-only access to official Flashpoint game metadata
   - Managed by Flashpoint Launcher
   - Hot-reloaded when file changes detected
   - Contains: games, platforms, tags, playlists

2. **User Database** (user.db)
   - Application-specific data
   - Full read/write access
   - Schema managed via migrations
   - Contains: users, roles, permissions, play sessions, activity logs

### Service Layer Pattern

- **Routes** handle HTTP requests/responses
- **Services** contain business logic and database queries
- **Middleware** handles cross-cutting concerns (auth, logging, errors)

### JWT Authentication

- Access tokens expire after 1 hour (configurable via JWT_EXPIRES_IN)
- Refresh tokens valid for 30 days
- Token payload includes: userId, username, role
- Permissions loaded from database on each request

### Role-Based Access Control (RBAC)

Three default roles:

- **Admin** (priority 100): Full access
- **User** (priority 50): Can play games, manage playlists
- **Guest** (priority 0): Read-only access

Permissions are assigned to roles, and users inherit permissions from their
role.

## Project Structure

```
backend/
├── src/
│   ├── config.ts                 # Environment configuration
│   ├── server.ts                 # Express app initialization
│   ├── middleware/               # Express middleware
│   ├── routes/                   # API route handlers
│   ├── services/                 # Business logic layer
│   ├── types/                    # TypeScript definitions
│   ├── utils/                    # Utility functions
│   ├── game/                     # Integrated game content serving
│   │   ├── proxy-request-handler.ts   # Legacy htdocs proxy
│   │   ├── gamezipserver.ts           # ZIP mounting server
│   │   ├── legacy-server.ts           # Legacy file serving
│   │   ├── zip-manager.ts             # ZIP mounting logic
│   │   ├── cgi/                       # CGI/PHP execution
│   │   ├── services/                  # Game data services
│   │   ├── utils/                     # Game utilities
│   │   └── config.ts                  # Game config
│   └── migrations/               # Database migrations
├── user.db                       # User database (generated)
├── package.json
└── tsconfig.json
```

## API Routes

Main route groups:

- `/api/auth` - Login, register, token refresh
- `/api/users` - User management
- `/api/roles` - Role and permission management
- `/api/games` - Game search and metadata
- `/api/play` - Play session tracking
- `/api/activities` - Activity logs
- `/api/playlists` - User playlists
- `/api/domains` - Domain management
- `/game-proxy/*` - Legacy htdocs and game file proxying (registered before auth)
- `/game-zip/*` - ZIP archive mounting and serving (registered before auth)

See the [API Reference](../06-api-reference/README.md) for complete API
documentation.

## Services

- [database-service.md](./services/database-service.md) - Flashpoint database
  connection with hot-reload
- [user-database-service.md](./services/user-database-service.md) - User
  database with migrations
- AuthService - Authentication and JWT management
- UserService - User CRUD operations
- GameService - Game metadata queries
- PlayTrackingService - Play session tracking
- DomainService - Domain CRUD with CORS cache

## Security Features

- Password hashing with bcrypt (10 rounds)
- JWT token expiration and refresh
- Login attempt tracking and account lockout
- RBAC for fine-grained access control
- Activity logging for audit trails
- Dynamic CORS protection (env var + configured domains)
- Helmet.js security headers
- Input validation and sanitization

## Performance Optimizations

- Better-sqlite3 for synchronous database access (faster than async)
- Database connection pooling and reuse
- Pagination for large result sets
- Indexed database queries
- Response compression with gzip
- File watching debouncing (500ms)

**Query Optimization Patterns:**

- **Window functions for pagination**: `COUNT(*) OVER()` merges count into single query
- **Scalar subqueries**: Multiple aggregates in one SELECT (e.g., distinct counts)
- **Map-based data merging**: O(1) lookups instead of O(N²) .find() loops
- **Direct file access before directory scans**: O(1) fast path with O(N) fallback
- **Parallel file reads**: `Promise.allSettled()` for concurrent I/O operations

See [architecture.md](./architecture.md#query-optimization) for implementation details.

## Background Jobs

**Abandoned Session Cleanup**

- Runs every 6 hours
- Ends sessions older than 24 hours
- Updates play statistics

## Error Handling

Centralized error middleware:

- `AppError` class for operational errors
- Automatic HTTP status code mapping
- Structured error responses
- Error logging with Winston

## Logging

Winston logger with:

- Console output with colors (development)
- File logging (production)
- Log levels: error, warn, info, debug
- Structured logging with metadata

## Testing

```bash
npm test                    # Run tests
npm test -- --watch        # Watch mode
npm test -- --coverage     # Coverage report
```

## Common Tasks

### Adding a New API Endpoint

1. Create route handler in `src/routes/`
2. Add business logic to appropriate service
3. Register route in `src/routes/index.ts`
4. Add middleware for authentication/authorization
5. Document in `docs/06-api-reference/`

### Adding a New Permission

1. Insert permission in database
2. Assign to roles via `role_permissions` table
3. Use `requirePermission()` middleware in routes

### Creating a Database Migration

1. Create SQL file in `src/migrations/` with sequential number
2. Add migration logic to `UserDatabaseService.runMigrations()`
3. Test migration on clean database
4. Document in migrations/README.md

## Troubleshooting

### Database Locked Error

- Close Flashpoint Launcher before starting backend
- Ensure only one backend instance is running
- Check file permissions on database files

### Authentication Failures

- Verify JWT_SECRET is set correctly
- Check token expiration time
- Ensure user is active in database

### Game Files Not Loading

- Verify game content is being served via `/game-proxy/*` routes
- Check backend logs for game server initialization errors
- Ensure FLASHPOINT_PATH is correct

## Development Workflow

1. Start backend: `npm run dev`
2. Backend watches for TypeScript changes
3. Auto-reloads on file save
4. Logs all HTTP requests
5. Database hot-reloads when flashpoint.sqlite changes

## Production Deployment

```bash
NODE_ENV=production npm start
```

Requirements:

1. Set `NODE_ENV=production`
2. Set secure `JWT_SECRET`
3. Configure proper `DOMAIN`
4. Build: `npm run build`
5. Monitor logs and errors
6. Set up process manager (PM2, systemd)

## Performance Metrics

Typical response times (p95):

- Game search: < 100ms
- Game details: < 50ms
- User login: < 200ms (bcrypt hashing)
- Play session start: < 50ms
- Activity log: < 30ms (non-blocking)

## Related Documentation

- [Architecture](./architecture.md) - Backend architecture patterns
- [Configuration](./configuration.md) - Environment configuration
- [API Reference](../06-api-reference/README.md) - Complete API documentation
- [Database Schema](./database/schema.md) - Database schema reference
