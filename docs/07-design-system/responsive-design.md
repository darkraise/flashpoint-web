# Responsive Design

Flashpoint Web follows a mobile-first responsive design approach using Tailwind CSS's responsive breakpoints. This ensures the application works beautifully on all devices from mobile phones to large desktop displays.

## Breakpoints

Tailwind uses five default breakpoints:

| Breakpoint | Min Width | Typical Device | Container Max Width |
|------------|-----------|----------------|---------------------|
| `sm` | 640px | Large phones, small tablets | 640px |
| `md` | 768px | Tablets (portrait) | 768px |
| `lg` | 1024px | Tablets (landscape), small laptops | 1024px |
| `xl` | 1280px | Desktops | 1280px |
| `2xl` | 1400px | Large desktops | 1400px (custom) |

**Custom 2xl Breakpoint:**
The project customizes the 2xl breakpoint to 1400px for the container component.

```javascript
// tailwind.config.js
{
  container: {
    center: true,
    padding: "2rem",
    screens: {
      "2xl": "1400px",
    },
  },
}
```

---

## Mobile-First Approach

Styles are written for mobile devices first, then enhanced for larger screens using breakpoint prefixes.

### Basic Syntax

```tsx
// Mobile (default): text-sm
// Tablet and up: text-base
<p className="text-sm md:text-base">
  Responsive text size
</p>

// Mobile: 1 column
// Tablet: 2 columns
// Desktop: 3 columns
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  {/* Grid items */}
</div>
```

### Breakpoint Prefixes

All Tailwind utilities can be prefixed with breakpoints:

```tsx
// Responsive padding
<div className="p-4 md:p-6 lg:p-8">
  Padding increases on larger screens
</div>

// Responsive display
<nav className="hidden md:flex lg:flex">
  Hidden on mobile, visible on tablet+
</nav>

// Responsive flex direction
<div className="flex flex-col md:flex-row">
  Stacks on mobile, horizontal on tablet+
</div>

// Responsive widths
<div className="w-full md:w-1/2 lg:w-1/3">
  Full width on mobile, narrower on larger screens
</div>
```

---

## Common Responsive Patterns

### Responsive Grid

```tsx
// Game card grid
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {games.map(game => (
    <GameCard key={game.id} game={game} />
  ))}
</div>

// Feature grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
  {features.map(feature => (
    <FeatureCard key={feature.id} feature={feature} />
  ))}
</div>
```

### Responsive Typography

```tsx
// Page title
<h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold">
  Welcome to Flashpoint
</h1>

// Body text
<p className="text-sm md:text-base lg:text-lg leading-relaxed">
  Browse and play thousands of games from the Flashpoint Archive.
</p>

// Section heading
<h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold mb-4 md:mb-6">
  Popular Games
</h2>
```

### Responsive Spacing

```tsx
// Container padding
<div className="container mx-auto px-4 md:px-6 lg:px-8">
  Content
</div>

// Section margins
<section className="mb-8 md:mb-12 lg:mb-16">
  Section content
</section>

// Gap between items
<div className="flex gap-2 sm:gap-4 md:gap-6">
  <div>Item 1</div>
  <div>Item 2</div>
</div>
```

### Responsive Layout

```tsx
// Two-column layout
<div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
  {/* Sidebar - full width on mobile, 3 columns on desktop */}
  <aside className="lg:col-span-3">
    <FilterPanel />
  </aside>

  {/* Main content - full width on mobile, 9 columns on desktop */}
  <main className="lg:col-span-9">
    <GameGrid />
  </main>
</div>

// Split view (mobile stacks, desktop splits)
<div className="flex flex-col md:flex-row gap-6">
  <div className="md:w-1/2">
    Left panel
  </div>
  <div className="md:w-1/2">
    Right panel
  </div>
</div>
```

### Responsive Navigation

```tsx
// Desktop horizontal, mobile vertical
<nav className="flex flex-col md:flex-row gap-4 md:gap-8">
  <NavLink to="/">Home</NavLink>
  <NavLink to="/browse">Browse</NavLink>
  <NavLink to="/favorites">Favorites</NavLink>
</nav>

// Hide/show elements
<div>
  {/* Mobile menu button */}
  <Button className="md:hidden" onClick={toggleMenu}>
    <Menu className="h-6 w-6" />
  </Button>

  {/* Desktop navigation */}
  <nav className="hidden md:flex items-center gap-6">
    <NavLink to="/">Home</NavLink>
    <NavLink to="/browse">Browse</NavLink>
  </nav>
</div>
```

