# Backend Service

The backend is a REST API built with Express and TypeScript that serves as the central hub for the Flashpoint Web application. It manages game metadata, user accounts, authentication, and coordinates with the separate game-service for content delivery.

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
- Game file proxying to separate game-service

## Project Structure

```
backend/
├── src/
│   ├── config.ts                 # Environment configuration
│   ├── server.ts                 # Express app initialization
│   │
│   ├── middleware/               # Express middleware
│   │   ├── auth.ts              # JWT authentication
│   │   ├── rbac.ts              # Permission checking
│   │   ├── errorHandler.ts     # Global error handling
│   │   └── activityLogger.ts   # Activity logging
│   │
│   ├── routes/                   # API route handlers
│   │   ├── index.ts             # Route setup
│   │   ├── auth.ts              # Authentication endpoints
│   │   ├── users.ts             # User management
│   │   ├── games.ts             # Game queries
│   │   ├── play-tracking.ts    # Play session tracking
│   │   └── ...
│   │
│   ├── services/                 # Business logic layer
│   │   ├── DatabaseService.ts           # Flashpoint DB connection
│   │   ├── UserDatabaseService.ts       # User DB connection
│   │   ├── AuthService.ts               # Authentication logic
│   │   ├── UserService.ts               # User CRUD
│   │   ├── RoleService.ts               # Role & permission mgmt
│   │   ├── GameService.ts               # Game queries
│   │   ├── PlayTrackingService.ts       # Play tracking
│   │   └── ActivityService.ts           # Activity logging
│   │
│   ├── types/                    # TypeScript type definitions
│   │   └── auth.ts              # Auth-related types
│   │
│   ├── utils/                    # Utility functions
│   │   ├── jwt.ts               # JWT token management
│   │   ├── password.ts          # Password hashing
│   │   ├── logger.ts            # Winston logger
│   │   └── pagination.ts        # Pagination helpers
│   │
│   └── migrations/               # Database migrations
│       ├── 001_user-schema.sql
│       ├── 002_create-user-settings.sql
│       └── README.md
│
├── user.db                       # User database (generated)
├── package.json
└── tsconfig.json
```

## Quick Start

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Flashpoint installation path

# Start development server
npm run dev

# Build for production
npm run build

