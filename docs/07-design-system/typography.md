# Typography

The Flashpoint Web typography system provides a consistent, accessible, and scalable text hierarchy using the Inter font family with carefully calibrated sizes, weights, and line heights.

## Font Family

### Primary Font: Inter

Inter is a modern, highly legible sans-serif typeface designed specifically for user interfaces.

```css
font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
```

**Characteristics:**
- Optimized for screen readability
- Excellent character differentiation (1, l, I are distinct)
- Wide range of weights (100-900)
- Extensive Unicode support
- Open source (SIL Open Font License)

**Fallback Chain:**
1. **Inter** - Primary font (loaded via CDN or local)
2. **system-ui** - System default UI font
3. **Avenir** - macOS fallback
4. **Helvetica** - Classic fallback
5. **Arial** - Universal fallback
6. **sans-serif** - Generic fallback

### Font Loading

```html
<!-- Loaded in index.html -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

**Optimization:**
- `preconnect` for faster font loading
- `display=swap` to prevent invisible text
- Only loading used weights (400, 500, 600, 700)

---

## Font Sizes

Tailwind provides 12 text sizes from `xs` to `9xl`. Common sizes used in Flashpoint Web:

### Text Scale

| Class | Size | Rem | Pixels | Use Case |
|-------|------|-----|--------|----------|
| `text-xs` | 0.75rem | 0.75 | 12px | Tiny labels, badges |
| `text-sm` | 0.875rem | 0.875 | 14px | Small text, captions |
| `text-base` | 1rem | 1 | 16px | Body text (default) |
| `text-lg` | 1.125rem | 1.125 | 18px | Emphasized body text |
| `text-xl` | 1.25rem | 1.25 | 20px | Small headings |
| `text-2xl` | 1.5rem | 1.5 | 24px | Card titles, h3 |
| `text-3xl` | 1.875rem | 1.875 | 30px | Section headings, h2 |
| `text-4xl` | 2.25rem | 2.25 | 36px | Page titles, h1 |
| `text-5xl` | 3rem | 3 | 48px | Large displays |
| `text-6xl` | 3.75rem | 3.75 | 60px | Hero text |
| `text-7xl` | 4.5rem | 4.5 | 72px | Extra large displays |
| `text-8xl` | 6rem | 6 | 96px | Massive displays |
| `text-9xl` | 8rem | 8 | 128px | Gigantic displays |

### Usage Examples

```tsx
// Headings
<h1 className="text-4xl font-bold">Page Title</h1>
<h2 className="text-3xl font-semibold">Section Heading</h2>
<h3 className="text-2xl font-semibold">Subsection</h3>

// Body text
<p className="text-base">Standard paragraph text</p>
<p className="text-sm text-muted-foreground">Supporting text</p>

// UI elements
<span className="text-xs text-muted-foreground">Label</span>
<Badge className="text-xs">New</Badge>

// Display text
<div className="text-6xl font-bold">10,000+</div>
<p className="text-lg">Games available</p>
```

---

## Font Weights

Four weights are used consistently across the application:

### Weight Scale

| Class | Weight | Value | Use Case |
|-------|--------|-------|----------|
| `font-normal` | Normal | 400 | Body text, paragraphs |
| `font-medium` | Medium | 500 | Emphasis, labels, buttons |
| `font-semibold` | Semi-bold | 600 | Headings, important text |
| `font-bold` | Bold | 700 | Strong emphasis, titles |

### Usage Guidelines

```tsx
// Body text - normal weight
<p className="font-normal">
  Regular paragraph text for easy reading.
</p>

// Labels and emphasis - medium weight
<label className="font-medium">
  Username
</label>

// Headings - semibold or bold
<h2 className="text-3xl font-semibold">Section Title</h2>
<h1 className="text-4xl font-bold">Page Title</h1>

// Buttons - medium weight
<Button className="font-medium">
  Click Here
</Button>
```

**Best Practice:** Don't use too many different weights on a single screen. Stick to 2-3 weights maximum for visual hierarchy.

---

## Line Heights

Tailwind's line height utilities optimize readability for different text sizes.

### Line Height Scale

| Class | Ratio | Use Case |
|-------|-------|----------|
| `leading-none` | 1 | Tight headings, badges |
| `leading-tight` | 1.25 | Large headings |
| `leading-snug` | 1.375 | Card titles |
| `leading-normal` | 1.5 | Body text (default) |
| `leading-relaxed` | 1.625 | Long-form content |
| `leading-loose` | 2 | Poetry, special layouts |

### Default Line Heights

Tailwind automatically applies appropriate line heights:

```css
/* Headings get tighter line heights */
.text-4xl { line-height: 1.1; }  /* 2.5rem */
.text-3xl { line-height: 1.2; }  /* 2.25rem */
.text-2xl { line-height: 1.3; }  /* 2rem */

