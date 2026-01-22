# Design System Overview

The Flashpoint Web design system is a comprehensive UI framework built on modern web technologies, providing a consistent, accessible, and beautiful user experience across the application.

## Technology Stack

- **Tailwind CSS v3.4.1** - Utility-first CSS framework
- **Shadcn UI** - High-quality React components built on Radix UI primitives
- **Lucide React v0.358.0** - Beautiful icon library with 358+ icons
- **Class Variance Authority** - Type-safe component variants
- **Tailwind Merge** - Intelligent class name merging
- **Tailwind Animate** - Pre-configured animations

## Core Principles

### 1. Accessibility First
- WCAG 2.1 AA compliance
- Keyboard navigation support
- Screen reader optimization
- Focus indicators on all interactive elements
- Semantic HTML structure

### 2. Responsive Design
- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px), 2xl (1400px)
- Fluid typography and spacing
- Touch-friendly targets (minimum 44px)

### 3. Theming Flexibility
- Light and dark modes with system detection
- 22 customizable color palettes
- Dynamic theme switching
- Persistent user preferences

### 4. Performance Optimization
- Minimal runtime overhead
- Tree-shakeable components
- Optimized bundle sizes
- CSS-in-JS avoided for performance

### 5. Developer Experience
- TypeScript support throughout
- Comprehensive documentation
- Consistent API patterns
- Copy-paste component installation

## Design System Structure

```
07-design-system/
├── README.md                    # This file - overview and principles
├── theme-system.md             # Theme modes and theming architecture
├── color-palette.md            # 22 color palettes with HSL values
├── typography.md               # Font system and text styles
├── spacing-layout.md           # Spacing scale and layout patterns
├── components-library.md       # Shadcn UI components catalog
├── icons.md                    # Lucide icons usage guide
├── responsive-design.md        # Breakpoints and mobile-first patterns
└── design-patterns.md          # Common UI patterns and best practices
```

## Quick Start

### Using Design System Components

```tsx
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart } from 'lucide-react';

function GameCard({ game }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {game.title}
          <Badge variant="secondary">{game.platform}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{game.description}</p>
        <Button className="mt-4 w-full">
          <Heart className="mr-2 h-4 w-4" />
          Add to Favorites
        </Button>
      </CardContent>
    </Card>
  );
}
```

### Using Theme System

```tsx
import { useThemeStore } from '@/store/theme';

function Settings() {
  const { mode, setMode, primaryColor, setPrimaryColor } = useThemeStore();

  return (
    <div>
      <button onClick={() => setMode('dark')}>Dark Mode</button>
      <button onClick={() => setPrimaryColor('purple')}>Purple Theme</button>
    </div>
  );
}
```

### Using Utility Classes

```tsx
function Example() {
  return (
    <div className="container mx-auto px-4">
      <h1 className="text-4xl font-bold text-foreground mb-6">
        Welcome
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Grid layout with responsive columns */}
      </div>
    </div>
  );
}
```

## Color System

The design system uses a semantic color approach with 11 color roles:

- **Primary** - Main brand color (user-customizable, 22 options)
- **Secondary** - Secondary actions and emphasis
- **Destructive** - Errors and destructive actions
- **Muted** - Subtle backgrounds and disabled states
- **Accent** - Highlights and hover states
- **Background** - Page background
- **Foreground** - Main text color
- **Card** - Card backgrounds
- **Border** - Borders and dividers
- **Input** - Form input borders
- **Ring** - Focus ring color

Each color has light and dark mode variants defined in CSS custom properties.

## Component Categories

### Layout Components
- Container, Grid, Flex utilities
- Card, Sheet, Dialog
- Scroll Area, Separator

### Form Components
- Input, Textarea, Select
- Checkbox, Radio Group, Switch
- Form, Label
- Button (6 variants, 4 sizes)

### Data Display
- Table, Data Table
- Badge, Alert
- Avatar, Skeleton
- Tooltip, Popover

### Navigation
- Dropdown Menu
- Collapsible
- Toggle, Toggle Group

### Feedback
- Toast (Sonner)
- Alert Dialog
- Progress indicators (via animations)

## Typography System

- **Font Family**: Inter (primary), system font fallbacks
- **Font Sizes**: 12 predefined sizes from xs (0.75rem) to 9xl (8rem)
- **Font Weights**: 4 weights (normal 400, medium 500, semibold 600, bold 700)
- **Line Heights**: Optimized for readability (1.5 base, tighter for headings)

## Spacing Scale

Tailwind's default spacing scale (4px base unit):

```
0.5 = 2px    6 = 24px     16 = 64px
1   = 4px    8 = 32px     20 = 80px
2   = 8px    10 = 40px    24 = 96px
3   = 12px   12 = 48px    32 = 128px
4   = 16px   14 = 56px    40 = 160px
5   = 20px
```

## Animation System

Pre-configured animations via `tailwindcss-animate`:

- Fade in/out
- Slide in/out (all directions)
- Zoom in/out
- Accordion expand/collapse
- Smooth transitions on interactive elements

## Best Practices

### Component Composition
```tsx
// Good: Compose from primitives
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>{/* content */}</CardContent>
  <CardFooter>{/* actions */}</CardFooter>
</Card>

// Avoid: Creating custom wrapper components unnecessarily
```

### Styling Patterns
```tsx
// Good: Use semantic color tokens
<div className="bg-background text-foreground border-border" />

// Avoid: Hard-coded colors
<div className="bg-white text-black border-gray-300" />
```

### Responsive Design
```tsx
// Good: Mobile-first responsive utilities
<div className="text-sm md:text-base lg:text-lg" />

// Good: Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" />
```

### Accessibility
```tsx
// Good: Proper ARIA labels and semantic HTML
<Button aria-label="Close dialog" onClick={onClose}>
  <X className="h-4 w-4" />
  <span className="sr-only">Close</span>
</Button>

// Good: Keyboard navigation support
<div role="button" tabIndex={0} onKeyDown={handleKeyDown}>
  Custom button
</div>
```

## File Structure

```
frontend/src/
├── components/
│   ├── ui/              # Shadcn UI components (31 components)
│   ├── auth/            # Authentication components
│   ├── game/            # Game-specific components
│   ├── layout/          # Layout components (Header, Sidebar)
│   ├── library/         # Library view components
│   ├── player/          # Game player components
│   ├── search/          # Search and filter components
│   └── theme/           # Theme picker components
├── lib/
│   └── index.ts         # cn() utility for class merging
├── index.css            # Global styles and theme variables
└── tailwind.config.js   # Tailwind configuration
```

## Resources

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Shadcn UI Documentation](https://ui.shadcn.com)
- [Radix UI Primitives](https://www.radix-ui.com)
- [Lucide Icons](https://lucide.dev)
- [Tailwind Animate](https://github.com/jamiebuilds/tailwindcss-animate)

## Next Steps

1. Review [Theme System](./theme-system.md) for theming architecture
2. Explore [Color Palette](./color-palette.md) for available colors
3. Study [Components Library](./components-library.md) for component usage
4. Check [Design Patterns](./design-patterns.md) for common UI patterns

---

Last updated: 2026-01-18
Version: 1.0.0
