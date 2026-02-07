# Project Structure

Flashpoint Web codebase organization.

## Repository Overview

```
flashpoint-web/
├── backend/                 # REST API service (Express/TypeScript, port 3100)
├── frontend/                # React web application (Vite, port 5173)
├── docs/                    # Documentation (100+ files)
├── package.json             # Monorepo scripts & workspaces
├── docker-compose.yml       # Docker orchestration
├── CLAUDE.md                # AI assistant guidance
└── README.md                # Project overview
```

**Key:** Monorepo with two independent services and centralized documentation. Game service merged into backend.

---

## Backend Structure

```
backend/
├── src/
│   ├── config.ts                 # Environment configuration
│   ├── server.ts                 # Express app entry point
│   │
│   ├── middleware/               # Express middleware
│   │   ├── auth.ts              # JWT authentication
│   │   ├── rbac.ts              # Role-based access control
│   │   └── errorHandler.ts      # Global error handling
│   │
│   ├── routes/                   # API endpoints
│   │   ├── auth.ts              # /api/auth/*
│   │   ├── games.ts             # /api/games/*
│   │   ├── users.ts             # /api/users/*
│   │   ├── playlists.ts         # /api/playlists/*
│   │   ├── play-tracking.ts     # /api/play-tracking/*
│   │   └── ... (other routes)
│   │
│   ├── game/                     # Game service (merged from game-service/)
│   │   ├── handlers/             # Request handlers
│   │   ├── services/             # Game-related services
│   │   ├── utils/                # Game utilities
│   │   └── ... (game-specific code)
│   │
│   ├── services/                 # Business logic layer
│   │   ├── DatabaseService.ts   # Flashpoint DB (read-only)
│   │   ├── UserDatabaseService.ts # User DB with migrations
│   │   ├── GameService.ts       # Game queries
│   │   ├── AuthService.ts       # Authentication
│   │   ├── PlaylistService.ts   # Playlists
│   │   ├── PlayTrackingService.ts # Play sessions
│   │   └── ... (other services)
│   │
│   ├── types/                    # TypeScript definitions
│   │   └── auth.ts              # Auth types
│   │
│   ├── utils/                    # Utility functions
│   │   ├── logger.ts            # Winston logger
│   │   ├── jwt.ts               # JWT utilities
│   │   ├── password.ts          # Password hashing
│   │   └── pagination.ts        # Pagination helpers
│   │
│   └── migrations/               # Database migrations (SQL)
│       ├── 001_initialize_schema.sql
│       └── 002_seed_default_data.sql
│
├── dist/                         # Build output (git-ignored)
├── user.db                       # User database (git-ignored)
├── package.json
├── tsconfig.json
├── .eslintrc.json
├── vitest.config.ts
├── .env.example
└── README.md
```

**Patterns:**

- Services: `PascalCase.ts` (e.g., `GameService.ts`)
- Routes: `kebab-case.ts` (e.g., `play-tracking.ts`)
- Middleware/Utils: `camelCase.ts`

---

## Frontend Structure

