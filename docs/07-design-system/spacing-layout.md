# Spacing & Layout

The Flashpoint Web design system uses Tailwind CSS's spacing scale for consistent spacing and layout patterns throughout the application. This ensures visual rhythm, proper alignment, and a cohesive user experience.

## Spacing Scale

Tailwind uses a base unit of **4px** (0.25rem) for its spacing scale, providing fine-grained control over spacing.

### Complete Spacing Scale

| Class | Rem | Pixels | Use Case |
|-------|-----|--------|----------|
| `0` | 0 | 0px | Remove spacing |
| `px` | 1px | 1px | Hairline borders |
| `0.5` | 0.125rem | 2px | Tiny gaps |
| `1` | 0.25rem | 4px | Extra small spacing |
| `1.5` | 0.375rem | 6px | Between 1 and 2 |
| `2` | 0.5rem | 8px | Small spacing |
| `2.5` | 0.625rem | 10px | Between 2 and 3 |
| `3` | 0.75rem | 12px | Medium-small spacing |
| `3.5` | 0.875rem | 14px | Between 3 and 4 |
| `4` | 1rem | 16px | Medium spacing (base) |
| `5` | 1.25rem | 20px | Medium-large spacing |
| `6` | 1.5rem | 24px | Large spacing |
| `7` | 1.75rem | 28px | Between 6 and 8 |
| `8` | 2rem | 32px | Extra large spacing |
| `9` | 2.25rem | 36px | Between 8 and 10 |
| `10` | 2.5rem | 40px | 2X large spacing |
| `11` | 2.75rem | 44px | Between 10 and 12 |
| `12` | 3rem | 48px | 3X large spacing |
| `14` | 3.5rem | 56px | 4X large spacing |
| `16` | 4rem | 64px | 5X large spacing |
| `20` | 5rem | 80px | 6X large spacing |
| `24` | 6rem | 96px | 7X large spacing |
| `28` | 7rem | 112px | 8X large spacing |
| `32` | 8rem | 128px | 9X large spacing |
| `36` | 9rem | 144px | 10X large spacing |
| `40` | 10rem | 160px | 11X large spacing |
| `44` | 11rem | 176px | 12X large spacing |
| `48` | 12rem | 192px | 13X large spacing |
| `52` | 13rem | 208px | 14X large spacing |
| `56` | 14rem | 224px | 15X large spacing |
| `60` | 15rem | 240px | 16X large spacing |
| `64` | 16rem | 256px | 17X large spacing |
| `72` | 18rem | 288px | 18X large spacing |
| `80` | 20rem | 320px | 19X large spacing |
| `96` | 24rem | 384px | 20X large spacing |

---

## Spacing Utilities

### Padding

Apply padding to all sides or specific sides:

```tsx
// All sides
<div className="p-4">Padding on all sides (16px)</div>

// Individual sides
<div className="pt-4">Padding top (16px)</div>
<div className="pr-4">Padding right (16px)</div>
<div className="pb-4">Padding bottom (16px)</div>
<div className="pl-4">Padding left (16px)</div>

// Horizontal (left + right)
<div className="px-4">Padding horizontal (16px)</div>

// Vertical (top + bottom)
<div className="py-4">Padding vertical (16px)</div>

// Mixed
<div className="px-6 py-4">Different horizontal and vertical</div>
```

### Margin

Same syntax as padding, using `m` instead of `p`:

```tsx
// All sides
<div className="m-4">Margin on all sides (16px)</div>

// Individual sides
<div className="mt-4">Margin top (16px)</div>
<div className="mr-4">Margin right (16px)</div>
<div className="mb-4">Margin bottom (16px)</div>
<div className="ml-4">Margin left (16px)</div>

// Horizontal and vertical
<div className="mx-4">Margin horizontal (16px)</div>
<div className="my-4">Margin vertical (16px)</div>

// Auto centering
<div className="mx-auto">Center horizontally</div>

// Negative margins (use with caution)
<div className="-mt-4">Negative margin top (-16px)</div>
```

