# Flashpoint Web - Technical Documentation

Complete technical documentation for the Flashpoint Web project, a self-hosted
web application for browsing and playing games from the Flashpoint Archive.

## Documentation Structure

### 01. Overview

- [Project Overview](01-overview/project-overview.md) - Introduction and key
  features
- [Technology Stack](01-overview/technology-stack.md) - Complete technology
  stack

### 02. Architecture

- [System Architecture](02-architecture/system-architecture.md) - Complete
  system design
- [Service Communication](02-architecture/service-communication.md) -
  Inter-service communication
- [Data Flow Diagrams](02-architecture/data-flow-diagrams.md) - Request/response
  flows
- [Authentication Flow](02-architecture/authentication-flow.md) - Authentication
  and authorization
- [Game Launch Flow](02-architecture/game-launch-flow.md) - Game playing process
- [Play Tracking Flow](02-architecture/play-tracking-flow.md) - Session tracking

### 03. Backend Service

- [Backend Overview](03-backend/README.md) - Backend service introduction
- [Architecture](03-backend/architecture.md) - Backend architecture patterns
- [Configuration](03-backend/configuration.md) - Environment variables
- **Services**:
  - [Database Service](03-backend/services/database-service.md) - Flashpoint
    database management
  - [User Database Service](03-backend/services/user-database-service.md) - User
    database management
  - [Permission Cache Service](03-backend/services/permission-cache-service.md) -
    Permission caching
- **Database**:
  - [Schema](03-backend/database/schema.md) - Complete database schema

### 04. Frontend Application

- [Frontend Overview](04-frontend/README.md) - Frontend application introduction
- [Architecture](04-frontend/architecture.md) - Frontend architecture patterns
- **Components**:
  - [Component Overview](04-frontend/components/component-overview.md) -
    Component organization
  - [Layout Components](04-frontend/components/layout-components.md) - AppShell,
    Header, Sidebar
  - [Game Components](04-frontend/components/game-components.md) - Game browsing
    components
  - [Player Components](04-frontend/components/player-components.md) - Game
    players
  - [Auth Components](04-frontend/components/auth-components.md) -
    Authentication UI
  - [UI Components](04-frontend/components/ui-components.md) - Shadcn UI library
- [Views & Routing](04-frontend/views-routing.md) - All views and routes
- **State Management**:
  - [Zustand Stores](04-frontend/state-management/zustand-stores.md) - Client
    state
  - [React Query](04-frontend/state-management/react-query.md) - Server state
  - [URL State](04-frontend/state-management/url-state.md) - URL-based filters
- [Custom Hooks](04-frontend/custom-hooks.md) - All custom hooks
- [API Client](04-frontend/api-client.md) - Axios client integration
- **Player Implementation**:
  - [Ruffle Player](04-frontend/player-implementation/ruffle-player.md) - Flash
    games
  - [HTML5 Player](04-frontend/player-implementation/html5-player.md) - HTML5
    games

### 05. Game Service (Integrated into Backend)

- [Game Service Overview](05-game-service/README.md) - Game service introduction
- [Architecture](05-game-service/architecture.md) - Integrated single-service
  design
- [Proxy Server](05-game-service/proxy-server.md) - HTTP proxy (/game-proxy/\*)
- [GameZip Server](05-game-service/gamezip-server.md) - ZIP server
  (/game-zip/\*)
- [Legacy Server](05-game-service/legacy-server.md) - Legacy content serving
- [ZIP Manager](05-game-service/zip-manager.md) - ZIP mounting
- [MIME Types](05-game-service/mime-types.md) - MIME type handling
- [HTML Polyfills](05-game-service/html-polyfills.md) - Game compatibility
- [Configuration](05-game-service/configuration.md) - Environment variables

### 06. API Reference

