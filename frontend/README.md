# Flashpoint Web Frontend

React + TypeScript frontend for browsing and playing Flashpoint Archive games.

## Features

- Browse 200k+ games with pagination
- Full-text search
- Filter by platform, library, tags
- View detailed game information
- Curated playlists
- Responsive design
- Dark theme UI

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend runs on http://localhost:5173

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool & dev server
- **React Router** - Client-side routing
- **TanStack Query** - Server state management
- **Zustand** - UI state management
- **Tailwind CSS** - Styling
- **Axios** - HTTP client

## Architecture

```
src/
├── components/      # Reusable React components
│   ├── layout/     # Layout components (Header, Sidebar)
│   ├── library/    # Game library components
│   ├── search/     # Search and filter components
│   └── common/     # Shared components (Badge, etc.)
├── views/          # Page-level components
├── hooks/          # Custom React hooks
├── lib/            # API client and utilities
├── store/          # Zustand state stores
├── types/          # TypeScript type definitions
└── App.tsx         # Root component
```

## Development

```bash
npm run dev        # Start dev server with HMR
npm run build      # Build for production
npm run preview    # Preview production build
npm run typecheck  # TypeScript checking
npm run lint       # ESLint
```

## API Integration

Frontend communicates with backend API at http://localhost:3001

Vite proxy configuration (in `vite.config.ts`) handles:
- `/api/*` → Backend API endpoints
- `/proxy/*` → Game content proxy

## Component Structure

### Layout Components
- `AppShell` - Main application shell
- `Header` - Top navigation bar
- `Sidebar` - Left navigation sidebar

### Game Components
- `GameGrid` - Grid layout for game cards
- `GameCard` - Individual game card
- `FilterPanel` - Filter controls

### Views
- `BrowseView` - Main game browsing page
- `GameDetailView` - Single game detail page
- `PlaylistsView` - Playlist browser

## State Management

- **Server State** (React Query): Game data, playlists
- **UI State** (Zustand): Sidebar open/closed, view mode
- **URL State** (React Router): Filters, search, pagination

## Styling

Uses Tailwind CSS with custom configuration:
- Dark theme by default
- Custom color scheme
- Responsive breakpoints
- Custom utility classes

## Browser Support

- Chrome 100+
- Firefox 100+
- Safari 15+
- Edge 100+
