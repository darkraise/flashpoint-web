# Layout Components

This document describes the layout components that form the structure of the
Flashpoint Web application.

## Component Hierarchy

```
AppShell
├── Header
│   ├── Logo & Title
│   ├── Sidebar Toggle
│   ├── SearchBar (Desktop)
│   ├── PrimaryColorPicker
│   ├── ThemePicker
│   └── UserMenu / Login Buttons
├── SearchBar (Mobile)
└── Sidebar
    ├── Game Navigation
    ├── Library Navigation
    ├── Management Section (Admin only)
    └── Dashboard & Settings
```

## AppShell

Main application layout container that wraps all pages.

### Location

`D:\Repositories\Personal\flashpoint-web\frontend\src\components\layout\AppShell.tsx`

### Purpose

Provides the main application structure with header and sidebar navigation.

### Props

```typescript
interface AppShellProps {
  children: ReactNode;
}
```

### Implementation

```typescript
export function AppShell({ children }: AppShellProps) {
  const sidebarOpen = useUIStore((state) => state.sidebarOpen);

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <Header />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} />

        <main className="flex-1 overflow-auto bg-background pt-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

### Features

- **Fixed Height Layout** - Uses `h-screen` to fill viewport
- **Flexbox Structure** - Column layout with header and content
- **Overflow Management** - Prevents content from overflowing viewport
- **Theme Support** - Uses Tailwind theme variables

### Usage

```typescript
// In App.tsx
<Route path="/*" element={
  <AppShell>
    <Routes>
      {/* Application routes */}
    </Routes>
  </AppShell>
} />
```

## Header

Top navigation bar with search, theme controls, and user menu.

### Location

`D:\Repositories\Personal\flashpoint-web\frontend\src\components\layout\Header.tsx`

### Features

1. **Logo and Branding**
   - Flashpoint logo
   - Application title (hidden on mobile when sidebar is collapsed)
   - Link to home page

2. **Sidebar Toggle**
   - Hamburger menu button
   - Toggles sidebar width between collapsed and expanded

3. **Search Bar**
   - Desktop: Center of header
   - Mobile: Below main header

4. **Theme Controls**
   - PrimaryColorPicker - 21 color options
   - ThemePicker - Light/Dark/System modes

5. **User Menu**
   - **Guest Mode**: Shows "Guest" badge + Login button
   - **Authenticated**: Avatar dropdown with user info and logout

### Props

No props - reads state from Zustand stores.

### Implementation Details

#### Logo and Title

```typescript
<Link
  to="/"
  className="flex items-center hover:opacity-80 transition-opacity min-w-0 ml-4"
  title="Flashpoint Archive - Home"
>
  <img
    src="/images/logo.png"
    alt="Flashpoint Archive"
    className="h-8 w-auto object-contain flex-shrink-0"
  />
  <div className={cn(
    "overflow-hidden transition-all duration-500 hidden sm:block",
    sidebarCollapsed ? "max-w-0 opacity-0" : "max-w-xs opacity-100"
  )}>
    <span className="text-xl font-bold whitespace-nowrap">
      Flashpoint Archive
    </span>
  </div>
</Link>
```

#### Sidebar Toggle

```typescript
<Button
  variant="ghost"
  size="icon"
  onClick={toggleSidebarCollapsed}
  aria-label="Toggle sidebar"
  title="Toggle sidebar width"
>
  <Menu size={20} />
</Button>
```

#### Responsive Search

```typescript
{/* Desktop Search */}
<div className="flex-1 max-w-2xl mx-auto hidden md:block">
  <SearchBar />
</div>

{/* Mobile Search */}
<div className="md:hidden px-4 pb-3">
  <SearchBar />
</div>
```

#### User Menu (Authenticated)

```typescript
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" className="flex items-center gap-2">
      <Avatar className="h-8 w-8">
        <AvatarFallback className="text-xs">
          {getUserInitials(user.username)}
        </AvatarFallback>
      </Avatar>
      <span className="text-sm hidden sm:block">{user.username}</span>
      <Badge variant={getRoleBadgeVariant(user.role)} className="text-xs">
        {user.role}
      </Badge>
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" className="w-48">
    <DropdownMenuLabel>
      <div>
        <p className="text-sm font-medium">{user.username}</p>
        <p className="text-xs text-muted-foreground">{user.email}</p>
      </div>
    </DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuItem onClick={handleLogout}>
      <LogOut className="mr-2 h-4 w-4" />
      Logout
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

#### User Menu (Guest)

```typescript
<div className="flex items-center gap-2">
  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted">
    <User size={16} className="text-muted-foreground" />
    <span className="text-sm hidden sm:block">{user.username}</span>
    <Badge variant="outline" className="text-xs">
      {user.role}
    </Badge>
  </div>
  <Button asChild size="sm">
    <Link to="/login">Login</Link>
  </Button>
</div>
```

### Responsive Behavior

- **Mobile (< 768px)**:
  - Title hidden when sidebar collapsed
  - Search bar moves below header
  - User info condensed

- **Desktop (>= 768px)**:
  - Full title visible
  - Search bar in center of header
  - Full user menu with dropdown

## Sidebar

Collapsible navigation sidebar with route highlighting.

### Location

`D:\Repositories\Personal\flashpoint-web\frontend\src\components\layout\Sidebar.tsx`

### Props

```typescript
interface SidebarProps {
  isOpen: boolean;
}
```

### Features

1. **Collapsible Width**
   - Expanded: 256px (w-64)
   - Collapsed: 64px (w-16)
   - Smooth transition with 500ms duration

