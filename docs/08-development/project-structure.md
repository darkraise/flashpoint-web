# Project Structure

Comprehensive guide to the Flashpoint Web codebase organization.

## Table of Contents

- [Repository Overview](#repository-overview)
- [Backend Structure](#backend-structure)
- [Frontend Structure](#frontend-structure)
- [Game Service Structure](#game-service-structure)
- [Documentation Structure](#documentation-structure)
- [Configuration Files](#configuration-files)
- [Data Directories](#data-directories)

---

## Repository Overview

```
flashpoint-web/
├── backend/                 # REST API service
├── frontend/                # React web application
├── game-service/            # Game content proxy and ZIP server
├── docs/                    # Documentation
├── .claude/                 # Claude AI configurations
├── .vscode/                 # VS Code workspace settings
├── package.json             # Root package.json (monorepo scripts)
├── package-lock.json        # Root lock file
├── docker-compose.yml       # Docker orchestration
├── CLAUDE.md                # Project guidance for Claude AI
└── README.md                # Project overview
```

### Key Characteristics

- **Monorepo**: All services in one repository
- **Workspaces**: npm workspaces for dependency management
- **Independent Services**: Each service can run standalone
- **Shared Documentation**: Centralized docs/ directory

---

## Backend Structure

```
backend/
├── src/
│   ├── config.ts                    # Environment configuration
│   ├── server.ts                    # Express app entry point
│   │
│   ├── middleware/                  # Express middleware
│   │   ├── auth.ts                 # JWT authentication
│   │   ├── rbac.ts                 # Role-based access control
│   │   ├── activityLogger.ts       # User activity logging
│   │   └── errorHandler.ts         # Global error handler
│   │
│   ├── routes/                      # API endpoints
│   │   ├── index.ts                # Route aggregator
│   │   ├── auth.ts                 # /api/auth/* endpoints
│   │   ├── games.ts                # /api/games/* endpoints
│   │   ├── users.ts                # /api/users/* endpoints
│   │   ├── playlists.ts            # /api/playlists/* endpoints
│   │   ├── play-tracking.ts        # /api/play-tracking/* endpoints
│   │   ├── platforms.ts            # /api/platforms/* endpoints
│   │   ├── tags.ts                 # /api/tags/* endpoints
│   │   ├── statistics.ts           # /api/statistics/* endpoints
│   │   ├── roles.ts                # /api/roles/* endpoints
│   │   ├── auth-settings.ts        # /api/auth-settings/* endpoints
│   │   ├── activities.ts           # /api/activities/* endpoints
│   │   ├── community-playlists.ts  # /api/community-playlists/* endpoints
│   │   ├── game-files.ts           # /api/game-files/* endpoints
│   │   ├── downloads.ts            # /api/downloads/* endpoints
│   │   ├── updates.ts              # /api/updates/* endpoints
│   │   ├── database.ts             # /api/database/* endpoints
│   │   └── proxy.ts                # Proxy to game-service
│   │
│   ├── services/                    # Business logic layer
│   │   ├── DatabaseService.ts      # Flashpoint DB connection
│   │   ├── UserDatabaseService.ts  # User DB with migrations
│   │   ├── GameService.ts          # Game metadata queries
│   │   ├── UserService.ts          # User management
│   │   ├── AuthService.ts          # Authentication logic
│   │   ├── PlaylistService.ts      # Playlist CRUD
│   │   ├── PlayTrackingService.ts  # Play session tracking
│   │   ├── RoleService.ts          # RBAC role management
│   │   ├── AuthSettingsService.ts  # Auth configuration
│   │   ├── ActivityService.ts      # Activity logging
│   │   ├── PreferencesService.ts   # User preferences
│   │   ├── StatisticsService.ts    # Usage statistics
│   │   ├── CommunityPlaylistService.ts
│   │   ├── GameFileService.ts      # Game file operations
│   │   ├── DownloadManager.ts      # Download management
│   │   ├── UpdateService.ts        # Update checking
│   │   ├── MetadataUpdateService.ts
│   │   ├── MetadataSyncService.ts
│   │   ├── SyncStatusService.ts
│   │   ├── GameDatabaseUpdater.ts
│   │   ├── GameDataService.ts
│   │   ├── FileImporter.ts
│   │   └── HashValidator.ts
│   │
│   ├── proxy/                       # Legacy proxy code (deprecated)
│   │   ├── server.ts
│   │   ├── http-proxy-server.ts
│   │   ├── gamezipserver.ts
│   │   ├── legacy-server.ts
│   │   ├── proxy-request-handler.ts
│   │   ├── zip-manager.ts
│   │   ├── config.ts
│   │   └── mimeTypes.ts
│   │
│   ├── types/                       # TypeScript type definitions
│   │   └── auth.ts                 # Auth-related types
│   │
│   ├── utils/                       # Utility functions
│   │   ├── logger.ts               # Winston logger setup
│   │   ├── jwt.ts                  # JWT token utilities
│   │   ├── password.ts             # Password hashing (bcrypt)
│   │   └── pagination.ts           # Pagination helpers
│   │
│   └── migrations/                  # Database migrations
│       ├── README.md               # Migration guide
│       ├── 001_user-schema.sql     # Initial user schema
│       └── 002_create-user-settings.sql
│
├── dist/                            # Compiled output (git-ignored)
├── node_modules/                    # Dependencies (git-ignored)
├── user.db                          # User database (git-ignored)
│
├── package.json                     # Backend dependencies & scripts
├── package-lock.json                # Backend lock file
├── tsconfig.json                    # TypeScript configuration
├── .eslintrc.json                   # ESLint configuration
├── vitest.config.ts                 # Vitest test configuration
├── .env                             # Environment variables (git-ignored)
├── .env.example                     # Environment template
└── README.md                        # Backend documentation
```

### Backend Key Patterns

**Service Layer Pattern:**
- Routes handle HTTP concerns (request/response)
- Services contain business logic
- Services interact with databases
- Clear separation of concerns

**File Naming Conventions:**
- Services: `PascalCase.ts` (e.g., `GameService.ts`)
- Routes: `kebab-case.ts` (e.g., `play-tracking.ts`)
- Middleware: `camelCase.ts` (e.g., `errorHandler.ts`)
- Utils: `camelCase.ts` (e.g., `logger.ts`)

**Import Organization:**
```typescript
// 1. Node built-ins
import { readFile } from 'fs/promises';

// 2. External packages
import express from 'express';
import { z } from 'zod';

// 3. Internal modules (absolute paths)
import { DatabaseService } from '@/services/DatabaseService';
import { logger } from '@/utils/logger';

// 4. Types
import type { User } from '@/types/auth';
```

---

## Frontend Structure

```
frontend/
├── src/
│   ├── main.tsx                     # React app entry point
│   ├── App.tsx                      # Root component with routing
│   ├── index.css                    # Global styles (Tailwind)
│   │
│   ├── components/                  # Reusable components
│   │   ├── auth/                   # Authentication components
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   ├── ProtectedRoute.tsx
│   │   │   └── UserMenu.tsx
│   │   │
│   │   ├── common/                 # Common UI components
│   │   │   └── ViewOptions.tsx
│   │   │
│   │   ├── game/                   # Game-specific components
│   │   │   ├── GameDetailsPanel.tsx
│   │   │   ├── GameMetadata.tsx
│   │   │   └── PlatformBadge.tsx
│   │   │
│   │   ├── layout/                 # Layout components
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Navigation.tsx
│   │   │   └── Footer.tsx
│   │   │
│   │   ├── library/                # Game library components
│   │   │   ├── GameCard.tsx
│   │   │   ├── GameGrid.tsx
│   │   │   ├── GameList.tsx
│   │   │   ├── GameTable.tsx
│   │   │   └── GameBrowseLayout.tsx
│   │   │
│   │   ├── player/                 # Game player components
│   │   │   ├── GamePlayer.tsx
│   │   │   ├── RufflePlayer.tsx
│   │   │   ├── HTML5Player.tsx
│   │   │   └── PlayerControls.tsx
│   │   │
│   │   ├── playlist/               # Playlist components
│   │   │   ├── PlaylistCard.tsx
│   │   │   ├── PlaylistEditor.tsx
│   │   │   └── AddToPlaylist.tsx
│   │   │
│   │   ├── search/                 # Search & filter components
│   │   │   ├── SearchBar.tsx
│   │   │   ├── FilterPanel.tsx
│   │   │   └── SortControls.tsx
│   │   │
│   │   ├── settings/               # Settings components
│   │   │   ├── SettingsPanel.tsx
│   │   │   └── PreferencesForm.tsx
│   │   │
│   │   ├── theme/                  # Theme components
│   │   │   ├── ThemePicker.tsx
│   │   │   ├── ThemeToggle.tsx
│   │   │   └── PrimaryColorPicker.tsx
│   │   │
│   │   └── ui/                     # shadcn/ui components
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── dialog.tsx
│   │       ├── dropdown-menu.tsx
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       ├── select.tsx
│   │       ├── separator.tsx
│   │       ├── toast.tsx
│   │       ├── tooltip.tsx
│   │       ├── pagination.tsx
│   │       ├── platform-icon.tsx
│   │       └── ...
│   │
│   ├── views/                       # Page-level components
│   │   ├── HomeView.tsx
│   │   ├── BrowseView.tsx
│   │   ├── GameDetailView.tsx
│   │   ├── GamePlayerView.tsx
│   │   ├── AnimationsView.tsx
│   │   ├── FlashGamesView.tsx
│   │   ├── HTML5GamesView.tsx
│   │   ├── PlaylistsView.tsx
│   │   ├── SettingsView.tsx
│   │   ├── LoginView.tsx
│   │   └── RegisterView.tsx
│   │
│   ├── hooks/                       # Custom React hooks
│   │   ├── useAuth.ts              # Authentication hook
│   │   ├── useGames.ts             # Game data fetching
│   │   ├── usePlaylists.ts         # Playlist operations
│   │   ├── usePlayTracking.ts      # Play session tracking
│   │   ├── useFilterOptions.ts     # Filter state management
│   │   └── useMountEffect.ts       # Mount lifecycle hook
│   │
│   ├── store/                       # Zustand stores
│   │   ├── auth.ts                 # Auth state (user, tokens)
│   │   ├── theme.ts                # Theme preferences
│   │   ├── ui.ts                   # UI state (sidebar, modals)
│   │   └── preferences.ts          # User preferences
│   │
│   ├── lib/                         # Library code
│   │   ├── api.ts                  # API client (axios)
│   │   ├── utils.ts                # Utility functions
│   │   └── date-utils.ts           # Date formatting
│   │
│   ├── types/                       # TypeScript types
│   │   ├── game.ts                 # Game-related types
│   │   ├── user.ts                 # User types
│   │   ├── playlist.ts             # Playlist types
│   │   └── api.ts                  # API response types
│   │
│   └── assets/                      # Static assets
│       ├── images/
│       └── icons/
│
├── public/                          # Static files served as-is
│   ├── ruffle/                     # Ruffle emulator files
│   │   ├── ruffle.js
│   │   └── ruffle.wasm
│   ├── favicon.ico
│   └── ...
│
├── dist/                            # Production build output (git-ignored)
├── node_modules/                    # Dependencies (git-ignored)
│
├── package.json                     # Frontend dependencies & scripts
├── package-lock.json                # Frontend lock file
├── tsconfig.json                    # TypeScript config (bundler mode)
├── tsconfig.node.json               # TypeScript config for Vite
├── vite.config.ts                   # Vite configuration
├── tailwind.config.js               # Tailwind CSS config
├── postcss.config.js                # PostCSS config
├── .eslintrc.json                   # ESLint configuration
├── .env                             # Environment variables (git-ignored)
├── .env.example                     # Environment template
└── README.md                        # Frontend documentation
```

### Frontend Key Patterns

**Component Organization:**
- Domain-driven folders (auth, library, player, etc.)
- One component per file
- Co-locate related components
- Shared UI components in `ui/`

**File Naming Conventions:**
- Components: `PascalCase.tsx` (e.g., `GameCard.tsx`)
- Hooks: `camelCase.ts` with `use` prefix (e.g., `useAuth.ts`)
- Stores: `camelCase.ts` (e.g., `auth.ts`)
- Utils: `kebab-case.ts` (e.g., `date-utils.ts`)

**Component Structure:**
```tsx
// 1. Imports
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

// 2. Types
interface GameCardProps {
  game: Game;
  onPlay: (gameId: string) => void;
}

// 3. Component
export function GameCard({ game, onPlay }: GameCardProps) {
  // Hooks
  const { user } = useAuth();
  const [isHovered, setIsHovered] = useState(false);

  // Event handlers
  const handleClick = () => {
    onPlay(game.id);
  };

  // Render
  return (
    <div>...</div>
  );
}
```

**State Management Strategy:**
- **Server State**: React Query (games, users, playlists)
- **UI State**: Zustand stores (sidebar, theme, modals)
- **URL State**: React Router search params (filters, pagination)
- **Local State**: useState/useReducer (component-specific)

---

## Game Service Structure

```
game-service/
├── src/
│   ├── index.ts                     # Entry point
│   ├── config.ts                    # Environment configuration
│   │
│   ├── servers/                     # HTTP servers
│   │   ├── proxy-server.ts         # Main proxy server (22500)
│   │   └── gamezip-server.ts       # ZIP file server (22501)
│   │
│   ├── handlers/                    # Request handlers
│   │   ├── proxy-handler.ts        # Proxy request logic
│   │   ├── file-handler.ts         # File serving logic
│   │   └── zip-handler.ts          # ZIP extraction logic
│   │
│   ├── services/                    # Business logic
│   │   ├── zip-manager.ts          # ZIP file management
│   │   ├── mime-types.ts           # MIME type detection
│   │   └── cache-manager.ts        # CDN cache management
│   │
│   └── utils/                       # Utilities
│       ├── logger.ts               # Winston logger
│       ├── path-utils.ts           # Path normalization
│       └── url-utils.ts            # URL processing
│
├── dist/                            # Compiled output (git-ignored)
├── node_modules/                    # Dependencies (git-ignored)
│
├── package.json                     # Dependencies & scripts
├── package-lock.json                # Lock file
├── tsconfig.json                    # TypeScript configuration
├── .env                             # Environment variables (git-ignored)
├── .env.example                     # Environment template
└── README.md                        # Game service documentation
```

### Game Service Key Patterns

**Two-Server Architecture:**
1. **Proxy Server (22500)**: Handles HTTP proxy requests with fallback chain
2. **GameZip Server (22501)**: Serves files directly from ZIP archives

**File Naming Conventions:**
- Servers: `kebab-case.ts` (e.g., `proxy-server.ts`)
- Handlers: `kebab-case.ts` (e.g., `file-handler.ts`)
- Services: `kebab-case.ts` (e.g., `zip-manager.ts`)
- Utils: `kebab-case.ts` (e.g., `path-utils.ts`)

---

## Documentation Structure

```
docs/
├── README.md                        # Documentation overview
│
├── 01-overview/                     # Project overview
│   ├── project-overview.md
│   ├── technology-stack.md
│   ├── architecture-overview.md
│   └── getting-started.md
│
├── 02-architecture/                 # Architecture documentation
│   ├── README.md
│   ├── system-architecture.md
│   ├── service-communication.md
│   ├── data-flow-diagrams.md
│   ├── authentication-flow.md
│   ├── game-launch-flow.md
│   └── play-tracking-flow.md
│
├── 03-backend/                      # Backend documentation
│   ├── README.md
│   ├── INDEX.md
│   ├── architecture.md
│   ├── configuration.md
│   ├── api-routes.md
│   ├── services/
│   │   ├── database-service.md
│   │   └── user-database-service.md
│   └── database/
│       └── schema.md
│
├── 04-frontend/                     # Frontend documentation
│   ├── README.md
│   ├── INDEX.md
│   ├── architecture.md
│   ├── views-routing.md
│   ├── custom-hooks.md
│   ├── api-client.md
│   ├── components/
│   │   ├── component-overview.md
│   │   ├── layout-components.md
│   │   ├── player-components.md
│   │   ├── game-components.md
│   │   ├── auth-components.md
│   │   └── ui-components.md
│   ├── state-management/
│   │   ├── zustand-stores.md
│   │   ├── react-query.md
│   │   └── url-state.md
│   └── player-implementation/
│       ├── ruffle-player.md
│       └── html5-player.md
│
├── 05-game-service/                 # Game service documentation
│   ├── README.md
│   ├── architecture.md
│   ├── configuration.md
│   ├── proxy-server.md
│   ├── gamezip-server.md
│   ├── zip-manager.md
│   ├── mime-types.md
│   ├── html-polyfills.md
│   └── legacy-server.md
│
└── 08-development/                  # Developer documentation
    ├── README.md                    # This directory overview
    ├── setup-guide.md               # Development setup
    ├── commands.md                  # Command reference
    ├── project-structure.md         # This file
    ├── coding-standards.md          # Code style guide
    ├── testing-guide.md             # Testing practices
    ├── debugging.md                 # Debugging guide
    └── common-pitfalls.md           # Known issues & solutions
```

### Documentation Standards

- Markdown format (.md files)
- Clear hierarchy with numbered directories
- README.md or INDEX.md in each section
- Cross-references with relative links
- Code examples with syntax highlighting

---

## Configuration Files

### Root Level

```
.
├── package.json                     # Monorepo scripts & workspaces
├── package-lock.json                # Dependency lock file
├── docker-compose.yml               # Docker orchestration
├── .gitignore                       # Git ignore patterns
├── .dockerignore                    # Docker ignore patterns
├── CLAUDE.md                        # AI assistant guidance
└── README.md                        # Project overview
```

### Backend Configuration

```
backend/
├── tsconfig.json                    # TypeScript compiler config
├── .eslintrc.json                   # ESLint rules
├── vitest.config.ts                 # Test configuration
├── .env                             # Environment variables (git-ignored)
└── .env.example                     # Environment template
```

### Frontend Configuration

```
frontend/
├── tsconfig.json                    # TypeScript config (app)
├── tsconfig.node.json               # TypeScript config (Vite)
├── vite.config.ts                   # Vite bundler config
├── tailwind.config.js               # Tailwind CSS config
├── postcss.config.js                # PostCSS config
├── .eslintrc.json                   # ESLint rules
├── .env                             # Environment variables (git-ignored)
└── .env.example                     # Environment template
```

### Game Service Configuration

```
game-service/
├── tsconfig.json                    # TypeScript compiler config
├── .env                             # Environment variables (git-ignored)
└── .env.example                     # Environment template
```

---

## Data Directories

### Flashpoint Installation Structure

```
D:/Flashpoint/                       # FLASHPOINT_PATH
├── Data/
│   ├── flashpoint.sqlite           # Game metadata database
│   ├── Images/                     # Game screenshots
│   ├── Logos/                      # Game logos/icons
│   ├── Playlists/                  # Playlist files
│   └── Games/                      # Game ZIP archives
│       ├── game1.zip
│       ├── game2.zip
│       └── ...
│
└── Legacy/
    └── htdocs/                     # Legacy web content
        ├── file1.swf
        ├── file2.html
        └── ...
```

### Application Data

```
backend/
├── user.db                          # User database (SQLite)
└── logs/                            # Application logs (optional)
    ├── combined.log
    └── error.log

game-service/
└── cache/                           # CDN cache directory (optional)
    ├── file1.swf
    └── file2.html
```

---

## Import Path Aliases

All services use TypeScript path aliases for cleaner imports.

### Backend Alias

```typescript
// tsconfig.json
{
  "paths": {
    "@/*": ["src/*"]
  }
}

// Usage
import { GameService } from '@/services/GameService';
import { logger } from '@/utils/logger';
import { authMiddleware } from '@/middleware/auth';
```

### Frontend Alias

```typescript
// tsconfig.json
{
  "paths": {
    "@/*": ["src/*"]
  }
}

// Usage
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
```

---

## Build Output Structure

### Backend Build (dist/)

```
backend/dist/
├── server.js                        # Entry point
├── server.js.map                    # Source map
├── server.d.ts                      # Type declarations
├── config.js
├── middleware/
├── routes/
├── services/
├── types/
└── utils/
```

### Frontend Build (dist/)

```
frontend/dist/
├── index.html                       # Entry HTML
├── assets/
│   ├── index-[hash].js             # Main bundle
│   ├── index-[hash].css            # Styles
│   ├── vendor-[hash].js            # Vendor bundle
│   └── ...                         # Other chunks
└── ruffle/                         # Ruffle emulator files
```

### Game Service Build (dist/)

```
game-service/dist/
├── index.js                         # Entry point
├── config.js
├── servers/
├── handlers/
├── services/
└── utils/
```

---

## Additional Resources

- [Commands Reference](./commands.md) - All npm commands
- [Coding Standards](./coding-standards.md) - Code style guidelines
- [Backend Architecture](../03-backend/architecture.md) - Backend deep dive
- [Frontend Architecture](../04-frontend/architecture.md) - Frontend deep dive
- [Game Service Architecture](../05-game-service/architecture.md) - Game service details
