# Feature Documentation

This directory contains comprehensive documentation for all major features in the Flashpoint Web application. Each document provides both user-facing functionality and detailed technical implementation information.

## Feature Documentation

### 1. [Authentication & Authorization](./01-authentication-authorization.md)
Complete authentication system with JWT tokens, session management, and RBAC integration.

**Key Topics:**
- User registration and login
- JWT access and refresh tokens
- Guest mode
- Password management
- Session security
- Rate limiting and lockout

**API Endpoints:** 5 endpoints (login, register, logout, refresh, me)
**Permissions:** N/A (authentication is foundation)
**Database Tables:** users, refresh_tokens, login_attempts, system_settings (auth category)

---

### 2. [Game Browsing & Filtering](./02-game-browsing-filtering.md)
Comprehensive game discovery with advanced filtering, search, and sorting capabilities.

**Key Topics:**
- Free-text search
- Multi-criteria filtering (platform, series, developer, publisher, tags, year range)
- Sorting and pagination
- Grid and list view modes
- Filter persistence in URL
- Performance optimizations

**API Endpoints:** 3 endpoints (search games, filter options, game details)
**Permissions:** games.read (for browsing)
**Database Tables:** game (flashpoint.sqlite - read-only)

---

### 3. [Game Playing](./03-game-playing.md)
Browser-based game playback using Ruffle emulator for Flash games and native iframe for HTML5 games.

**Key Topics:**
- Ruffle WebAssembly emulator
- HTML5 game loading
- Fullscreen mode
- Game service proxy architecture
- Session tracking integration
- Error handling

**API Endpoints:** 1 endpoint (launch configuration)
**Permissions:** games.play
**Database Tables:** N/A (uses game service)

---

### 4. [Play Session Tracking](./04-play-session-tracking.md)
Automatic gameplay monitoring with comprehensive statistics, charts, and analytics.

**Key Topics:**
- Automatic session start/end
- Overall statistics (playtime, sessions, game count)
- Top games charts
- Activity over time
- Games distribution
- Play history
- Abandoned session cleanup

**API Endpoints:** 7 endpoints (start, end, stats, game-stats, history, top-games, activity-over-time, games-distribution)
**Permissions:** Automatic (all authenticated users)
**Database Tables:** user_game_plays, user_game_stats, user_stats

---

### 5. [Playlists & Favorites](./05-playlists-favorites.md)
Game organization through playlists and favorites, stored as JSON files for Flashpoint Launcher compatibility.

**Key Topics:**
- Playlist CRUD operations
- File-based storage (JSON)
- Add/remove games
- Favorites playlist (hardcoded ID)
- Flashpoint Launcher compatibility
- Multi-select game operations

**API Endpoints:** 5 endpoints (list, get, create, add games, remove games, delete)
**Permissions:** playlists.read, playlists.create, playlists.update, playlists.delete
**Database Tables:** N/A (JSON files in Flashpoint/Data/Playlists/)

---

### 6. [User Management](./06-user-management.md)
Administrator tools for managing user accounts, roles, and access control.

**Key Topics:**
- User CRUD operations
- Role assignment
- Password management
- Active/inactive status
- User settings (theme, preferences)
- Last admin protection
- Cascade deletions

**API Endpoints:** 7 endpoints (list, get, create, update, delete, change password, settings)
**Permissions:** users.read, users.create, users.update, users.delete
**Database Tables:** users, user_settings

---

### 7. [Role-Based Access Control (RBAC)](./07-role-permissions.md)
Fine-grained permission system with custom roles and flexible access control.

**Key Topics:**
- Role and permission management
- Many-to-many role-permission mapping
- Frontend route guards
- Backend middleware enforcement
- System roles (admin, user, guest)
- Permission hierarchy
- Custom role creation

**API Endpoints:** 6 endpoints (list roles, get role, create, update, update permissions, delete)
**Permissions:** roles.read, roles.create, roles.update, roles.delete
**Database Tables:** roles, permissions, role_permissions

---

### 8. [Activity Logging & Audit Trail](./08-activity-logging.md)
Comprehensive audit logging for security monitoring, troubleshooting, and compliance.

**Key Topics:**
- Automatic activity logging
- Activity middleware
- User action tracking
- Filtering and search
- Audit trail preservation
- IP address and user agent tracking
- Privacy considerations

**API Endpoints:** 1 endpoint (list activities with filters)
**Permissions:** activities.read
**Database Tables:** activity_logs

---

### 9. [System Settings](./09-system-settings.md)
Centralized configuration management with validation, caching, and category-based organization.

**Key Topics:**
- Settings categories (auth, app, metadata, features, game)
- JSON schema validation
- In-memory caching (60s TTL)
- Tabbed settings UI
- Real-time validation
- Flexible key-value storage
- Admin-only access