### Space Between

Add spacing between child elements:

```tsx
// Vertical spacing between children
<div className="space-y-4">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>

// Horizontal spacing between children
<div className="flex space-x-4">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>

// Different sizes
<div className="space-y-2">Tight vertical spacing (8px)</div>
<div className="space-y-6">Loose vertical spacing (24px)</div>
```

---

## Common Spacing Patterns

### Component Padding

```tsx
// Card content
<Card>
  <CardHeader className="p-6">
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent className="p-6 pt-0">
    Content
  </CardContent>
  <CardFooter className="p-6 pt-0">
    Actions
  </CardFooter>
</Card>

// Button padding
<Button className="px-4 py-2">Default</Button>
<Button className="px-3 py-2">Small</Button>
<Button className="px-8 py-2">Large</Button>

// Input padding
<Input className="px-3 py-2" />
```

### Section Spacing

```tsx
// Page sections
<div className="mb-8">
  <h1 className="text-4xl font-bold mb-6">Page Title</h1>
  <p className="text-lg text-muted-foreground">Description</p>
</div>

<section className="mb-12">
  <h2 className="text-3xl font-semibold mb-4">Section</h2>
  <div className="space-y-4">
    {/* Content */}
  </div>
</section>

// Between sections (larger gaps)
<div className="space-y-12">
  <section>Section 1</section>
  <section>Section 2</section>
  <section>Section 3</section>
</div>
```

### List Spacing

```tsx
// Tight list (metadata, tags)
<ul className="space-y-1">
  <li>Item 1</li>
  <li>Item 2</li>
  <li>Item 3</li>
</ul>

// Normal list
<ul className="space-y-2">
  <li>Item 1</li>
  <li>Item 2</li>
</ul>

// Loose list (cards, large items)
<div className="space-y-4">
  <Card>Card 1</Card>
  <Card>Card 2</Card>
</div>
```

---

## Layout Patterns

### Container

The container component centers content and provides responsive padding.

```tsx
// Default container (max-width 1400px on 2xl screens)
<div className="container mx-auto px-4">
  Content
</div>

// Container with different padding
<div className="container mx-auto px-6 md:px-8">
  Content
</div>

// Full-width container with padding
<div className="w-full px-4 md:px-6 lg:px-8">
  Content
</div>
```

**Container Breakpoints:**
```javascript
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

### Flexbox Layouts

#### Basic Flex

```tsx
// Horizontal layout
<div className="flex">
  <div>Item 1</div>
  <div>Item 2</div>
</div>

// Vertical layout
<div className="flex flex-col">
  <div>Item 1</div>
  <div>Item 2</div>
</div>

// Wrap items
<div className="flex flex-wrap">
  <div>Item 1</div>
  <div>Item 2</div>
</div>
```

#### Flex Alignment

```tsx
// Horizontal alignment (justify-content)
<div className="flex justify-start">Left aligned</div>
<div className="flex justify-center">Center aligned</div>
<div className="flex justify-end">Right aligned</div>
<div className="flex justify-between">Space between</div>
<div className="flex justify-around">Space around</div>
<div className="flex justify-evenly">Space evenly</div>

// Vertical alignment (align-items)
<div className="flex items-start">Top aligned</div>
<div className="flex items-center">Center aligned</div>
<div className="flex items-end">Bottom aligned</div>
<div className="flex items-stretch">Stretched</div>
<div className="flex items-baseline">Baseline aligned</div>

// Combined
<div className="flex items-center justify-between">
  <span>Left</span>
  <span>Right</span>
</div>
```

#### Flex Gaps

```tsx
// Gap between items (preferred over margins)
<div className="flex gap-4">
  <div>Item 1</div>
  <div>Item 2</div>
</div>

// Different horizontal and vertical gaps
<div className="flex flex-wrap gap-x-4 gap-y-2">
  <div>Item 1</div>
  <div>Item 2</div>
