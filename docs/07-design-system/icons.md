# Icons

Lucide React v0.358.0 - 358+ beautifully crafted SVG icons. All icons are
tree-shakeable, customizable, and support light/dark themes.

## Basic Usage

Import icons individually:

```tsx
import { Heart, Star, Search, Settings } from 'lucide-react';

function Example() {
  return (
    <div>
      <Heart className="h-5 w-5" />
      <Star className="h-5 w-5" />
      <Search className="h-5 w-5" />
    </div>
  );
}
```

## Icon Sizing

Use Tailwind sizing classes:

| Size | Class       | Pixels | Use              |
| ---- | ----------- | ------ | ---------------- |
| xs   | `h-3 w-3`   | 12px   | Tiny indicators  |
| sm   | `h-4 w-4`   | 16px   | Buttons, badges  |
| base | `h-5 w-5`   | 20px   | **Most common**  |
| md   | `h-6 w-6`   | 24px   | Navigation, hero |
| lg   | `h-8 w-8`   | 32px   | Large displays   |
| xl   | `h-12 w-12` | 48px   | Extra large      |

## Icon Colors

```tsx
// Inherit text color (default)
<Heart className="h-5 w-5" />

// Semantic colors
<Heart className="h-5 w-5 text-primary" />
<AlertCircle className="h-5 w-5 text-destructive" />
<CheckCircle className="h-5 w-5 text-green-500" />

// Custom colors
<Star className="h-5 w-5 text-yellow-500" />
```

## Icon Props

```tsx
<Heart
  className="h-5 w-5"
  color="red"
  fill="red"
  strokeWidth={2}
  absoluteStrokeWidth
  size={20}
/>
```

**Common Props:**

- `size` - Number (defaults to 24)
- `color` - CSS color string
- `strokeWidth` - Number (defaults to 2)
- `fill` - CSS color string
- `absoluteStrokeWidth` - Boolean

## Common Icon Categories

**User & Account:** User, UserCircle, Settings, LogIn, LogOut **Navigation:**
Menu, X, ChevronLeft, ChevronRight, Home, Search **Actions:** Plus, Minus, Edit,
Trash, Save, Download, Copy, Share **Media:** Play, Pause, Volume2, Maximize,
Film, Image **Feedback:** Check, CheckCircle, X, XCircle, AlertCircle,
AlertTriangle, Info, Loader2 **Social:** Heart, Star, ThumbsUp, Bell, Mail,
Share2 **Gaming:** Gamepad2, Joystick, Trophy, Award, Target **Theme:** Sun,
Moon, Monitor, Palette, Eye, Grid, List

See [lucide.dev](https://lucide.dev) for all 358+ icons.

## Icon Usage Patterns

### In Buttons

```tsx
// Icon before text
<Button>
  <Plus className="mr-2 h-4 w-4" />
  Add Game
</Button>

// Icon after text
<Button>
  Next
  <ChevronRight className="ml-2 h-4 w-4" />
</Button>

// Icon only
<Button size="icon">
  <Settings className="h-4 w-4" />
  <span className="sr-only">Settings</span>
</Button>
```

### In Navigation

```tsx
<nav className="flex items-center gap-4">
  <a href="/" className="flex items-center gap-2">
    <Home className="h-5 w-5" />
    <span>Home</span>
  </a>
  <a href="/browse" className="flex items-center gap-2">
    <Gamepad2 className="h-5 w-5" />
    <span>Browse</span>
  </a>
</nav>
```

### In Lists

```tsx
<ul className="space-y-2">
  <li className="flex items-center gap-2">
    <CheckCircle className="h-4 w-4 text-green-500" />
    <span>Task completed</span>
  </li>
  <li className="flex items-center gap-2">
    <Loader2 className="h-4 w-4 animate-spin" />
    <span>Processing...</span>
  </li>
  <li className="flex items-center gap-2">
    <XCircle className="h-4 w-4 text-destructive" />
    <span>Failed</span>
  </li>
</ul>
```

### In Cards

```tsx
<Card>
  <CardHeader>
    <CardTitle className="flex items-center justify-between">
      <span className="flex items-center gap-2">
        <Gamepad2 className="h-5 w-5" />
        Game Title
      </span>
      <Button size="icon" variant="ghost">
        <Heart className="h-4 w-4" />
      </Button>
    </CardTitle>
  </CardHeader>
</Card>
```

### In Alerts

```tsx
<Alert>
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Information</AlertTitle>
  <AlertDescription>Your changes have been saved.</AlertDescription>
</Alert>

<Alert variant="destructive">
  <AlertTriangle className="h-4 w-4" />
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>Something went wrong.</AlertDescription>
</Alert>
```

## Animated Icons

### Spinning Loader

```tsx
<Loader2 className="h-4 w-4 animate-spin" />

// In button
<Button disabled>
  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
  Loading...
</Button>
```

### Rotating Refresh

```tsx
<button className="group">
  <RotateCw className="h-4 w-4 group-hover:rotate-180 transition-transform" />
</button>
```

### Pulsing Notification

```tsx
<Button size="icon" variant="ghost" className="relative">
  <Bell className="h-5 w-5" />
  <span className="absolute top-1 right-1 h-2 w-2 bg-destructive rounded-full animate-pulse" />
</Button>
```

## Stroke Width Variants

```tsx
// Thin (delicate)
<Icon strokeWidth={1} className="h-5 w-5" />

// Regular (default)
<Icon strokeWidth={2} className="h-5 w-5" />

// Bold (emphasis)
<Icon strokeWidth={3} className="h-5 w-5" />
```

## Filled Icons

```tsx
// Outline (default)
<Heart className="h-5 w-5" />

// Filled
<Heart className="h-5 w-5 fill-current" />
<Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />

// Conditional (favorite toggle)
<Heart className={cn(
  "h-5 w-5",
  isFavorite && "fill-red-500 text-red-500"
)} />
```

## Icon Spacing

```tsx
// Before text (8px gap)
<span className="flex items-center">
  <Icon className="mr-2 h-4 w-4" />
  Text
</span>

// After text (8px gap)
<span className="flex items-center">
  Text
  <Icon className="ml-2 h-4 w-4" />
</span>

// Between elements
<div className="flex items-center gap-2">
  <Icon className="h-4 w-4" />
  <span>Label</span>
  <Icon className="h-4 w-4" />
</div>
```

## Accessibility

Always label icon-only buttons:

```tsx
// Good: Screen reader text
<Button size="icon">
  <Settings className="h-4 w-4" />
  <span className="sr-only">Settings</span>
</Button>

// Good: aria-label
<button aria-label="Close dialog">
  <X className="h-4 w-4" />
</button>
```

## Best Practices

1. **Consistent Sizing** - Use standard sizes (h-4 w-4, h-5 w-5, h-6 w-6)
2. **Semantic Colors** - Match colors to meaning (green for success, red for
   error)
3. **Import Only What You Need** - Tree-shakeable imports for smaller bundle
4. **Align Properly** - Use `flex items-center` for vertical alignment

---

Browse all icons at [lucide.dev](https://lucide.dev)

Next: [Responsive Design](./responsive-design.md) - Breakpoints and mobile-first
patterns