### Responsive Cards

```tsx
<Card className="p-4 md:p-6 lg:p-8">
  <CardHeader className="p-0 mb-4 md:mb-6">
    <CardTitle className="text-xl md:text-2xl">
      Game Title
    </CardTitle>
    <CardDescription className="text-sm md:text-base">
      Description
    </CardDescription>
  </CardHeader>
  <CardContent className="p-0">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
      {/* Card content */}
    </div>
  </CardContent>
</Card>
```

---

## Responsive Component Examples

### Header Component

```tsx
function Header() {
  return (
    <header className="border-b border-border">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-14 md:h-16 lg:h-20">
          {/* Logo - responsive sizing */}
          <Logo className="h-8 md:h-10 lg:h-12" />

          {/* Desktop navigation */}
          <nav className="hidden lg:flex items-center gap-6">
            <NavLink to="/">Home</NavLink>
            <NavLink to="/browse">Browse</NavLink>
            <NavLink to="/favorites">Favorites</NavLink>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2 md:gap-4">
            <Search className="h-5 w-5 md:h-6 md:w-6" />
            <Button size="sm" className="hidden sm:inline-flex">
              Sign In
            </Button>
            <Button size="icon" className="lg:hidden">
              <Menu />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
```

### Game Card Component

```tsx
function GameCard({ game }) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      {/* Image - responsive aspect ratio */}
      <div className="aspect-video md:aspect-[4/3] lg:aspect-video overflow-hidden">
        <img
          src={game.image}
          alt={game.title}
          className="w-full h-full object-cover"
        />
      </div>

      <CardHeader className="p-3 md:p-4 lg:p-6">
        <CardTitle className="text-base md:text-lg lg:text-xl line-clamp-2">
          {game.title}
        </CardTitle>
        <CardDescription className="text-xs md:text-sm line-clamp-2 md:line-clamp-3">
          {game.description}
        </CardDescription>
      </CardHeader>

      <CardFooter className="p-3 md:p-4 lg:p-6 pt-0 flex flex-col sm:flex-row gap-2">
        <Button className="w-full sm:w-auto flex-1">
          Play Now
        </Button>
        <Button variant="outline" size="icon" className="w-full sm:w-auto">
          <Heart className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
```

### Filter Panel Component

```tsx
function FilterPanel() {
  return (
    <Card className="p-4 md:p-6">
      <CardHeader className="p-0 mb-4">
        <CardTitle className="text-lg md:text-xl">Filters</CardTitle>
      </CardHeader>

      <CardContent className="p-0 space-y-4 md:space-y-6">
        {/* Platform filter */}
        <div>
          <Label className="text-sm md:text-base mb-2">Platform</Label>
          <Select>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All Platforms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="flash">Flash</SelectItem>
              <SelectItem value="html5">HTML5</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Year filter - stacks on mobile, side-by-side on tablet+ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm mb-2">From</Label>
            <Input type="number" placeholder="2000" />
          </div>
          <div>
            <Label className="text-sm mb-2">To</Label>
            <Input type="number" placeholder="2020" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## Container Component

The container component provides responsive padding and max-width:

```tsx
// Basic container
<div className="container mx-auto px-4">
  Content
</div>

// Responsive padding
<div className="container mx-auto px-4 md:px-6 lg:px-8">
  Content with more padding on larger screens
</div>

// Full width on mobile, container on desktop
<div className="w-full lg:container lg:mx-auto px-4">
  Full width mobile, contained desktop
</div>
```

**Container Widths:**
- Mobile: 100% - 2rem (32px) padding
- sm (640px): 100% - 2rem padding
- md (768px): 100% - 2rem padding
- lg (1024px): 100% - 2rem padding
- xl (1280px): 100% - 2rem padding
- 2xl (1400px+): 1400px max-width - 2rem padding

---

## Responsive Utilities

### Show/Hide Elements

```tsx
// Hide on mobile, show on desktop
<div className="hidden md:block">
  Desktop only content
</div>

// Show on mobile, hide on desktop
<div className="block md:hidden">
  Mobile only content
