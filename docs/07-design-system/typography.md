# Typography

Inter font family with 12 text sizes, 4 weights, and optimized line heights. All
typography meets WCAG accessibility standards.

## Font Family

**Inter** - Modern sans-serif designed for UI with excellent character
differentiation.

Fallback chain: Inter → system-ui → Helvetica → Arial → sans-serif

```css
font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
```

Loaded with Google Fonts optimizations:

- `preconnect` for faster loading
- `display=swap` to prevent invisible text
- Only 400, 500, 600, 700 weights

## Font Sizes

| Class       | Size     | Pixels | Use Case                |
| ----------- | -------- | ------ | ----------------------- |
| `text-xs`   | 0.75rem  | 12px   | Labels, badges          |
| `text-sm`   | 0.875rem | 14px   | Small text, captions    |
| `text-base` | 1rem     | 16px   | **Body text (default)** |
| `text-lg`   | 1.125rem | 18px   | Emphasized body         |
| `text-xl`   | 1.25rem  | 20px   | Small headings          |
| `text-2xl`  | 1.5rem   | 24px   | Card titles, h3         |
| `text-3xl`  | 1.875rem | 30px   | Section headings, h2    |
| `text-4xl`  | 2.25rem  | 36px   | Page titles, h1         |
| `text-5xl`  | 3rem     | 48px   | Large displays          |
| `text-6xl`  | 3.75rem  | 60px   | Hero text               |

Usage:

```tsx
<h1 className="text-4xl font-bold">Page Title</h1>
<h2 className="text-3xl font-semibold">Section Heading</h2>
<h3 className="text-2xl font-semibold">Subsection</h3>
<p className="text-base">Standard paragraph text</p>
<p className="text-sm text-muted-foreground">Supporting text</p>
<span className="text-xs">Label</span>
```

## Font Weights

| Class           | Weight | Use Case              |
| --------------- | ------ | --------------------- |
| `font-normal`   | 400    | Body text, paragraphs |
| `font-medium`   | 500    | Labels, buttons       |
| `font-semibold` | 600    | Headings              |
| `font-bold`     | 700    | Strong emphasis       |

Usage:

```tsx
<p className="font-normal">Regular paragraph</p>
<label className="font-medium">Username</label>
<h2 className="text-3xl font-semibold">Section Title</h2>
<h1 className="text-4xl font-bold">Page Title</h1>
```

## Line Heights

Tailwind applies optimal line heights automatically:

```css
/* Headings get tighter */
.text-4xl {
  line-height: 1.1;
}
.text-3xl {
  line-height: 1.2;
}
.text-2xl {
  line-height: 1.3;
}

/* Body text gets comfortable */
.text-base {
  line-height: 1.5;
}
.text-sm {
  line-height: 1.43;
}
```

Explicit utilities:

```tsx
<h1 className="text-6xl font-bold leading-tight">Tight heading</h1>
<p className="text-base leading-normal">Normal body text</p>
<article className="prose leading-relaxed">Long-form content</article>
```

## Text Colors

```tsx
// Primary text
<h1 className="text-foreground">Main Heading</h1>

// Secondary/muted text
<p className="text-muted-foreground">Supporting description</p>

// Brand-colored text (use sparingly)
<span className="text-primary font-semibold">Featured</span>

// Error text
<p className="text-destructive text-sm">Invalid input</p>

// Text on colored backgrounds
<div className="bg-primary text-primary-foreground">Button Text</div>
```

## Typography Hierarchy

### Headings

```tsx
// h1 - Page title
<h1 className="text-4xl font-bold text-foreground mb-6">
  Browse Games
</h1>

// h2 - Section heading
<h2 className="text-3xl font-semibold text-foreground mb-4">
  Popular Games
</h2>

// h3 - Subsection
<h3 className="text-2xl font-semibold text-foreground mb-3">
  Flash Games
</h3>

// h4 - Card title
<h4 className="text-xl font-semibold text-foreground mb-2">
  Game Title
</h4>
```

### Body Text