2. **Mobile Overlay**
   - Fixed positioning on mobile
   - Backdrop overlay with blur
   - Swipe gesture support (swipe left to close)

3. **Route Highlighting**
   - Active route highlighted with primary color
   - Uses React Router location

4. **Permission-Based Navigation**
   - Guest users see limited navigation
   - Admin sections hidden for non-admins
   - RoleGuard component for permission checks

5. **Scroll Support**
   - ScrollArea component for overflow
   - Maintains scroll position

### Navigation Structure

#### Game Navigation

```typescript
const gameNavItems: NavItem[] = [
  {
    path: '/flash-games',
    iconImage: '/images/Flash.png',
    label: 'Flash Games',
  },
  {
    path: '/html5-games',
    iconImage: '/images/HTML5.png',
    label: 'HTML5 Games',
  },
  { path: '/animations', icon: Film, label: 'Animations' },
  { path: '/browse', icon: Gamepad2, label: 'Browse' },
];
```

#### Library Navigation (Hidden for Guests)

```typescript
const libraryNavItems: NavItem[] = [
  { path: '/favorites', icon: Heart, label: 'Favorites' },
  { path: '/playlists', icon: ListIcon, label: 'Playlists' },
];
```

#### Management Section (Admin Only)

```typescript
<RoleGuard permissions={['users.read', 'roles.read', 'activities.read']}>
  <div className="space-y-1">
    <RoleGuard permission="users.read">
      <Link to="/users">Users</Link>
    </RoleGuard>

    <RoleGuard permission="roles.read">
      <Link to="/roles">Roles</Link>
    </RoleGuard>

    <RoleGuard permission="activities.read">
      <Link to="/activities">Activity Logs</Link>
    </RoleGuard>
  </div>
</RoleGuard>
```

#### Bottom Section (Dashboard & Settings)

```typescript
<div className="border-t p-4">
  <Link to="/dashboard">
    <BarChart3 size={20} />
    Dashboard
  </Link>

  <Link to="/settings">
    <Settings size={20} />
    Settings
  </Link>
</div>
```

### Active Route Detection

```typescript
const isNavItemActive = (item: NavItem) => {
  const itemPath = item.path.split('?')[0];
  const itemQuery = item.path.split('?')[1];

  if (itemQuery) {
    // Exact match including query params
    return (
      location.pathname === itemPath && location.search === `?${itemQuery}`
    );
  }

  // Special case: Home (/) should highlight Flash Games
  if (location.pathname === '/' && itemPath === '/flash-games') {
    return true;
  }

  return location.pathname === itemPath;
};
```

### Mobile Behavior

#### Swipe Gesture

```typescript
const sidebarRef = useSwipeGesture<HTMLElement>({
  onSwipeLeft: () => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  },
  minSwipeDistance: 50,
});
```

#### Auto-Close on Navigation

```typescript
useEffect(() => {
  if (window.innerWidth < 1024) {
    setSidebarOpen(false);
  }
}, [location.pathname, setSidebarOpen]);
```

#### Backdrop Overlay

```typescript
{isOpen && (
  <div
    className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm"
    onClick={handleBackdropClick}
    aria-hidden="true"
  />
)}
```

### Responsive CSS Classes

```typescript
<aside
  className={cn(
    'bg-card border-r flex flex-col overflow-hidden',
    sidebarCollapsed ? 'w-16' : 'w-64',
    // Mobile: fixed positioning with slide-in
    'lg:relative fixed inset-y-0 left-0 z-40',
    'transition-all duration-500 ease-in-out',
    'lg:translate-x-0',  // Always visible on desktop
    isOpen ? 'translate-x-0' : '-translate-x-full'  // Slide on mobile
  )}
>
```

### Collapsed State Behavior

When `sidebarCollapsed` is true:

- Width: 64px (w-16)
- Icons only (no text)
- Tooltips on hover (via `title` attribute)
- Centered icons
- Management section label hidden

## Layout State Management

Layout state is managed via the `useUIStore` Zustand store:

```typescript
interface UIState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebarOpen: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;
}
```

### State Persistence

UI state is persisted to localStorage:

```typescript
persist(
  (set) => ({
    /* ... */
  }),
  {
    name: 'flashpoint-ui-state',
    partialize: (state) => ({
      sidebarCollapsed: state.sidebarCollapsed,
      // sidebarOpen is intentionally not persisted (session-only)
    }),
  }
);
```

## Styling and Theming

### Tailwind Classes

Layout components use Tailwind utility classes:

- `bg-card` - Card background color (theme-aware)
- `border-border` - Border color (theme-aware)
- `text-foreground` - Text color (theme-aware)
- `bg-primary/10` - Primary color with opacity

### Custom CSS Variables

Applied via ThemeStore:

- `--primary` - Primary theme color
- `--background` - Background color
- `--foreground` - Text color
- `--card` - Card background
- `--muted` - Muted text color

## Accessibility

### ARIA Labels

```typescript
<Button
  aria-label="Toggle sidebar"
  title="Toggle sidebar width"
>
  <Menu />
</Button>
```

### Keyboard Navigation

- Tab navigation works across all interactive elements
- Sidebar links are keyboard accessible
- Dropdowns support arrow key navigation

### Screen Readers

- Proper semantic HTML (`<header>`, `<nav>`, `<main>`, `<aside>`)
- ARIA attributes on interactive elements
- Hidden decorative elements with `aria-hidden="true"`

## Further Reading

- [Component Overview](./component-overview.md)
- [UI Store Documentation](../state-management/zustand-stores.md#ui-store)
- [Theme Documentation](../state-management/zustand-stores.md#theme-store)
