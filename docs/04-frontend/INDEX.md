# Frontend Documentation Index

Complete navigation guide for all frontend documentation.

## Quick Links

- [README](./README.md) - Frontend overview and quick start
- [Architecture](./architecture.md) - Frontend architecture patterns and design decisions

## Core Documentation

### 1. Architecture & Patterns
- **[Architecture](./architecture.md)** - Component architecture, state management strategy, routing, API integration
- **[README](./README.md)** - Tech stack, project structure, development guide

### 2. Components

#### Overview
- **[Component Overview](./components/component-overview.md)** - Organization, design patterns, naming conventions, best practices

#### Layout Components
- **[Layout Components](./components/layout-components.md)**
  - AppShell - Main application layout container
  - Header - Top navigation with search, theme, user menu
  - Sidebar - Collapsible navigation with route highlighting

#### Game Components
- **[Game Components](./components/game-components.md)**
  - GameCard - Card view for games
  - GameGrid - Responsive grid layout
  - GameList - List view
  - GameBrowseLayout - Complete browse layout
  - GameInfoGrid - Detailed game info

#### Player Components
- **[Player Components](./components/player-components.md)**
  - GamePlayer - Universal game player wrapper
  - RufflePlayer - Flash emulator component

#### Auth Components
- **[Auth Components](./components/auth-components.md)**
  - ProtectedRoute - Route authorization wrapper
  - LoginForm - User login form
  - RegisterForm - User registration form
  - RoleGuard - Permission-based rendering

#### UI Components
- **[UI Components](./components/ui-components.md)**
  - Shadcn UI library (40+ components)
  - Button, Card, Dialog, Dropdown Menu
  - Form components, Table, Toast
  - Complete component reference

### 3. State Management

- **[Zustand Stores](./state-management/zustand-stores.md)**
  - useAuthStore - Authentication, JWT tokens, permissions
  - useThemeStore - Theme mode, primary color
  - useUIStore - Sidebar, view modes, card sizes

- **[React Query](./state-management/react-query.md)**
  - Query configuration and patterns
  - Mutations and optimistic updates
  - Stale time strategies
  - Cache invalidation

- **[URL State](./state-management/url-state.md)**
  - Filter management in URL
  - Pagination state
  - Shareable URLs
  - Browser navigation

### 4. Custom Hooks

- **[Custom Hooks](./custom-hooks.md)**
  - Data fetching hooks (useGames, usePlaylists, useUsers)
  - Authentication hook (useAuth)
  - Utility hooks (useDebounce, useSwipeGesture, useMountEffect)
  - Play tracking (usePlayTracking)

### 5. Views & Routing

- **[Views and Routing](./views-routing.md)**
  - All 15+ views documented
  - Route structure and protection
  - Public vs authenticated vs permission-based routes
  - Navigation patterns

### 6. API Integration

- **[API Client](./api-client.md)**
  - Axios client configuration
  - Request/response interceptors
  - All API modules (games, auth, playlists, users, roles, etc.)
  - Error handling and type safety

### 7. Player Implementation

- **[Ruffle Player](./player-implementation/ruffle-player.md)**
  - Flash emulator setup
  - Configuration options
  - Scale modes
  - Cleanup strategies
  - Troubleshooting

- **[HTML5 Player](./player-implementation/html5-player.md)**
  - Iframe implementation
  - Sandbox security
  - Feature policies
  - Error handling

## Documentation by Feature

### Authentication & Authorization
1. [Auth Store](./state-management/zustand-stores.md#useauthstore)
2. [Auth Components](./components/auth-components.md)
3. [ProtectedRoute](./components/auth-components.md#protectedroute)
4. [useAuth Hook](./custom-hooks.md#useauth)
5. [Auth API](./api-client.md#authapi)

### Game Browsing
1. [Game Components](./components/game-components.md)
2. [Browse Views](./views-routing.md#browsev iew)
3. [useGames Hook](./custom-hooks.md#usegames)
4. [Games API](./api-client.md#gamesapi)
5. [URL State Management](./state-management/url-state.md)

### Game Playing
1. [Player Components](./components/player-components.md)
2. [Ruffle Player](./player-implementation/ruffle-player.md)
3. [HTML5 Player](./player-implementation/html5-player.md)
4. [GamePlayerView](./views-routing.md#gameplayerview)
5. [Play Tracking](./custom-hooks.md#useplaytracking)

### Theming
1. [Theme Store](./state-management/zustand-stores.md#usethemestore)
2. [Theme Components](./components/layout-components.md#header)
3. [21 Color Palettes](./state-management/zustand-stores.md#primary-colors)

### User Management
1. [Users View](./views-routing.md#usersview)
2. [Roles View](./views-routing.md#rolesview)
3. [Users API](./api-client.md#usersapi)
4. [Roles API](./api-client.md#rolesapi)

## File Locations

```
docs/04-frontend/
├── README.md                      # Frontend overview
├── INDEX.md                       # This file
├── architecture.md                # Architecture patterns
├── custom-hooks.md                # All custom hooks
├── views-routing.md               # Views and routes
├── api-client.md                  # API client
│
├── components/                    # Component documentation
│   ├── component-overview.md     # Component patterns
│   ├── layout-components.md      # AppShell, Header, Sidebar
│   ├── game-components.md        # Game browsing components
│   ├── player-components.md      # Player components
│   ├── auth-components.md        # Auth components
│   └── ui-components.md          # Shadcn UI library
│
├── state-management/              # State management
│   ├── zustand-stores.md         # Zustand stores
│   ├── react-query.md            # TanStack Query
│   └── url-state.md              # URL state
│
└── player-implementation/         # Player docs
    ├── ruffle-player.md          # Flash player
    └── html5-player.md           # HTML5 player
```

## Related Documentation

- **[Project Overview](../01-overview/README.md)** - Project introduction
- **[System Architecture](../02-architecture/README.md)** - Overall system design
- **[Backend Documentation](../03-backend/README.md)** - Backend API server
- **[Game Service](../05-game-service/README.md)** - Game content proxy
- **[API Reference](../06-api-reference/README.md)** - Complete API docs
- **[Development Guide](../08-development/README.md)** - Setup and development

## Key Concepts

### Component Patterns
- Composition over inheritance
- Controlled components
- Type-safe props
- Skeleton loading states

### State Management
- Server state via React Query
- UI state via Zustand
- URL state via React Router
- Three-tier approach

### Performance
- Code splitting at routes
- Lazy loading images
- Request deduplication
- Memoization strategies

### Type Safety
- Strict TypeScript mode
- No implicit any
- Comprehensive type definitions
- Type-safe API calls

## Getting Help

- Check [README](./README.md) for quick start
- Review [Architecture](./architecture.md) for patterns
- See [Component Overview](./components/component-overview.md) for component structure
- Read [Custom Hooks](./custom-hooks.md) for hook usage
- Consult [API Client](./api-client.md) for API integration

## Contributing

When adding new documentation:
1. Follow existing structure and format
2. Include code examples
3. Document props/parameters
4. Add usage examples
5. Link related documentation
6. Update this index
