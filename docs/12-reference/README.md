# Reference Documentation

This directory contains comprehensive reference materials for the Flashpoint Web application, including database schemas, type definitions, terminology, and dependency information.

## Contents

### [Database Schema Reference](./database-schema-reference.md)

Complete database schema documentation for both databases used in the application:

- **Flashpoint Database** (flashpoint.sqlite)
  - Read-only game metadata database
  - Tables: game, game_data, platform, tag, playlist, etc.
  - Indexes and relationships
  - Query patterns and best practices

- **User Database** (user.db)
  - Application-managed user data
  - Tables: users, roles, permissions, activity_logs, play_sessions, etc.
  - Migration management
  - RBAC implementation

**Use this when:**
- Writing database queries
- Understanding data relationships
- Designing new features requiring data storage
- Debugging data issues
- Planning database migrations

---

### [Type Definitions Reference](./type-definitions.md)

TypeScript type and interface definitions used throughout the codebase:

- **Game Types:** Game, GameFilters, FilterOptions, Playlist, GameLaunchData
- **Authentication Types:** User, AuthTokens, LoginCredentials, Permission, Role
- **User Management Types:** UserDetails, CreateUserData, UpdateUserData, ActivityLog
- **Play Tracking Types:** PlaySession, GameStats, UserStats
- **UI State Types:** AuthState, UIState, ThemeState
- **Theme Types:** ThemeMode, PrimaryColor, ColorPalette
- **Pagination Types:** PaginatedResult, PaginatedResponse
- **JWT Types:** JWTPayload
- **API Response Types:** SuccessResponse, ErrorResponse

**Use this when:**
- Writing new components or services
- Understanding data structures
- Implementing API endpoints
- Adding new features
- Refactoring code

---

### [Glossary](./glossary.md)

Definitions of technical terms, project-specific terminology, and architectural concepts:

- **Project-Specific Terms:** Flashpoint, Flashpoint Launcher, htdocs, library, curation
- **Technical Terms:** JWT, RBAC, CORS, bcrypt, SQLite, hot-reload, middleware
- **Architecture Terms:** Monorepo, service layer, separation of concerns, state management
- **Database Terms:** Migration, foreign key, index, transaction, schema
- **Authentication:** Access token, refresh token, permission, guest mode, session
- **Frontend Terms:** SPA, HMR, React Query, Zustand, Tailwind CSS, virtualization
- **Game & Emulation:** Flash, Ruffle, SWF, ActionScript, HTML5 games, ZIP mounting
- **Development Terms:** TypeScript, tsx, Vite, ESLint, Docker, environment variables

**Use this when:**
- Onboarding new developers
- Understanding unfamiliar terminology
- Writing documentation
- Discussing architecture
- Learning about specific technologies

---

### [External Dependencies](./external-dependencies.md)

Comprehensive reference for all npm packages used across the monorepo:

- **Backend Dependencies:** Express, BetterSqlite3, bcrypt, JWT, axios, winston
- **Frontend Dependencies:** React, Vite, TanStack Query, Zustand, Tailwind CSS, Radix UI
- **Game Service Dependencies:** Express, node-stream-zip, winston
- **Shared Development Tools:** TypeScript, ESLint, tsx, concurrently
- **License Information:** Summary of all licenses used
- **Alternative Considerations:** Packages considered but not chosen
- **Dependency Management:** Update processes and best practices

**Use this when:**
- Adding new dependencies
- Understanding why specific packages were chosen
- Updating dependencies
- Auditing licenses
- Troubleshooting package issues
- Planning architecture changes

---

## Quick Reference

### Common Database Queries

#### Get Game by ID
```sql
SELECT * FROM game WHERE id = ?;
```

#### Get User with Permissions
```sql
SELECT u.*, r.name as role_name, GROUP_CONCAT(p.name) as permissions
FROM users u
INNER JOIN roles r ON r.id = u.role_id
LEFT JOIN role_permissions rp ON rp.role_id = r.id
LEFT JOIN permissions p ON p.id = rp.permission_id
WHERE u.id = ?
GROUP BY u.id;
```

#### Get User Play Statistics
```sql
SELECT game_id, game_title, total_plays, total_playtime_seconds
FROM user_game_stats
WHERE user_id = ?
ORDER BY last_played_at DESC
LIMIT 10;
```

---

### Common Type Patterns

#### API Response with Pagination
```typescript
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
```

#### Game Filters
```typescript
interface GameFilters {
  search?: string;
  platform?: string;
  library?: string;
  tags?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}
```