/* Body text gets comfortable line height */
.text-base { line-height: 1.5; }  /* 1.5rem */
.text-sm { line-height: 1.43; }  /* 1.25rem */
```

### Usage Examples

```tsx
// Tight heading (large display)
<h1 className="text-6xl font-bold leading-tight">
  Welcome to Flashpoint
</h1>

// Normal body text (default)
<p className="text-base leading-normal">
  Flashpoint is a web application for browsing and playing
  games from the Flashpoint Archive.
</p>

// Relaxed long-form content
<article className="prose">
  <p className="leading-relaxed">
    Long article text with extra breathing room for comfortable
    reading over extended periods.
  </p>
</article>

// Compact UI elements
<Badge className="leading-none">
  New
</Badge>
```

---

## Text Colors

Use semantic color tokens for text to ensure theme compatibility.

### Color Utilities

| Class | CSS Variable | Use Case |
|-------|--------------|----------|
| `text-foreground` | `--foreground` | Primary text |
| `text-muted-foreground` | `--muted-foreground` | Secondary text |
| `text-primary` | `--primary` | Brand-colored text |
| `text-destructive` | `--destructive` | Error messages |
| `text-card-foreground` | `--card-foreground` | Text on cards |

### Usage Examples

```tsx
// Primary text (default)
<h1 className="text-foreground">Main Heading</h1>

// Secondary/muted text
<p className="text-muted-foreground">
  Supporting description or metadata
</p>

// Brand-colored text (use sparingly)
<span className="text-primary font-semibold">
  Featured
</span>

// Error text
<p className="text-destructive text-sm">
  Invalid username or password
</p>

// Text on colored backgrounds
<div className="bg-primary text-primary-foreground">
  Button Text
</div>
```

---

## Typography Hierarchy

Consistent hierarchy creates visual order and improves readability.

### Heading Hierarchy

```tsx
// Page title (h1)
<h1 className="text-4xl font-bold text-foreground mb-6">
  Browse Games
</h1>

// Section heading (h2)
<h2 className="text-3xl font-semibold text-foreground mb-4">
  Popular Games
</h2>

// Subsection heading (h3)
<h3 className="text-2xl font-semibold text-foreground mb-3">
  Flash Games
</h3>

// Card title (h4)
<h4 className="text-xl font-semibold text-foreground mb-2">
  Game Title
</h4>

// Small heading (h5)
<h5 className="text-lg font-medium text-foreground mb-2">
  Details
</h5>

// Tiny heading (h6)
<h6 className="text-base font-medium text-foreground mb-1">
  Metadata
</h6>
```

### Body Text Hierarchy

```tsx
// Large body text
<p className="text-lg text-foreground leading-relaxed">
  Introduction or emphasized paragraph.
</p>

// Normal body text (most common)
<p className="text-base text-foreground leading-normal">
  Standard paragraph text for general content.
</p>

// Small body text
<p className="text-sm text-muted-foreground">
  Supporting information or descriptions.
</p>

// Tiny text (captions, labels)
<span className="text-xs text-muted-foreground">
  Last updated: 2026-01-18
</span>
```

---

## Special Text Utilities

### Text Alignment

```tsx
<p className="text-left">Left aligned (default)</p>
<p className="text-center">Center aligned</p>
<p className="text-right">Right aligned</p>
<p className="text-justify">Justified text</p>
```

### Text Transform

```tsx
<p className="uppercase">UPPERCASE TEXT</p>
<p className="lowercase">lowercase text</p>
<p className="capitalize">Capitalize Each Word</p>
<p className="normal-case">Normal case</p>
```

### Text Decoration

```tsx
<a className="underline">Link with underline</a>
<a className="no-underline hover:underline">Underline on hover</a>
<p className="line-through">Strikethrough text</p>
```

### Text Truncation

```tsx
// Single line truncation
<p className="truncate max-w-xs">
  This very long text will be truncated with ellipsis...
</p>

// Multi-line truncation (requires line-clamp plugin)
<p className="line-clamp-2">
  This text will be limited to 2 lines and show ellipsis
  if it exceeds that length. Perfect for card descriptions.
</p>

// No wrap
<p className="whitespace-nowrap">
  This text will not wrap to next line
</p>
```

### Letter Spacing

```tsx
<p className="tracking-tighter">Tighter spacing</p>
<p className="tracking-tight">Tight spacing</p>
<p className="tracking-normal">Normal spacing</p>
<p className="tracking-wide">Wide spacing</p>
<p className="tracking-wider">Wider spacing</p>
<p className="tracking-widest">Widest spacing</p>

// Common use case
<h1 className="text-4xl font-bold tracking-tight">
  Tight heading
</h1>
```

---

## Common Typography Patterns

### Card Title with Description

```tsx
<Card>
  <CardHeader>
    <CardTitle className="text-2xl font-semibold leading-none tracking-tight">
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
    Explore thousands of games from the Flashpoint Archive
  </p>