</div>
```

#### Flex Grow/Shrink

```tsx
// Grow to fill space
<div className="flex">
  <div className="flex-1">Grows to fill</div>
  <div>Fixed width</div>
</div>

// No shrink
<div className="flex">
  <div className="flex-shrink-0">No shrink</div>
  <div className="flex-1">Flexible</div>
</div>
```

### Grid Layouts

#### Basic Grid

```tsx
// Simple grid
<div className="grid grid-cols-3 gap-4">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
  <div>Item 4</div>
  <div>Item 5</div>
  <div>Item 6</div>
</div>

// Different column counts
<div className="grid grid-cols-2 gap-4">2 columns</div>
<div className="grid grid-cols-4 gap-4">4 columns</div>
<div className="grid grid-cols-5 gap-4">5 columns</div>
```

#### Responsive Grid

```tsx
// Mobile-first responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>

// Different gaps per breakpoint
<div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 lg:gap-8">
  Content
</div>
```

#### Grid Column Spanning

```tsx
<div className="grid grid-cols-4 gap-4">
  <div className="col-span-2">Spans 2 columns</div>
  <div>1 column</div>
  <div>1 column</div>
  <div className="col-span-3">Spans 3 columns</div>
  <div>1 column</div>
</div>

// Full width
<div className="col-span-full">Spans all columns</div>
```

#### Auto-Fill Grid

```tsx
// Automatically fill with columns
<div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
  <div>Card 1</div>
  <div>Card 2</div>
  <div>Card 3</div>
  {/* Automatically wraps based on available space */}
</div>

// Common pattern for card grids
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  <GameCard />
  <GameCard />
  <GameCard />
</div>
```

---

## Page Layout Patterns

### Standard Page Layout

```tsx
function PageLayout() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <nav>Navigation</nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-6">Page Title</h1>
        <div className="space-y-8">
          {/* Page sections */}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-16">
        <div className="container mx-auto px-4 py-8">
          Footer content
        </div>
      </footer>
    </div>
  );
}
```

### Two-Column Layout

```tsx
function TwoColumnLayout() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar */}
        <aside className="lg:col-span-3">
          <div className="space-y-4">
            {/* Sidebar content */}
          </div>
        </aside>

        {/* Main content */}
        <main className="lg:col-span-9">
          <div className="space-y-6">
            {/* Main content */}
          </div>
        </main>
      </div>
    </div>
  );
}
```

### Card Grid Layout

```tsx
function CardGridLayout() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Browse Games</h1>
        <p className="text-lg text-muted-foreground">
          Explore the collection
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <FilterPanel />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {games.map(game => (
          <GameCard key={game.id} game={game} />
        ))}
      </div>
    </div>
  );
}
```

### Split View Layout

```tsx
function SplitViewLayout() {
  return (
    <div className="h-screen flex">
      {/* Left panel */}
      <div className="w-1/2 border-r border-border p-6 overflow-y-auto">
        <div className="space-y-4">
          {/* Left content */}
        </div>
      </div>

      {/* Right panel */}
      <div className="w-1/2 p-6 overflow-y-auto">
        <div className="space-y-4">
          {/* Right content */}
        </div>
      </div>
    </div>
  );
}
```

---

## Component Layout Patterns

### Card Layout

```tsx
function CardLayout() {
  return (
    <Card>
      {/* Header with padding */}
      <CardHeader className="space-y-1.5 p-6">
        <CardTitle className="text-2xl font-semibold leading-none tracking-tight">
          Card Title
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Card description
        </CardDescription>
      </CardHeader>

      {/* Content with top padding removed */}
      <CardContent className="p-6 pt-0">
        <div className="space-y-4">
          {/* Card content */}
        </div>
      </CardContent>

      {/* Footer */}
      <CardFooter className="flex items-center p-6 pt-0">
        <Button>Action</Button>
      </CardFooter>
    </Card>
  );
}
```

### Form Layout

```tsx
function FormLayout() {
  return (
    <form className="space-y-6">
      {/* Form field */}
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input id="username" placeholder="Enter username" />
        <p className="text-sm text-muted-foreground">
          Your unique username
        </p>
      </div>

      {/* Form field */}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" placeholder="you@example.com" />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button variant="outline">Cancel</Button>
        <Button>Submit</Button>
      </div>
    </form>
  );
}
```

### List Layout

```tsx
function ListLayout() {
  return (
    <div className="space-y-2">
      {items.map(item => (
        <div
          key={item.id}
          className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent transition-colors"
        >
          <div className="flex items-center gap-4">
            <Avatar />
            <div>
              <p className="font-medium">{item.title}</p>
              <p className="text-sm text-muted-foreground">{item.subtitle}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm">
            View
          </Button>
        </div>
      ))}
    </div>
  );
}
```

---

## Responsive Spacing

Adjust spacing based on screen size:

```tsx
// Padding
<div className="p-4 md:p-6 lg:p-8">
  Responsive padding