- [API Overview](06-api-reference/README.md) - API documentation index
- [Authentication API](06-api-reference/authentication-api.md) - Auth endpoints
- [Games API](06-api-reference/games-api.md) - Game endpoints
- [Users API](06-api-reference/users-api.md) - User management
- [Roles API](06-api-reference/roles-api.md) - Role & permission endpoints
- [Playlists API](06-api-reference/playlists-api.md) - Playlist management
- [Play Tracking API](06-api-reference/play-tracking-api.md) - Play session
  endpoints
- [Platforms & Tags API](06-api-reference/platforms-tags-api.md) - Filter
  endpoints
- [Favorites API](06-api-reference/favorites-api.md) - Favorite games management
- [Activities API](06-api-reference/activities-api.md) - Activity logging
- [Admin API](06-api-reference/admin-api.md) - Admin endpoints
- [Shared Playlists API](06-api-reference/shared-playlists-api.md) - Playlist
  sharing
- [Settings API](06-api-reference/settings-api.md) - System settings

### 07. Design System

- [Design System Overview](07-design-system/README.md) - Design system
  introduction
- [Theme System](07-design-system/theme-system.md) - Theme modes and colors
- [Color Palette](07-design-system/color-palette.md) - All 22 colors
- [Typography](07-design-system/typography.md) - Font sizes and weights
- [Spacing & Layout](07-design-system/spacing-layout.md) - Spacing scale
- [Components Library](07-design-system/components-library.md) - UI components
- [Icons](07-design-system/icons.md) - Lucide icons
- [Responsive Design](07-design-system/responsive-design.md) - Breakpoints
- [Design Patterns](07-design-system/design-patterns.md) - UI patterns

### 08. Development

- [Setup Guide](08-development/setup-guide.md) - Complete development setup
- [Commands](08-development/commands.md) - All npm commands
- [Project Structure](08-development/project-structure.md) - Directory structure
- [Coding Standards](08-development/coding-standards.md) - Code conventions
- [Testing Guide](08-development/testing-guide.md) - Testing approach
- [Debugging](08-development/debugging.md) - Debugging tips
- [Common Pitfalls](08-development/common-pitfalls.md) - Known issues

### 09. Deployment

- [Deployment Overview](09-deployment/README.md) - Deployment documentation
- [Docker Deployment](09-deployment/docker-deployment.md) - Docker Compose setup
- [Environment Variables](09-deployment/environment-variables.md) - All env vars
- [Health Checks](09-deployment/health-checks.md) - Health check endpoints
- [Security Considerations](09-deployment/security-considerations.md) - Security
  best practices

### 10. Features

- [Authentication & Authorization](10-features/01-authentication-authorization.md) -
  Complete auth system
- [Game Browsing & Filtering](10-features/02-game-browsing-filtering.md) -
  Search and filters
- [Game Playing](10-features/03-game-playing.md) - Playing Flash/HTML5 games
- [Play Session Tracking](10-features/04-play-session-tracking.md) - Play
  tracking
- [Playlists & Favorites](10-features/05-playlists-favorites.md) - Playlist
  management
- [User Management](10-features/06-user-management.md) - User administration
- [Role & Permissions](10-features/07-role-permissions.md) - RBAC system
- [Activity Logging](10-features/08-activity-logging.md) - Audit logging
- [System Settings](10-features/09-system-settings.md) - System configuration
- [Date/Time Formatting](10-features/10-date-time-formatting.md) - Date display
  formatting

### 11. Diagrams

- [Diagrams Overview](11-diagrams/README.md) - Visualization and flows

### 12. Reference

- [Database Schema Reference](12-reference/database-schema-reference.md) -
  Complete schema
- [Type Definitions](12-reference/type-definitions.md) - All TypeScript types
- [Glossary](12-reference/glossary.md) - Terms and definitions
- [External Dependencies](12-reference/external-dependencies.md) - Third-party
  libraries
- [Security Measures](12-reference/security-measures.md) - Security overview
- [CORS Security Decision](12-reference/cors-security-decision.md) - CORS policy
  rationale
- [Database Indexes](12-reference/database-indexes.md) - Index optimization

### 13. Security

- [Directory Traversal Protection](13-security/directory-traversal-protection.md) -
  Path security