</div>
```

### List with Labels

```tsx
<dl className="space-y-2">
  <div>
    <dt className="text-sm font-medium text-muted-foreground">
      Developer
    </dt>
    <dd className="text-base font-normal text-foreground mt-1">
      Studio Name
    </dd>
  </div>
  <div>
    <dt className="text-sm font-medium text-muted-foreground">
      Release Date
    </dt>
    <dd className="text-base font-normal text-foreground mt-1">
      January 15, 2010
    </dd>
  </div>
</dl>
```

### Button Text

```tsx
<Button className="font-medium">
  Save Changes
</Button>

<Button variant="outline" className="font-medium">
  Cancel
</Button>

<Button variant="link" className="font-medium underline-offset-4">
  Learn More
</Button>
```

### Error Messages

```tsx
<Alert variant="destructive">
  <AlertCircle className="h-4 w-4" />
  <AlertTitle className="text-sm font-medium">
    Error
  </AlertTitle>
  <AlertDescription className="text-sm">
    Your session has expired. Please log in again.
  </AlertDescription>
</Alert>
```

---

## Responsive Typography

Scale text sizes across breakpoints for optimal readability.

### Responsive Heading

```tsx
<h1 className="text-3xl md:text-4xl lg:text-5xl font-bold">
  Responsive Heading
</h1>
```

### Responsive Body Text

```tsx
<p className="text-sm md:text-base lg:text-lg">
  This text scales up on larger screens for better readability.
</p>
```

### Mobile-First Approach

```tsx
// Start with mobile size, scale up
<h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl">
  Mobile First Heading
</h1>

// Body text
<p className="text-sm sm:text-base">
  Body text that's smaller on mobile
</p>
```

---

## Accessibility Considerations

### Minimum Font Sizes

- **Body text**: Minimum 14px (0.875rem / text-sm)
- **Small text**: Minimum 12px (0.75rem / text-xs)
- **Touch targets**: Minimum 44px for interactive text

### Color Contrast

All text meets WCAG 2.1 AA standards:

```tsx
// Good: High contrast
<p className="text-foreground">Primary text</p>

// Good: Muted but still readable
<p className="text-muted-foreground">Secondary text</p>

// Bad: Avoid low-contrast combinations
<p className="text-gray-300">Too light in light mode</p>
```

### Line Length

Optimal line length for readability: 50-75 characters.

```tsx
// Good: Constrained width for readability
<article className="max-w-2xl mx-auto">
  <p className="text-base leading-relaxed">
    Long-form content with comfortable line length.
  </p>
</article>

// Bad: Full-width text is hard to read
<p className="w-full">
  Very long lines across the entire screen...
</p>
```

### Font Smoothing

Applied globally for better rendering:

```css
:root {
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

---

## Best Practices

### 1. Establish Clear Hierarchy

```tsx
// Good: Clear visual hierarchy
<article>
  <h1 className="text-4xl font-bold mb-4">Title</h1>
  <p className="text-lg text-muted-foreground mb-8">Subtitle</p>
  <p className="text-base leading-relaxed">Body content...</p>
</article>

// Bad: Inconsistent sizing
<article>
  <h1 className="text-2xl">Title</h1>
  <p className="text-xl">Subtitle</p>
  <p className="text-lg">Body</p>
</article>
```

### 2. Limit Font Weights

```tsx
// Good: 2-3 weights maximum
<div>
  <h1 className="font-bold">Heading</h1>
  <p className="font-medium">Label</p>
  <p className="font-normal">Body</p>
</div>

// Bad: Too many weights
<div>
  <h1 className="font-black">Title</h1>
  <h2 className="font-bold">Subtitle</h2>
  <p className="font-semibold">Label</p>
  <p className="font-medium">Description</p>
  <p className="font-normal">Body</p>
</div>
```

### 3. Use Semantic HTML

```tsx
// Good: Semantic elements
<article>
  <h1>Page Title</h1>
  <p>Paragraph text</p>
  <ul>
    <li>List item</li>
  </ul>
</article>

// Bad: Div soup
<div>
  <div className="text-4xl font-bold">Title</div>
  <div>Text</div>
</div>
```

### 4. Maintain Consistency

Create reusable text components:

```tsx
// Reusable typography components
export const PageTitle = ({ children }) => (
  <h1 className="text-4xl font-bold tracking-tight mb-6">
    {children}
  </h1>
);

export const SectionTitle = ({ children }) => (
  <h2 className="text-3xl font-semibold mb-4">
    {children}
  </h2>
);

export const BodyText = ({ children }) => (
  <p className="text-base leading-normal text-foreground">
    {children}
  </p>
);
```

---

Next: [Spacing & Layout](./spacing-layout.md) - Spacing scale and layout patterns
