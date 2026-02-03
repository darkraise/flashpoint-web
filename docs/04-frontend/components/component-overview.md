# Component Overview

This document provides an overview of the component architecture and organization in the Flashpoint Web frontend.

## Component Organization

Components are organized by domain and functionality:

```
components/
├── auth/              # Authentication components (4 components)
├── common/            # Shared/utility components (11 components)
├── dialogs/           # Modal dialogs (1 component)
├── game/              # Game-specific components (1 component)
├── layout/            # Layout structure (3 components)
├── library/           # Game browsing/display (9 components)
├── player/            # Game players (2 components)
├── playlist/          # Playlist management (3 components)
│   └── SharePlaylistDialog includes domain selector for admins
├── roles/             # Role management (2 components)
├── search/            # Search and filtering (2 components)
├── settings/          # Settings tabs including AppSettingsTab with Domain Settings
├── stats/             # Statistics/charts (4 components)
├── theme/             # Theme controls (2 components)
├── ui/                # Shadcn UI primitives (40+ components)
└── users/             # User management (3 components)
```

## Component Categories

### Authentication Components

Located in `components/auth/`

- **LoginForm** - User login form with validation
- **RegisterForm** - User registration form
- **ProtectedRoute** - Route wrapper for authorization
- **AuthContext** - Authentication context provider

### Common Components

Located in `components/common/`

- **FormattedDate** - Reusable date/time formatting component with user preferences
- **CardSizeControl** - Control for adjusting card size in grid views
- **ConfirmDialog** - Generic confirmation dialog for destructive actions
- **ErrorBoundary** - Error boundary wrapper for graceful error handling
- **FavoriteButton** - Button to add games to favorites
- **RemoveFavoriteButton** - Button to remove games from favorites
- **MaintenanceGuard** - Component to display maintenance mode message
- **MobileWarningDialog** - Warning for mobile users about limited functionality
- **NetworkStatusIndicator** - Shows online/offline network status
- **RoleGuard** - Component wrapper for role-based access control
- **ViewOptions** - Toggle between list and grid view modes

### Playlist Components

Located in `components/playlist/`

- **SharePlaylistDialog** - Dialog for sharing playlists via URL. Admin users see a domain selector dropdown to choose which domain to use for the share link. Non-admin users use the default domain from public settings. Share URLs are constructed client-side via the `buildShareUrl()` utility.
- Other playlist management components...

### Settings Components

Located in `components/settings/`

- **AppSettingsTab** - Application settings including Site Name, Maintenance Mode, Theme, and **Domain Settings**. The Domain Settings card allows admins to add/delete domains and set a default via radio buttons, with hostname validation.
- Other settings tabs...

### Layout Components

Located in `components/layout/`

- **AppShell** - Main application layout container
- **Header** - Top navigation bar with search, theme picker, user menu
- **Sidebar** - Collapsible side navigation with route-based highlighting

### Game Components

Located in `components/library/` and `components/game/`

- **GameCard** - Card view for individual games
- **GameGrid** - Responsive grid layout for game cards
- **GameList** - List view for games
- **GameListItem** - Individual list item
- **GameBrowseLayout** - Complete browse layout with filters and pagination
- **GameInfoGrid** - Detailed game information display

### Player Components

Located in `components/player/`

- **GamePlayer** - Universal game player wrapper
- **RufflePlayer** - Flash game emulator component

### UI Components

Located in `components/ui/`