#### JWT Payload
```typescript
interface JWTPayload {
  userId: number;
  username: string;
  role: string;
}
```

---

### Environment Variables Reference

#### Backend
```env
FLASHPOINT_PATH=D:/Flashpoint
FLASHPOINT_DB_PATH=D:/Flashpoint/Data/flashpoint.sqlite
GAME_SERVICE_PROXY_URL=http://localhost:22500
GAME_SERVICE_GAMEZIP_URL=http://localhost:22501
DOMAIN=http://localhost:5173
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=1h
```

#### Frontend
```env
VITE_API_URL=http://localhost:3100
```

#### Game Service
```env
PROXY_PORT=22500
GAMEZIPSERVER_PORT=22501
FLASHPOINT_PATH=D:/Flashpoint
FLASHPOINT_HTDOCS_PATH=D:/Flashpoint/Legacy/htdocs
FLASHPOINT_GAMES_PATH=D:/Flashpoint/Data/Games
```

---

### Common Permissions

| Permission | Description |
|------------|-------------|
| games.read | View and browse games |
| games.play | Play games in browser |
| games.download | Download game files |
| playlists.read | View playlists |
| playlists.create | Create new playlists |
| playlists.update | Update existing playlists |
| playlists.delete | Delete playlists |
| users.read | View user accounts |
| users.create | Create new user accounts |
| users.update | Update user accounts |
| users.delete | Delete user accounts |
| roles.read | View roles and permissions |
| roles.update | Update roles and permissions |
| settings.read | View system settings |
| settings.update | Update system settings |
| activities.read | View activity logs |

---

### Default Roles

| Role | Priority | Default Permissions |
|------|----------|---------------------|
| admin | 100 | All permissions |
| user | 50 | All except users.*, roles.*, settings.*, activities.read |
| guest | 0 | games.read, playlists.read |

---

### Port Reference

| Service | Port | Purpose |
|---------|------|---------|
| Backend | 3100 | REST API server |
| Frontend | 5173 | Vite development server |
| Game Service - Proxy | 22500 | HTTP proxy for game content |
| Game Service - GameZip | 22501 | ZIP file streaming server |

---

## Usage Guidelines

### When to Use Which Reference

- **Need database structure?** → [Database Schema Reference](./database-schema-reference.md)
- **Need type definitions?** → [Type Definitions Reference](./type-definitions.md)
- **Need term definition?** → [Glossary](./glossary.md)
- **Need package info?** → [External Dependencies](./external-dependencies.md)

### Keeping References Up-to-Date

Reference documentation should be updated when:

- Database schema changes (new tables, columns, indexes)
- New types or interfaces are added
- New terminology is introduced
- Dependencies are added, removed, or significantly changed
- Major architectural changes occur

### Contributing to References

When updating reference documentation:

1. **Be comprehensive:** Include all relevant details
2. **Be consistent:** Follow existing format and structure
3. **Be clear:** Use simple language and examples
4. **Cross-reference:** Link to related documentation
5. **Include examples:** Show real-world usage
6. **Keep organized:** Maintain logical grouping

---

## Related Documentation

### Architecture
- [System Architecture](../02-architecture/system-architecture.md)
- [Service Communication](../02-architecture/service-communication.md)
- [Data Flow Diagrams](../02-architecture/data-flow-diagrams.md)

### Backend
- [Backend Architecture](../03-backend/architecture.md)
- [Database Services](../03-backend/services/database-service.md)
- [API Routes](../03-backend/api-routes.md)

### Frontend
- [Frontend Architecture](../04-frontend/architecture.md)
- [State Management](../04-frontend/state-management/zustand-stores.md)
- [Component Overview](../04-frontend/components/component-overview.md)

### Game Service
- [Game Service Architecture](../05-game-service/architecture.md)
- [Proxy Server](../05-game-service/proxy-server.md)
- [ZIP Manager](../05-game-service/zip-manager.md)

### API Reference
- [Authentication API](../06-api-reference/authentication-api.md)
- [Games API](../06-api-reference/games-api.md)
- [Users API](../06-api-reference/users-api.md)

### Development
- [Setup Guide](../08-development/setup-guide.md)
- [Coding Standards](../08-development/coding-standards.md)
- [Common Pitfalls](../08-development/common-pitfalls.md)

---

## Feedback

If you find errors, outdated information, or missing content in these references, please:

1. Create an issue in the project repository
2. Submit a pull request with corrections
3. Contact the documentation maintainer

Good reference documentation is essential for project success. Help keep it accurate and useful!
