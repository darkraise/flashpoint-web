# Frontend Documentation

This directory contains comprehensive documentation for the Flashpoint Web frontend application.

## Overview

The frontend is a modern React 18 single-page application (SPA) built with TypeScript, Vite, and a carefully selected stack of libraries optimized for performance and developer experience.

## Tech Stack

- **Framework**: React 18.3.1 with TypeScript 5.6.2
- **Build Tool**: Vite 5.4.11
- **Routing**: React Router 6.28.0
- **State Management**:
  - TanStack Query (React Query) v5.62.7 for server state
  - Zustand 5.0.2 for UI state
  - URL state via React Router search params
- **Styling**: Tailwind CSS 3.4.15
- **UI Components**: Shadcn UI (40+ components)
- **Icons**: Lucide React 0.468.0
- **Form Handling**: React Hook Form 7.54.0
- **Game Emulation**: Ruffle (Flash emulator)

## Documentation Structure

### Architecture

- [architecture.md](./architecture.md) - Frontend architecture patterns, design decisions, and project structure

### Components

- [components/component-overview.md](./components/component-overview.md) - Component organization and structure
- [components/layout-components.md](./components/layout-components.md) - AppShell, Header, Sidebar, navigation components
- [components/game-components.md](./components/game-components.md) - GameCard, GameGrid, GameBrowseLayout, list components
- [components/player-components.md](./components/player-components.md) - GamePlayer, RufflePlayer with cleanup strategies
- [components/auth-components.md](./components/auth-components.md) - LoginForm, RegisterForm, ProtectedRoute
- [components/ui-components.md](./components/ui-components.md) - Shadcn UI component library reference

### Views

- [views-routing.md](./views-routing.md) - All views, routes, and route protection patterns

### State Management

- [state-management/zustand-stores.md](./state-management/zustand-stores.md) - useAuthStore, useThemeStore, useUIStore with persistence
- [state-management/react-query.md](./state-management/react-query.md) - TanStack Query usage, caching strategies, stale times
- [state-management/url-state.md](./state-management/url-state.md) - URL-based filter state with React Router

### Hooks

- [custom-hooks.md](./custom-hooks.md) - All 17+ custom hooks with usage examples and patterns

### API Integration

- [api-client.md](./api-client.md) - Axios client, interceptors, all API endpoints, error handling

### Player Implementation

- [player-implementation/ruffle-player.md](./player-implementation/ruffle-player.md) - Flash game player with cleanup, configuration, scale modes
- [player-implementation/html5-player.md](./player-implementation/html5-player.md) - HTML5 game iframe player with sandboxing

## Quick Start

### Development Server

```bash
cd frontend
npm run dev
```

The development server will start at `http://localhost:5173` with hot module replacement (HMR).

### Building for Production

```bash
npm run build
```

Outputs to `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

### Type Checking

```bash
npm run typecheck
```

## Key Features

### Server State Management

All server data (games, playlists, user data) is managed through TanStack Query with intelligent caching:

- Automatic background refetching
- Optimistic updates
- Request deduplication
- Stale-while-revalidate patterns

### UI State Management

Client-side UI state (sidebar visibility, theme, auth) uses Zustand stores with localStorage persistence:

- Simple, minimal boilerplate
- TypeScript-first
- DevTools support
- Middleware for persistence

### Type Safety

The application is fully typed with TypeScript:

- Strict mode enabled
- No implicit any
- Comprehensive type definitions for all API responses
- Type-safe form handling with React Hook Form

### Performance Optimizations

- Code splitting at route level
- Lazy loading for images and components
- Virtual scrolling for large game lists
- Memoization for expensive computations
- Request deduplication and caching

### Accessibility

- ARIA labels on all interactive elements
- Keyboard navigation support
- Focus management
- Screen reader announcements

## Environment Variables

Frontend environment variables are injected at build time via Vite:

```bash
VITE_API_URL=http://localhost:3100
```

See `frontend/.env.example` for all available variables.

## Project Structure

```
frontend/
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── auth/         # Authentication components
│   │   ├── common/       # Common/shared components
│   │   ├── game/         # Game-specific components
│   │   ├── layout/       # Layout components (Header, Sidebar, AppShell)
│   │   ├── library/      # Game library components
│   │   ├── player/       # Game player components
│   │   ├── playlist/     # Playlist components
│   │   ├── search/       # Search and filter components
│   │   ├── stats/        # Statistics and charts
│   │   ├── theme/        # Theme picker components
│   │   └── ui/           # Shadcn UI components (40+)
│   ├── contexts/         # React contexts
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utilities and API client
│   ├── store/            # Zustand stores
│   ├── types/            # TypeScript type definitions
│   ├── views/            # Page components
│   ├── App.tsx           # Root component with routing
│   └── main.tsx          # Entry point
├── public/               # Static assets
│   ├── images/          # Images (logo, icons)
│   └── ruffle/          # Ruffle emulator files
└── index.html           # HTML entry point
```

## Further Reading

- [CLAUDE.md](../../CLAUDE.md) - Project-wide development guide
- [Architecture Documentation](../02-architecture/README.md) - System architecture
- [Backend Documentation](../03-backend/README.md) - Backend API reference
- [API Reference](../06-api-reference/README.md) - Complete API documentation
