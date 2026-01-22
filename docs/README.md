# Flashpoint Web - Technical Documentation

Complete technical documentation for the Flashpoint Web project, a self-hosted web application for browsing and playing games from the Flashpoint Archive.

## Documentation Structure

### 01. Overview
- [Project Overview](01-overview/project-overview.md) - Introduction, purpose, and key features
- [Architecture Overview](01-overview/architecture-overview.md) - High-level system architecture
- [Technology Stack](01-overview/technology-stack.md) - Complete technology stack
- [Getting Started](01-overview/getting-started.md) - Quick start guide for developers

### 02. Architecture
- [System Architecture](02-architecture/system-architecture.md) - Complete system design
- [Service Communication](02-architecture/service-communication.md) - Inter-service communication
- [Data Flow Diagrams](02-architecture/data-flow-diagrams.md) - Request/response flows
- [Authentication Flow](02-architecture/authentication-flow.md) - Authentication and authorization
- [Game Launch Flow](02-architecture/game-launch-flow.md) - Game playing process
- [Play Tracking Flow](02-architecture/play-tracking-flow.md) - Session tracking

### 03. Backend Service
- [Backend Overview](03-backend/README.md) - Backend service introduction
- [Architecture](03-backend/architecture.md) - Backend architecture patterns
- **Services**:
  - [Database Service](03-backend/services/database-service.md) - Flashpoint database management
  - [User Database Service](03-backend/services/user-database-service.md) - User database management
  - [Auth Service](03-backend/services/auth-service.md) - Authentication & token management
  - [User Service](03-backend/services/user-service.md) - User CRUD operations
  - [Role Service](03-backend/services/role-service.md) - Role & permission management
  - [Game Service](03-backend/services/game-service.md) - Game metadata queries
  - [Play Tracking Service](03-backend/services/play-tracking-service.md) - Play session tracking
  - [Activity Service](03-backend/services/activity-service.md) - Activity logging
- **Routes**: [API Routes](03-backend/routes/api-routes.md) - All API endpoints
- **Middleware**:
  - [Authentication](03-backend/middleware/authentication.md) - Auth middleware
  - [RBAC](03-backend/middleware/rbac.md) - Permission checking
  - [Error Handling](03-backend/middleware/error-handling.md) - Error handler
  - [Activity Logger](03-backend/middleware/activity-logger.md) - Activity logging
- **Database**:
  - [Schema](03-backend/database/schema.md) - Complete database schema
  - [Migrations](03-backend/database/migrations.md) - Migration system
  - [Data Models](03-backend/database/data-models.md) - TypeScript types
- [Configuration](03-backend/configuration.md) - Environment variables

### 04. Frontend Application
- [Frontend Overview](04-frontend/README.md) - Frontend application introduction
- [Architecture](04-frontend/architecture.md) - Frontend architecture patterns
- **Components**:
  - [Component Overview](04-frontend/components/component-overview.md) - Component organization
  - [Layout Components](04-frontend/components/layout-components.md) - AppShell, Header, Sidebar
  - [Game Components](04-frontend/components/game-components.md) - Game browsing components
  - [Player Components](04-frontend/components/player-components.md) - Game players
  - [Auth Components](04-frontend/components/auth-components.md) - Authentication UI
  - [UI Components](04-frontend/components/ui-components.md) - Shadcn UI library
- **Views**: [Views & Routing](04-frontend/views/views-routing.md) - All views and routes
- **State Management**:
  - [Zustand Stores](04-frontend/state-management/zustand-stores.md) - Client state
  - [React Query](04-frontend/state-management/react-query.md) - Server state
  - [URL State](04-frontend/state-management/url-state.md) - URL-based filters
- **Hooks**: [Custom Hooks](04-frontend/hooks/custom-hooks.md) - All custom hooks
- **API Integration**: [API Client](04-frontend/api-integration/api-client.md) - Axios client
- **Player Implementation**:
  - [Ruffle Player](04-frontend/player-implementation/ruffle-player.md) - Flash games
  - [HTML5 Player](04-frontend/player-implementation/html5-player.md) - HTML5 games