</div>

// Different display modes per breakpoint
<div className="block md:flex lg:grid">
  Changes display mode across breakpoints
</div>
```

### Responsive Flex

```tsx
// Flex direction
<div className="flex flex-col md:flex-row">
  Vertical on mobile, horizontal on tablet+
</div>

// Flex wrap
<div className="flex flex-nowrap md:flex-wrap">
  No wrap on mobile, wrap on tablet+
</div>

// Justify and align
<div className="flex justify-start md:justify-between lg:justify-center">
  Different alignment per breakpoint
</div>
```

### Responsive Positioning

```tsx
// Position changes
<div className="static md:relative lg:absolute">
  Position varies by breakpoint
</div>

// Responsive z-index
<div className="z-10 md:z-20 lg:z-30">
  Higher z-index on larger screens
</div>
```

---

## Touch-Friendly Design

### Minimum Touch Targets

All interactive elements should be at least 44px × 44px on mobile:

```tsx
// Good: Large enough touch target
<Button className="h-12 w-12 md:h-10 md:w-10">
  <Icon />
</Button>

// Good: Sufficient padding
<button className="px-4 py-3 md:px-3 md:py-2">
  Click me
</button>

// Bad: Too small on mobile
<button className="p-1">
  <Icon className="h-4 w-4" />
</button>
```

### Mobile-Friendly Spacing

```tsx
// Generous spacing on mobile
<div className="space-y-4 md:space-y-3">
  {items.map(item => (
    <ListItem key={item.id} item={item} />
  ))}
</div>

// Touch-friendly gaps
<div className="flex gap-4 md:gap-2">
  <Button>Action 1</Button>
  <Button>Action 2</Button>
</div>
```

---

## Responsive Images

### Aspect Ratios

```tsx
// Fixed aspect ratio
<div className="aspect-square md:aspect-video">
  <img src={src} alt={alt} className="w-full h-full object-cover" />
</div>

// Different ratios per breakpoint
<div className="aspect-[4/3] md:aspect-video lg:aspect-[21/9]">
  <img src={src} alt={alt} className="w-full h-full object-cover" />
</div>
```

### Responsive Image Sizing

```tsx
// Responsive max-width
<img
  src={src}
  alt={alt}
  className="w-full max-w-xs md:max-w-md lg:max-w-lg"
/>

// Responsive height
<img
  src={src}
  alt={alt}
  className="h-48 md:h-64 lg:h-80 w-auto"
/>
```

---

## Breakpoint Detection in JavaScript

Use media queries in JavaScript for responsive logic:

```tsx
import { useEffect, useState } from 'react';

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}

// Usage
function ResponsiveComponent() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  return (
    <div>
      {isMobile && <MobileView />}
      {isDesktop && <DesktopView />}
    </div>
  );
}
```

---

## Best Practices

### 1. Mobile-First Always

```tsx
// Good: Mobile-first approach
<div className="text-sm md:text-base lg:text-lg">
  Text scales up
</div>

// Bad: Desktop-first (requires more code)
<div className="text-lg md:text-base sm:text-sm">
  Text scales down
</div>
```

### 2. Progressive Enhancement

```tsx
// Good: Basic on mobile, enhanced on desktop
<Card className="p-4 md:p-6 lg:shadow-xl lg:hover:shadow-2xl">
  Enhanced shadows on larger screens
</Card>

// Good: Simpler mobile, richer desktop
<nav className="flex flex-col md:flex-row md:items-center md:justify-between">
  Navigation
</nav>
```

### 3. Test All Breakpoints

Always test your design at all breakpoints:
- 320px (small mobile)
- 375px (mobile)
- 768px (tablet)
- 1024px (laptop)
- 1440px (desktop)
- 1920px (large desktop)

### 4. Avoid Breakpoint Overuse

```tsx
// Good: 2-3 breakpoints
<div className="text-sm md:text-base lg:text-lg">
  Simple and clear
</div>

// Bad: Too many breakpoints
<div className="text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl 2xl:text-2xl">
  Overly complex
</div>
```

### 5. Consistent Patterns

Use the same responsive patterns across similar components:

```tsx
// Consistent card grid pattern across the app
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {/* Cards */}
</div>
```

---

Next: [Design Patterns](./design-patterns.md) - Common UI patterns and best practices
