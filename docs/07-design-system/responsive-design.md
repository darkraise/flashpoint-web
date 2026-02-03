# Responsive Design

Mobile-first responsive design using Tailwind CSS breakpoints. Works beautifully on all devices from 320px to 1920px+.

## Breakpoints

| Breakpoint | Min Width | Device | Container |
|------------|-----------|--------|-----------|
| (none) | 0px | Mobile | 100% |
| `sm` | 640px | Large phone | 640px |
| `md` | 768px | Tablet | 768px |
| `lg` | 1024px | Laptop | 1024px |
| `xl` | 1280px | Desktop | 1280px |
| `2xl` | 1400px | Large desktop | 1400px (custom) |

## Mobile-First Approach

Write for mobile first, enhance for larger screens:

```tsx
// Mobile (default): text-sm
// Tablet+: text-base
// Desktop+: text-lg
<p className="text-sm md:text-base lg:text-lg">
  Responsive text
</p>

// Mobile: 1 column, Tablet: 2, Desktop: 3
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  {items}
</div>
```

## Common Responsive Patterns

### Responsive Grid

```tsx
// Game card grid
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {games.map(game => <GameCard key={game.id} game={game} />)}
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
  Browse and play thousands of games.
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
  {items}
</div>
```

### Responsive Layout

```tsx
// Two-column layout
<div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
  {/* Sidebar - full width mobile, 3 cols desktop */}
  <aside className="lg:col-span-3">
    <FilterPanel />
  </aside>

  {/* Main - full width mobile, 9 cols desktop */}
  <main className="lg:col-span-9">
    <GameGrid />
  </main>
</div>

// Split view (stacks mobile, splits desktop)
<div className="flex flex-col md:flex-row gap-6">
  <div className="md:w-1/2">Left panel</div>
  <div className="md:w-1/2">Right panel</div>
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

## Responsive Components

### Header

```tsx
function Header() {
  return (
    <header className="border-b border-border">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-14 md:h-16 lg:h-20">
          <Logo className="h-8 md:h-10 lg:h-12" />

          <nav className="hidden lg:flex items-center gap-6">
            <NavLink to="/">Home</NavLink>
            <NavLink to="/browse">Browse</NavLink>
          </nav>

          <div className="flex items-center gap-2 md:gap-4">
            <Button size="sm" className="hidden sm:inline-flex">Sign In</Button>
            <Button size="icon" className="lg:hidden"><Menu /></Button>
          </div>
        </div>
      </div>
    </header>
  );
}
```

### Game Card

```tsx
function GameCard({ game }) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <div className="aspect-video md:aspect-[4/3] lg:aspect-video overflow-hidden">
        <img src={game.image} alt={game.title} className="w-full h-full object-cover" />
      </div>

      <CardHeader className="p-3 md:p-4 lg:p-6">
        <CardTitle className="text-base md:text-lg lg:text-xl line-clamp-2">
          {game.title}
        </CardTitle>
      </CardHeader>

      <CardFooter className="p-3 md:p-4 lg:p-6 pt-0 flex flex-col sm:flex-row gap-2">
        <Button className="flex-1">Play Now</Button>
        <Button variant="outline" size="icon"><Heart className="h-4 w-4" /></Button>
      </CardFooter>
    </Card>
  );
}
```

### Filter Panel

```tsx
function FilterPanel() {
  return (
    <Card className="p-4 md:p-6">
      <CardHeader className="p-0 mb-4">
        <CardTitle className="text-lg md:text-xl">Filters</CardTitle>
      </CardHeader>

      <CardContent className="p-0 space-y-4 md:space-y-6">
        <div className="space-y-2">
          <Label className="text-sm md:text-base">Platform</Label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="All Platforms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="flash">Flash</SelectItem>
              <SelectItem value="html5">HTML5</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Year range - stack mobile, side-by-side tablet+ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input type="number" placeholder="From" />
          <Input type="number" placeholder="To" />
        </div>
      </CardContent>
    </Card>
  );
}
```

## Show/Hide Elements

```tsx
// Hide on mobile, show on desktop
<div className="hidden md:block">
  Desktop only content
</div>

// Show on mobile, hide on desktop
<div className="block md:hidden">
  Mobile only content
</div>

// Different display modes
<div className="block md:flex lg:grid">
  Changes display mode across breakpoints
</div>
```

## Responsive Utilities

### Flex

```tsx
// Direction
<div className="flex flex-col md:flex-row">
  Vertical mobile, horizontal tablet+
</div>

// Alignment
<div className="flex justify-start md:justify-between lg:justify-center">
  Different alignment per breakpoint
</div>
```

### Positioning

```tsx
// Position changes
<div className="static md:relative lg:absolute">
  Position varies by breakpoint
</div>

// Z-index
<div className="z-10 md:z-20 lg:z-30">
  Higher z-index on larger screens
</div>
```

## Touch-Friendly Design

### Minimum Touch Targets

All interactive elements should be 44px × 44px on mobile:

```tsx
// Good: Large enough
<Button className="h-12 w-12 md:h-10 md:w-10">
  <Icon />
</Button>

// Good: Sufficient padding
<button className="px-4 py-3 md:px-3 md:py-2">
  Click me
</button>
```

### Mobile Spacing

```tsx
// Generous spacing on mobile
<div className="space-y-4 md:space-y-3">
  {items}
</div>

// Touch-friendly gaps
<div className="flex gap-4 md:gap-2">
  <Button>Action 1</Button>
  <Button>Action 2</Button>
</div>
```

## Responsive Images

### Aspect Ratios

```tsx
// Fixed ratio
<div className="aspect-square md:aspect-video">
  <img src={src} alt={alt} className="w-full h-full object-cover" />
</div>

// Different ratios per breakpoint
<div className="aspect-[4/3] md:aspect-video lg:aspect-[21/9]">
  <img src={src} alt={alt} className="w-full h-full object-cover" />
</div>
```

### Responsive Sizing

```tsx
// Responsive max-width
<img src={src} alt={alt} className="w-full max-w-xs md:max-w-md lg:max-w-lg" />

// Responsive height
<img src={src} alt={alt} className="h-48 md:h-64 lg:h-80 w-auto" />
```

## Testing Breakpoints

Always test at:
- 320px (small mobile)
- 375px (mobile)
- 768px (tablet)
- 1024px (laptop)
- 1440px (desktop)
- 1920px (large desktop)

## Best Practices

1. **Mobile-First Always** - Write mobile styles first, add breakpoint prefixes for larger screens
2. **Progressive Enhancement** - Basic on mobile, enhanced on desktop
3. **Avoid Overuse** - Use 2-3 breakpoints, not every breakpoint
4. **Test All Breakpoints** - Don't assume it works without testing
5. **Consistent Patterns** - Reuse responsive patterns across components

---

Next: [Design Patterns](./design-patterns.md) - Common UI patterns