### 05. Game Service
- [Game Service Overview](05-game-service/README.md) - Game service introduction
- [Architecture](05-game-service/architecture.md) - Dual-server design
- [Proxy Server](05-game-service/proxy-server.md) - HTTP proxy (port 22500)
- [GameZip Server](05-game-service/gamezip-server.md) - ZIP server (port 22501)
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
- [Play Tracking API](06-api-reference/play-tracking-api.md) - Play session endpoints
- [Platforms & Tags API](06-api-reference/platforms-tags-api.md) - Filter endpoints
- [Request/Response Examples](06-api-reference/request-response-examples.md) - Complete examples

### 07. Design System
- [Design System Overview](07-design-system/README.md) - Design system introduction
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
- [Docker Deployment](09-deployment/docker-deployment.md) - Docker Compose setup
- [Production Setup](09-deployment/production-setup.md) - Production configuration
- [Environment Variables](09-deployment/environment-variables.md) - All env vars
- [Security Considerations](09-deployment/security-considerations.md) - Security best practices

### 10. Features
- [Authentication & Authorization](10-features/authentication-authorization.md) - Complete auth system
- [Game Browsing & Filtering](10-features/game-browsing-filtering.md) - Search and filters
- [Game Playing](10-features/game-playing.md) - Playing Flash/HTML5 games
- [Play Session Tracking](10-features/play-session-tracking.md) - Play tracking
- [Playlists & Favorites](10-features/playlists-favorites.md) - Playlist management
- [User Management](10-features/user-management.md) - User administration
- [Role & Permissions](10-features/role-permissions.md) - RBAC system
- [Activity Logging](10-features/activity-logging.md) - Audit logging

### 11. Diagrams
- [System Architecture](11-diagrams/system-architecture.mmd) - Overall architecture
- [Authentication Flow](11-diagrams/authentication-flow.mmd) - Auth flow
- [Game Launch Flow](11-diagrams/game-launch-flow.mmd) - Game launch
- [Play Tracking Flow](11-diagrams/play-tracking-flow.mmd) - Play tracking
- [Service Communication](11-diagrams/service-communication.mmd) - Inter-service comm
- [Database Schema](11-diagrams/database-schema.mmd) - Database ERD
- [Component Hierarchy](11-diagrams/component-hierarchy.mmd) - Frontend components

### 12. Reference
- [Database Schema Reference](12-reference/database-schema-reference.md) - Complete schema
- [Type Definitions](12-reference/type-definitions.md) - All TypeScript types
- [Glossary](12-reference/glossary.md) - Terms and definitions
- [External Dependencies](12-reference/external-dependencies.md) - Third-party libraries

## Quick Links

### For New Developers
1. Start with [Project Overview](01-overview/project-overview.md)
2. Read [Architecture Overview](01-overview/architecture-overview.md)
3. Follow [Setup Guide](08-development/setup-guide.md)
4. Review [Commands](08-development/commands.md)

### For Frontend Developers
- [Frontend Architecture](04-frontend/architecture.md)
- [Component Overview](04-frontend/components/component-overview.md)
- [Design System](07-design-system/README.md)
- [Custom Hooks](04-frontend/hooks/custom-hooks.md)

### For Backend Developers
- [Backend Architecture](03-backend/architecture.md)
- [API Routes](03-backend/routes/api-routes.md)
- [Database Schema](03-backend/database/schema.md)
- [Services Documentation](03-backend/services/)

### For API Integration
- [API Reference](06-api-reference/README.md)
- [Request/Response Examples](06-api-reference/request-response-examples.md)
- [Authentication API](06-api-reference/authentication-api.md)

## Contributing

When updating documentation:
1. Keep code examples up to date with implementation
2. Include file paths for reference
3. Use Mermaid for diagrams where possible
4. Follow the existing structure and style

## Documentation Version

This documentation is for Flashpoint Web v1.0.0 (current development version).

Last updated: 2026-01-18