</div>

// Margin
<div className="mb-4 md:mb-6 lg:mb-8">
  Responsive margin
</div>

// Gap
<div className="flex gap-2 md:gap-4 lg:gap-6">
  Responsive gap
</div>

// Space between
<div className="space-y-4 md:space-y-6 lg:space-y-8">
  Responsive vertical spacing
</div>
```

---

## Width & Height Utilities

### Fixed Widths

```tsx
<div className="w-64">Fixed width (256px)</div>
<div className="h-64">Fixed height (256px)</div>

// Common sizes
<div className="w-32">128px</div>
<div className="w-48">192px</div>
<div className="w-64">256px</div>
<div className="w-96">384px</div>
```

### Percentage Widths

```tsx
<div className="w-1/2">50% width</div>
<div className="w-1/3">33.33% width</div>
<div className="w-2/3">66.67% width</div>
<div className="w-1/4">25% width</div>
<div className="w-3/4">75% width</div>
<div className="w-full">100% width</div>
```

### Max Widths

```tsx
<div className="max-w-sm">384px max</div>
<div className="max-w-md">448px max</div>
<div className="max-w-lg">512px max</div>
<div className="max-w-xl">576px max</div>
<div className="max-w-2xl">672px max</div>
<div className="max-w-4xl">896px max</div>
<div className="max-w-6xl">1152px max</div>

// Common pattern
<article className="max-w-2xl mx-auto">
  Centered content with max width
</article>
```

### Min/Max Heights

```tsx
<div className="min-h-screen">Full viewport height</div>
<div className="min-h-full">100% of parent</div>
<div className="max-h-96">Max height 384px</div>
```

---

## Best Practices

### 1. Consistent Spacing

Use the spacing scale consistently:

```tsx
// Good: Consistent spacing units
<div className="mb-4">
  <h2 className="mb-2">Title</h2>
  <p>Content</p>
</div>

// Bad: Arbitrary values
<div className="mb-[17px]">
  <h2 className="mb-[9px]">Title</h2>
</div>
```

### 2. Use Gap Over Margins

Prefer `gap` for flex/grid layouts:

```tsx
// Good: Using gap
<div className="flex gap-4">
  <div>Item 1</div>
  <div>Item 2</div>
</div>

// Less ideal: Using margins
<div className="flex">
  <div className="mr-4">Item 1</div>
  <div>Item 2</div>
</div>
```

### 3. Vertical Rhythm

Maintain consistent vertical spacing:

```tsx
// Good: Clear vertical rhythm
<article className="space-y-6">
  <section className="space-y-4">
    <h2>Section 1</h2>
    <p>Content</p>
  </section>
  <section className="space-y-4">
    <h2>Section 2</h2>
    <p>Content</p>
  </section>
</article>
```

### 4. Responsive Spacing

Increase spacing on larger screens:

```tsx
<div className="px-4 md:px-6 lg:px-8">
  More padding on larger screens
</div>
```

---

Next: [Components Library](./components-library.md) - Shadcn UI components catalog
