# Feature Documentation

This directory contains documentation for all major features in the Flashpoint Web application.

## Features

1. [Authentication & Authorization](./01-authentication-authorization.md) - User registration, JWT tokens, session management, and RBAC
2. [Game Browsing & Filtering](./02-game-browsing-filtering.md) - Free-text search, multi-criteria filtering, sorting, and pagination
3. [Game Playing](./03-game-playing.md) - Browser-based game playback with Ruffle emulator and game service proxy
4. [Play Session Tracking](./04-play-session-tracking.md) - Automatic gameplay monitoring with statistics and analytics
5. [Playlists & Favorites](./05-playlists-favorites.md) - Game organization through playlists and favorites with Flashpoint Launcher compatibility
6. [User Management](./06-user-management.md) - Administrator tools for managing user accounts, roles, and access control
7. [Role-Based Access Control](./07-role-permissions.md) - Fine-grained permission system with custom roles and flexible access control
8. [Activity Logging & Audit Trail](./08-activity-logging.md) - Comprehensive audit logging for security monitoring and troubleshooting
9. [System Settings](./09-system-settings.md) - Centralized configuration management with validation and caching
10. [Date & Time Formatting](./10-date-time-formatting.md) - Consistent date/time formatting and localization across the application

## Quick Reference

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

### Database Tables

**User Database (user.db):**
- users, roles, permissions, role_permissions, refresh_tokens, login_attempts
- system_settings, user_settings, user_game_plays, user_game_stats, user_stats, activity_logs

**Flashpoint Database (flashpoint.sqlite - read-only):**
- game, platform, tag, game_tags_tag, playlist, playlist_game

### Default Roles

| Role | Priority | Permissions |
|------|----------|-------------|
| admin | 100 | All 18 permissions |
| user | 50 | games.*, playlists.* (10 total) |
| guest | 0 | games.read, playlists.read (2 total) |

## Related Documentation

- [System Architecture](../02-architecture/system-architecture.md) - System architecture and components
- [Database Schema](../12-reference/database-schema-reference.md) - Complete database documentation
- [API Reference](../06-api-reference/README.md) - REST API documentation
- [Development Guide](../08-development/setup-guide.md) - Project setup and development