The application uses [Shadcn UI](https://ui.shadcn.com/) - a collection of re-usable components built with Radix UI and Tailwind CSS. These are copied into the project and can be customized.

**40+ components including:**
- Button, Input, Textarea, Select, Checkbox, Switch
- Dialog, Alert Dialog, Sheet, Popover, Dropdown Menu
- Card, Badge, Avatar, Separator, Skeleton
- Table, Data Table, Pagination
- Toast, Sonner (notifications)
- Form components with React Hook Form integration

## Component Design Patterns

### 1. Composition Pattern

Components use composition for flexibility:

```typescript
<Card>
  <CardHeader>
    <CardTitle>Game Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
  <CardFooter>
    {/* Actions */}
  </CardFooter>
</Card>
```

### 2. Controlled Components

Components receive state via props and notify parent of changes:

```typescript
interface FilterPanelProps {
  filters: GameFilters;
  onFiltersChange: (filters: GameFilters) => void;
}

export function FilterPanel({ filters, onFiltersChange }: FilterPanelProps) {
  // Component is controlled by parent
}
```

### 3. Render Props

Flexible rendering through render props:

```typescript
interface GameBrowseLayoutProps {
  renderHeader?: () => React.ReactNode;
  renderActions?: () => React.ReactNode;
  renderFilters?: () => React.ReactNode;
}
```

### 4. TypeScript Props

All components are fully typed:

```typescript
interface GameCardProps {
  game: Game;
  onAddToPlaylist?: (gameId: string) => void;
  onToggleFavorite?: (gameId: string) => void;
  isFavorited?: boolean;
  showFavoriteOnHoverOnly?: boolean;
}
```

### 5. Skeleton Loading States

All data components have corresponding skeleton loaders:

```typescript
// GameCard.tsx
export function GameCard({ game }: GameCardProps) { /* ... */ }

// GameCardSkeleton.tsx
export function GameCardSkeleton() {
  return <Skeleton className="h-full w-full" />;
}
```

## Component Naming Conventions

### File Naming

- **PascalCase** for component files: `GameCard.tsx`, `UserTable.tsx`
- **camelCase** for utility files: `api.ts`, `utils.ts`
- **kebab-case** for UI primitive files: `dropdown-menu.tsx`, `alert-dialog.tsx`

### Component Exports

```typescript
// Named export (preferred for main components)
export function GameCard({ game }: GameCardProps) { /* ... */ }

// Default export (used for views/pages)
export default function BrowseView() { /* ... */ }
```

## Component Props Best Practices

### Optional vs Required Props

```typescript
interface GamePlayerProps {
  // Required props
  title: string;
  platform: string;
  canPlayInBrowser: boolean;

  // Optional props with defaults
  allowFullscreen?: boolean;  // Default: true
  showControls?: boolean;     // Default: true
  height?: string;            // Default: 'calc(100vh - 220px)'

  // Optional callbacks
  onFullscreenChange?: (isFullscreen: boolean) => void;
}
```

### Default Props Pattern

```typescript
export function GamePlayer({
  title,
  platform,
  canPlayInBrowser,
  allowFullscreen = true,
  showControls = true,
  height = 'calc(100vh - 220px)',
  onFullscreenChange,
}: GamePlayerProps) {
  // Implementation
}
```

## State Management in Components

### Local Component State

Use `useState` for UI-only state:

```typescript
const [isFullscreen, setIsFullscreen] = useState(false);
const [imageError, setImageError] = useState(false);
const [isLoading, setIsLoading] = useState(true);
```

### Global UI State (Zustand)

Access global state via Zustand stores:

```typescript
const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);
const { isAuthenticated, user } = useAuthStore();
const { mode, primaryColor } = useThemeStore();
```

### Server State (TanStack Query)

Use custom hooks wrapping TanStack Query:

```typescript
const { data: games, isLoading, error } = useGames(filters);
const { data: playlists } = usePlaylists();
```

## Component Lifecycle

### Mount Effect Hook

Use custom `useMountEffect` for mount-only effects:

```typescript
import { useMountEffect } from '@/hooks/useMountEffect';

function MyComponent() {
  useMountEffect(() => {
    // Runs once on mount
    console.log('Component mounted');
  });
}
```

### Cleanup Pattern

Always clean up resources in useEffect:

```typescript
useEffect(() => {
  const handleResize = () => {
    // Handle resize
  };

  window.addEventListener('resize', handleResize);

  return () => {
    window.removeEventListener('resize', handleResize);
  };
}, []);
```

## Error Boundaries

Top-level error boundary catches React errors:

```typescript
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

Component-level error handling:

```typescript
if (error) {
  return (
    <div className="text-center py-8">
      <AlertCircle className="mx-auto text-red-500" />
      <p>Failed to load data</p>
    </div>
  );
}
```

## Accessibility

### ARIA Labels

```typescript
<button
  aria-label="Toggle sidebar"
  title="Toggle sidebar width"
  onClick={toggleSidebar}
>
  <Menu size={20} />
</button>
```

### Keyboard Navigation

```typescript
useEffect(() => {
  const handleEscKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && isFullscreen) {
      event.preventDefault();
      setIsFullscreen(false);
    }
  };

  window.addEventListener('keydown', handleEscKey);
  return () => window.removeEventListener('keydown', handleEscKey);
}, [isFullscreen]);
```

### Focus Management

```typescript
const inputRef = useRef<HTMLInputElement>(null);

useEffect(() => {
  inputRef.current?.focus();
}, []);
```

## Performance Optimizations

### React.memo

Memoize expensive components:

```typescript
export const GameCard = memo(function GameCard({ game }: GameCardProps) {
  // Component implementation
});
```

### useMemo

Memoize expensive computations:

```typescript
const sortedGames = useMemo(() => {
  return games.sort((a, b) => a.title.localeCompare(b.title));
}, [games]);
```

### useCallback

Memoize callback functions:

```typescript
const handleAddToPlaylist = useCallback((gameId: string) => {
  // Add to playlist logic
}, [/* dependencies */]);
```

### Lazy Loading

Load images lazily:

```typescript
<img
  src={imageUrl}
  alt={game.title}
  loading="lazy"
  onLoad={() => setImageLoaded(true)}
  onError={() => setImageError(true)}
/>
```

## Testing Components (Future)

### Component Testing Structure

```typescript
import { render, screen } from '@testing-library/react';
import { GameCard } from './GameCard';

describe('GameCard', () => {
  it('renders game title', () => {
    const game = { id: '1', title: 'Test Game', /* ... */ };
    render(<GameCard game={game} />);
    expect(screen.getByText('Test Game')).toBeInTheDocument();
  });
});
```

## Further Reading

- [Layout Components](./layout-components.md)
- [Game Components](./game-components.md)
- [Player Components](./player-components.md)
- [UI Components](./ui-components.md)
- [Auth Components](./auth-components.md)
