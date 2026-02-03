# Design System Overview

The Flashpoint Web design system provides a consistent, accessible, and beautiful UI framework built on Tailwind CSS, Shadcn UI components, and Lucide icons.

## Technology Stack

- **Tailwind CSS v3.4.1** - Utility-first CSS framework
- **Shadcn UI** - High-quality React components
- **Lucide React v0.358.0** - 358+ beautiful icons
- **Class Variance Authority** - Type-safe component variants

## Core Principles

1. **Accessibility First** - WCAG 2.1 AA compliance
2. **Responsive Design** - Mobile-first approach (sm, md, lg, xl, 2xl)
3. **Theming Flexibility** - Light/dark modes + 22 color palettes
4. **Performance** - Minimal runtime overhead, tree-shakeable
5. **Developer Experience** - TypeScript throughout, clear patterns

## Structure

```
07-design-system/
├── README.md                 # Overview (this file)
├── theme-system.md          # Modes and customization
├── color-palette.md         # 22 color palettes
├── typography.md            # Font system and scales
├── spacing-layout.md        # Spacing and layouts
├── components-library.md    # Shadcn UI catalog
├── icons.md                 # Lucide usage
├── responsive-design.md     # Breakpoints and patterns
└── design-patterns.md       # Common UI patterns
```

## Quick Start

### Using Components

```tsx
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Heart } from 'lucide-react';

function GameCard({ game }) {
  return (
    <Card>
      <CardHeader>
        <h2>{game.title}</h2>
      </CardHeader>
      <CardContent>
        <Button>
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
      <button onClick={() => setPrimaryColor('purple')}>Purple</button>
    </div>
  );
}
```

### Using Utilities

```tsx
function Example() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-foreground mb-6">Welcome</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Responsive grid */}
      </div>
    </div>
  );
}
```

## Color System

11 semantic color roles:
- **Primary** - Brand color (22 user-customizable options)
- **Secondary** - Secondary actions
- **Destructive** - Errors and destructive actions
- **Muted** - Subtle backgrounds and disabled states
- **Accent** - Highlights and hover states
- **Background** - Page background
- **Foreground** - Main text color
- **Card** - Card backgrounds
- **Border** - Borders and dividers
- **Input** - Form input borders
- **Ring** - Focus ring color

## Component Categories

**Layout:** Card, Sheet, Dialog, Scroll Area, Separator
**Forms:** Input, Textarea, Select, Checkbox, Radio, Switch, Button
**Data:** Table, Badge, Alert, Avatar, Skeleton
**Navigation:** Dropdown Menu, Collapsible, Toggle, Toggle Group
**Feedback:** Toast, Alert Dialog, Progress

## Typography

- **Font:** Inter (primary), system fallbacks
- **Sizes:** 12 predefined scales (xs to 9xl)
- **Weights:** 4 weights (400, 500, 600, 700)
- **Line Heights:** Optimized for readability

## Spacing Scale

Base unit: 4px (0.25rem)
- Common values: 4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px

## Resources

- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Shadcn UI Docs](https://ui.shadcn.com)
- [Lucide Icons](https://lucide.dev)

## Next Steps

1. Read [Theme System](./theme-system.md) for theming
2. Explore [Color Palette](./color-palette.md) for colors
3. Study [Components Library](./components-library.md) for components
4. Check [Design Patterns](./design-patterns.md) for patterns

---

Last updated: 2026-02-03