**API Endpoints:** 7 endpoints (get all, get category, update category, get setting, update setting, cache stats, clear cache)
**Permissions:** settings.read, settings.update
**Database Tables:** system_settings

---

## Documentation Structure

Each feature document follows this consistent structure:

1. **Overview** - High-level feature description
2. **User-Facing Functionality** - What users see and can do
3. **Technical Implementation** - How it's built
   - Architecture components
   - Database schema
   - API endpoints
   - Service layer details
4. **UI Components** - React components involved
5. **Common Use Cases** - Code examples and scenarios
6. **Permissions** - Required permissions
7. **Best Practices** - Recommendations
8. **Troubleshooting** - Common issues and solutions
9. **Future Enhancements** - Potential improvements

## Quick Reference

### All API Endpoints by Feature

| Feature | Endpoint Count | Base Path |
|---------|---------------|-----------|
| Authentication | 5 | `/api/auth` |
| Game Browsing | 3 | `/api/games` |
| Game Playing | 1 | `/api/games/:id/launch` |
| Play Tracking | 7 | `/api/play` |
| Playlists | 5 | `/api/playlists` |
| User Management | 7 | `/api/users` |
| Roles & Permissions | 6 | `/api/roles` |
| Activity Logging | 1 | `/api/activities` |
| System Settings | 7 | `/api/settings` |

**Total:** 42 API endpoints

### All Permissions

| Permission | Resource | Action | Description |
|------------|----------|--------|-------------|
| games.read | games | read | View and browse games |
| games.play | games | play | Play games in browser |
| games.download | games | download | Download game files |
| playlists.read | playlists | read | View playlists |
| playlists.create | playlists | create | Create new playlists |
| playlists.update | playlists | update | Update existing playlists |
| playlists.delete | playlists | delete | Delete playlists |
| users.read | users | read | View user accounts |
| users.create | users | create | Create new user accounts |
| users.update | users | update | Update user accounts |
| users.delete | users | delete | Delete user accounts |
| roles.read | roles | read | View roles and permissions |
| roles.create | roles | create | Create new roles |
| roles.update | roles | update | Update roles and permissions |
| roles.delete | roles | delete | Delete roles |
| settings.read | settings | read | View system settings |
| settings.update | settings | update | Update system settings |
| activities.read | activities | read | View activity logs |

**Total:** 18 permissions across 6 resources

### All Database Tables

**User Database (user.db):**
- users
- roles
- permissions
- role_permissions
- refresh_tokens
- login_attempts
- system_settings
- user_settings
- user_game_plays
- user_game_stats
- user_stats
- activity_logs

**Total:** 12 tables (using system_settings for global configuration)

**Flashpoint Database (flashpoint.sqlite):**
- game (read-only)
- platform (read-only)
- tag (read-only)
- game_tags_tag (read-only)
- playlist (read-only)
- playlist_game (read-only)

**Note:** Flashpoint database is managed by Flashpoint Launcher and should only be read by this application.

### Default Roles

| Role | Priority | Permissions |
|------|----------|-------------|
| admin | 100 | All 18 permissions |
| user | 50 | games.*, playlists.* (10 total) |
| guest | 0 | games.read, playlists.read (2 total) |

## Development Guidelines

When implementing new features:

1. **Document First:** Create feature doc before implementation
2. **Follow Patterns:** Use existing feature docs as templates
3. **Include Examples:** Provide code examples and use cases
4. **Update References:** Update this README with new features
5. **Version Control:** Track documentation changes in git
6. **Review Process:** Docs reviewed alongside code
7. **Keep Updated:** Update docs when features change

## Related Documentation

- **[Architecture Overview](../01-overview/01-architecture.md)** - System architecture and components
- **[Database Schema](../01-overview/02-database-schema.md)** - Complete database documentation
- **[API Reference](../01-overview/03-api-reference.md)** - REST API documentation
- **[CLAUDE.md](../../CLAUDE.md)** - Project overview and development commands

## Contributing

When adding or updating feature documentation:

1. Use consistent structure (see template above)
2. Include both user and technical perspectives
3. Provide complete API endpoint documentation
4. List all required permissions
5. Include database schema changes
6. Add code examples for common use cases
7. Document troubleshooting steps
8. List future enhancement ideas

## Version History

- **v1.1** (2026-01-18) - System Settings feature added
  - 9 core features documented
  - 42 API endpoints
  - 18 permissions
  - 12 database tables
  - Unified settings management with system_settings table

- **v1.0** (2024-03-21) - Initial feature documentation
  - 8 core features documented
  - 35 API endpoints
  - 18 permissions
  - 12 database tables

---

**Last Updated:** 2026-01-18
**Maintained By:** Flashpoint Web Development Team