```
frontend/
├── src/
│   ├── main.tsx                  # React entry point
│   ├── App.tsx                   # Root component with routing
│   ├── index.css                 # Global styles (Tailwind)
│   │
│   ├── components/               # Reusable components
│   │   ├── auth/                # Login, register, protected route
│   │   ├── layout/              # Header, sidebar, navigation
│   │   ├── library/             # Game cards, grids, lists
│   │   ├── player/              # Game player components
│   │   ├── playlist/            # Playlist management
│   │   ├── search/              # Search & filters
│   │   ├── settings/            # Settings panels
│   │   ├── theme/               # Theme picker
│   │   └── ui/                  # shadcn/ui components
│   │
│   ├── views/                    # Page-level components
│   │   ├── HomeView.tsx
│   │   ├── BrowseView.tsx
│   │   ├── GameDetailView.tsx
│   │   ├── GamePlayerView.tsx
│   │   ├── PlaylistsView.tsx
│   │   ├── SettingsView.tsx
│   │   └── ... (other views)
│   │
│   ├── hooks/                    # Custom React hooks
│   │   ├── useAuth.ts           # Authentication
│   │   ├── useGames.ts          # Game data fetching
│   │   ├── usePlaylists.ts      # Playlist operations
│   │   └── usePlayTracking.ts   # Play session tracking
│   │
│   ├── store/                    # Zustand stores
│   │   ├── auth.ts              # User & auth state
│   │   ├── theme.ts             # Theme preferences
│   │   ├── ui.ts                # UI state
│   │   └── preferences.ts       # User preferences
│   │
│   ├── lib/                      # Library code
│   │   ├── api.ts               # Axios client (authenticated)
│   │   ├── utils.ts             # Utilities
│   │   └── date-utils.ts        # Date formatting
│   │
│   ├── types/                    # TypeScript types
│   │   ├── game.ts
│   │   ├── user.ts
│   │   ├── playlist.ts
│   │   └── api.ts
│   │
│   └── assets/                   # Static assets
│       ├── images/
│       └── icons/
│
├── public/                       # Static files
│   ├── ruffle/                  # Ruffle emulator
│   ├── favicon.ico
│   └── ...
│
├── dist/                         # Build output (git-ignored)
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── .eslintrc.json
├── .env.example
└── README.md
```

**Patterns:**

- Components: `PascalCase.tsx`
- Hooks: `useXxxx.ts`
- Stores: `camelCase.ts`
- Utils: `kebab-case.ts`

---

## Documentation Structure

```
docs/
├── 01-overview/                  # Project overview
├── 02-architecture/              # System architecture & flows
├── 03-backend/                   # Backend documentation
├── 04-frontend/                  # Frontend documentation
│
└── 08-development/               # Developer documentation
    ├── setup-guide.md            # Development setup
    ├── commands.md               # Command reference
    ├── project-structure.md      # This file
    ├── coding-standards.md       # Code style guide
    ├── testing-guide.md          # Testing practices
    ├── debugging.md              # Debugging tips
    └── common-pitfalls.md        # Known issues
```

---

## Configuration Files

### Root

- `package.json` - Monorepo scripts
- `package-lock.json` - Dependency lock
- `docker-compose.yml` - Docker services
- `CLAUDE.md` - AI guidance
- `README.md` - Project overview

### Backend

- `tsconfig.json` - TypeScript config
- `.eslintrc.json` - ESLint rules
- `vitest.config.ts` - Test config
- `.env.example` - Environment template

### Frontend

- `tsconfig.json` - TypeScript config (app)
- `tsconfig.node.json` - TypeScript config (Vite)
- `vite.config.ts` - Vite bundler
- `tailwind.config.js` - Tailwind CSS
- `postcss.config.js` - PostCSS
- `.eslintrc.json` - ESLint rules

---

## Data Directories

### Flashpoint Installation (FLASHPOINT_PATH)

```
D:/Flashpoint/
├── Data/
│   ├── flashpoint.sqlite        # Game metadata (read-only)
│   ├── Images/                  # Game screenshots
│   ├── Logos/                   # Game logos
│   ├── Playlists/               # Playlist files
│   └── Games/                   # Game ZIP archives
│
└── Legacy/
    └── htdocs/                  # Legacy web content (Flash files)
```

### Application Data

```
backend/
├── user.db                      # User database
└── logs/                        # Application logs (optional)
```

---

## Import Path Aliases

All services use TypeScript `@` alias for cleaner imports:

```typescript
// Backend
import { GameService } from '@/services/GameService';
import { logger } from '@/utils/logger';

// Frontend
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
```

---

## Build Output

### Backend (dist/)

- server.js - Entry point
- Compiled JavaScript files
- Type declarations (.d.ts)
- Source maps (.js.map)

### Frontend (dist/)

- index.html - Entry point
- assets/ - Minified JS, CSS, hashed bundles
- ruffle/ - Ruffle emulator files


---

## Additional Resources

- [Commands Reference](./commands.md)
- [Coding Standards](./coding-standards.md)
- [Setup Guide](./setup-guide.md)