```tsx
// Large body
<p className="text-lg text-foreground leading-relaxed">
  Introduction or emphasized paragraph.
</p>

// Normal body (most common)
<p className="text-base text-foreground leading-normal">
  Standard paragraph text for general content.
</p>

// Small body
<p className="text-sm text-muted-foreground">
  Supporting information or descriptions.
</p>

// Tiny text
<span className="text-xs text-muted-foreground">
  Last updated: 2026-02-03
</span>
```

## Text Utilities

### Alignment

```tsx
<p className="text-left">Left aligned (default)</p>
<p className="text-center">Center aligned</p>
<p className="text-right">Right aligned</p>
<p className="text-justify">Justified</p>
```

### Transform

```tsx
<p className="uppercase">UPPERCASE TEXT</p>
<p className="lowercase">lowercase text</p>
<p className="capitalize">Capitalize Each Word</p>
```

### Decoration

```tsx
<a className="underline">Link with underline</a>
<a className="no-underline hover:underline">Underline on hover</a>
<p className="line-through">Strikethrough text</p>
```

### Truncation

```tsx
// Single line with ellipsis
<p className="truncate max-w-xs">
  This very long text will be truncated...
</p>

// Multi-line (line-clamp plugin)
<p className="line-clamp-2">
  Limited to 2 lines with ellipsis
</p>

// No wrap
<p className="whitespace-nowrap">
  This text will not wrap to next line
</p>
```

### Letter Spacing

```tsx
<p className="tracking-tight">Tight spacing</p>
<p className="tracking-normal">Normal spacing</p>
<p className="tracking-wide">Wide spacing</p>

// Common pattern
<h1 className="text-4xl font-bold tracking-tight">Tight heading</h1>
```

## Common Patterns

### Card Title with Description

```tsx
<Card>
  <CardHeader>
    <CardTitle className="text-2xl font-semibold leading-none">
      Game Title
    </CardTitle>
    <CardDescription className="text-sm text-muted-foreground mt-1.5">
      Released in 2010 • Flash Platform
    </CardDescription>
  </CardHeader>
</Card>
```

### Page Header

```tsx
<div className="mb-8">
  <h1 className="text-4xl font-bold tracking-tight text-foreground">
    Browse Library
  </h1>
  <p className="text-lg text-muted-foreground mt-2">
    Explore thousands of games
  </p>
</div>
```

### List with Labels

```tsx
<dl className="space-y-2">
  <div>
    <dt className="text-sm font-medium text-muted-foreground">Developer</dt>
    <dd className="text-base text-foreground mt-1">Studio Name</dd>
  </div>
  <div>
    <dt className="text-sm font-medium text-muted-foreground">Release Date</dt>
    <dd className="text-base text-foreground mt-1">January 15, 2010</dd>
  </div>
</dl>
```

## Responsive Typography

Scale text across breakpoints:

```tsx
// Heading
<h1 className="text-3xl md:text-4xl lg:text-5xl font-bold">
  Responsive Heading
</h1>

// Body text
<p className="text-sm md:text-base lg:text-lg">
  This text scales on larger screens
</p>

// Mobile-first approach
<h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl">
  Mobile First Heading
</h1>
```

## Accessibility

### Minimum Font Sizes

- Body text: 14px (text-sm) minimum
- Small text: 12px (text-xs) minimum
- Interactive text: 44px touch target minimum

### Color Contrast

All text meets WCAG 2.1 AA standards:

```tsx
// Good: High contrast
<p className="text-foreground">Primary text</p>

// Good: Still readable
<p className="text-muted-foreground">Secondary text</p>

// Avoid: Low contrast
<p className="text-gray-300">Too light</p>
```

### Line Length

Optimal: 50-75 characters per line

```tsx
<article className="max-w-2xl mx-auto">
  <p className="text-base leading-relaxed">
    Comfortable line length for extended reading.
  </p>
</article>
```

## Best Practices

1. **Establish Clear Hierarchy** - Use consistent size/weight relationships
2. **Limit Font Weights** - 2-3 weights maximum per screen
3. **Use Semantic HTML** - `<h1>`, `<h2>`, `<p>`, not divs
4. **Maintain Consistency** - Create reusable text components

---

Next: [Spacing & Layout](./spacing-layout.md) - Spacing scale and layouts
