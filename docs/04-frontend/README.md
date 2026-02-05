# Frontend Documentation

Modern React 18 single-page application (SPA) built with TypeScript, Vite, and
optimized libraries.

## Tech Stack

- **Framework**: React 18.3 with TypeScript 5.4
- **Build Tool**: Vite 5.2
- **Routing**: React Router 6.22
- **State Management**:
  - TanStack Query v5.28 for server state
  - Zustand 4.5 for UI state
- **Styling**: Tailwind CSS 3.4
- **UI Components**: Shadcn UI (40+ components)
- **Icons**: Lucide React 0.358
- **Form Handling**: React Hook Form 7.71
- **Game Emulation**: Ruffle (Flash emulator)

## Documentation Structure

### Core Documentation

- [architecture.md](./architecture.md) - Frontend architecture patterns
- [views-routing.md](./views-routing.md) - All views, routes, and route
  protection
- [api-client.md](./api-client.md) - Axios client and API endpoints
- [custom-hooks.md](./custom-hooks.md) - 17+ custom hooks with examples

### Components

- [components/component-overview.md](./components/component-overview.md) -
  Component organization
- [components/layout-components.md](./components/layout-components.md) -
  AppShell, Header, Sidebar
- [components/game-components.md](./components/game-components.md) - GameCard,
  GameGrid, list components
- [components/player-components.md](./components/player-components.md) -
  GamePlayer, RufflePlayer
- [components/auth-components.md](./components/auth-components.md) - LoginForm,
  RegisterForm, ProtectedRoute
- [components/ui-components.md](./components/ui-components.md) - Shadcn UI
  reference

### State Management

- [state-management/zustand-stores.md](./state-management/zustand-stores.md) -
  useAuthStore, useThemeStore, useUIStore
- [state-management/react-query.md](./state-management/react-query.md) -
  TanStack Query usage and caching
- [state-management/url-state.md](./state-management/url-state.md) - URL-based
  filter state

### Player Implementation

- [player-implementation/ruffle-player.md](./player-implementation/ruffle-player.md) -
  Flash game player
- [player-implementation/html5-player.md](./player-implementation/html5-player.md) -
  HTML5 game iframe player

## Quick Start

### Development Server

```bash
cd frontend
npm run dev
```

Starts at `http://localhost:5173` with hot module replacement (HMR).

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

All server data (games, playlists, user data) managed through TanStack Query:

- Automatic background refetching
- Optimistic updates
- Request deduplication
- Stale-while-revalidate patterns

### UI State Management

Client-side UI state (sidebar, theme, auth) uses Zustand stores with
localStorage persistence:

- Minimal boilerplate
- TypeScript-first
- DevTools support
- Middleware for persistence

### Type Safety

Fully typed with TypeScript:

- Strict mode enabled
- No implicit any
- Comprehensive type definitions for API responses
- Type-safe form handling

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

The frontend does not require environment variables for local development. API
calls are automatically proxied through Vite to the backend.

**Optional (production builds):**

```bash
VITE_APP_VERSION=1.0.0  # Displayed app version
```

## Project Structure

```
frontend/
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── auth/         # Authentication components
│   │   ├── game/         # Game components
│   │   ├── layout/       # Layout components
│   │   ├── player/       # Game player components
│   │   └── ui/           # Shadcn UI components
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # API client and utilities
│   ├── store/            # Zustand stores
│   ├── types/            # TypeScript types
│   ├── views/            # Page components
│   ├── App.tsx           # Root component with routing
│   └── main.tsx          # Entry point
├── public/               # Static assets
│   └── ruffle/          # Ruffle emulator files
└── index.html           # HTML entry point
```

## Vite Configuration

Dev server proxies `/api/*` to backend:

```typescript
server: {
  proxy: {
    '/api': 'http://localhost:3100',
    '/proxy': 'http://localhost:22500'
  }
}
```

In production, Nginx proxies API requests to the backend container.

## Common Commands

```bash
npm install              # Install dependencies
npm run dev             # Development server with HMR
npm run build           # Production build
npm run preview         # Preview production build
npm run typecheck       # TypeScript type checking
npm run lint            # ESLint code linting
```

## Related Documentation

- [Architecture Documentation](../02-architecture/README.md) - System
  architecture
- [Backend Documentation](../03-backend/README.md) - Backend API reference
- [API Reference](../06-api-reference/README.md) - Complete API documentation
- [Development Workflow](../08-development/setup-guide.md) - Setup guide