# Run production server
npm start
```

## Environment Variables

See [configuration.md](./configuration.md) for complete environment variable documentation.

Required variables:
- `FLASHPOINT_PATH` - Path to Flashpoint installation
- `FLASHPOINT_DB_PATH` - Path to flashpoint.sqlite
- `GAME_SERVICE_PROXY_URL` - URL to game-service proxy (default: http://localhost:22500)
- `CORS_ORIGIN` - Frontend URL (default: http://localhost:5173)

## Core Concepts

### Two-Database Architecture

The backend operates with two separate SQLite databases:

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

Business logic is separated into service classes:
- **Routes** handle HTTP requests/responses
- **Services** contain business logic and database queries
- **Middleware** handles cross-cutting concerns (auth, logging, errors)

### JWT Authentication

- Access tokens expire after 1 hour
- Refresh tokens valid for 30 days
- Token payload includes: userId, username, role
- Permissions loaded from database on each request

### Role-Based Access Control (RBAC)

Three default roles:
- **Admin** (priority 100): Full access to all features
- **User** (priority 50): Can play games, manage playlists
- **Guest** (priority 0): Read-only access to games

Permissions are assigned to roles, and users inherit permissions from their role.

## API Routes

See [api-routes.md](./api-routes.md) for complete API documentation.

Main route groups:
- `/api/auth` - Login, register, token refresh
- `/api/users` - User management
- `/api/roles` - Role and permission management
- `/api/games` - Game search and metadata
- `/api/play` - Play session tracking
- `/api/activities` - Activity logs
- `/api/playlists` - User playlists

## Database Schema

See [database/schema.md](./database/schema.md) for complete schema documentation.

Key tables:
- `users` - User accounts
- `roles` - User roles
- `permissions` - Available permissions
- `role_permissions` - Role-permission mapping
- `user_game_plays` - Individual play sessions
- `user_game_stats` - Aggregated play statistics
- `activity_logs` - User activity audit trail

## Services

See [services/](./services/) directory for detailed service documentation:

- [database-service.md](./services/database-service.md) - Flashpoint database connection with hot-reload
- [user-database-service.md](./services/user-database-service.md) - User database with migrations
- [auth-service.md](./services/auth-service.md) - Authentication and JWT management
- [user-service.md](./services/user-service.md) - User CRUD operations
- [role-service.md](./services/role-service.md) - Role and permission management
- [game-service.md](./services/game-service.md) - Game metadata queries
- [play-tracking-service.md](./services/play-tracking-service.md) - Play session tracking
- [activity-service.md](./services/activity-service.md) - Activity logging

## Middleware

See [middleware/](./middleware/) directory for detailed middleware documentation:

- [authentication.md](./middleware/authentication.md) - JWT verification
- [rbac.md](./middleware/rbac.md) - Permission checking
- [error-handling.md](./middleware/error-handling.md) - Global error handler
- [activity-logger.md](./middleware/activity-logger.md) - Activity logging

## Security Features

- Password hashing with bcrypt (10 rounds)
- JWT token expiration and refresh
- Login attempt tracking and account lockout
- RBAC for fine-grained access control
- Activity logging for audit trails
- CORS protection
- Helmet.js security headers
- Input validation and sanitization

## Performance Optimizations

- Better-sqlite3 for synchronous database access (faster than async)
- Database connection pooling and reuse
- Pagination for large result sets
- Indexed database queries
- Response compression with gzip
- File watching debouncing (500ms)

## Background Jobs

The backend runs scheduled tasks:

1. **Abandoned Session Cleanup**
   - Runs every 6 hours
   - Ends sessions older than 24 hours
   - Updates play statistics

## Error Handling

All errors are handled through centralized error middleware:
- `AppError` class for operational errors (user-facing)
- Automatic HTTP status code mapping
- Structured error responses
- Error logging with Winston

## Logging

Winston logger with multiple transports:
- Console output with colors (development)
- File logging (production)
- Log levels: error, warn, info, debug
- Structured logging with metadata

## Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm test -- --watch

# Generate coverage report
npm test -- --coverage
```

## Common Tasks

### Adding a New API Endpoint

1. Create route handler in `src/routes/`
2. Add business logic to appropriate service
3. Register route in `src/routes/index.ts`
4. Add middleware for authentication/authorization
5. Document in api-routes.md

### Adding a New Permission

1. Insert permission in database:
   ```sql
   INSERT INTO permissions (name, description, resource, action)
   VALUES ('resource.action', 'Description', 'resource', 'action');
   ```
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
- Verify game-service is running on port 22500/22501
- Check GAME_SERVICE_PROXY_URL in .env
- Ensure Flashpoint paths are correct

## Related Documentation

- [Architecture](./architecture.md) - Backend architecture patterns
- [Configuration](./configuration.md) - Environment configuration
- [API Routes](./api-routes.md) - Complete API documentation
- [Database Schema](./database/schema.md) - Database schema reference
- [Migration System](./database/migrations.md) - Database migrations

## Development Workflow

1. Start backend: `npm run dev`
2. Backend watches for TypeScript changes
3. Auto-reloads on file save
4. Logs all HTTP requests
5. Database hot-reloads when flashpoint.sqlite changes

## Production Deployment

1. Set `NODE_ENV=production`
2. Set secure `JWT_SECRET`
3. Configure proper `CORS_ORIGIN`
4. Build: `npm run build`
5. Start: `npm start`
6. Monitor logs and errors
7. Set up process manager (PM2, systemd)

## Performance Metrics

Typical response times (p95):
- Game search: < 100ms
- Game details: < 50ms
- User login: < 200ms (bcrypt hashing)
- Play session start: < 50ms
- Activity log: < 30ms (non-blocking)

## License

Part of Flashpoint Web project.
