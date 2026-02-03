# Spacing & Layout

Tailwind CSS spacing scale for consistent layouts and visual rhythm.

## Spacing Scale

Base unit: **4px (0.25rem)**

| Class | Pixels | Class | Pixels | Class | Pixels |
| ----- | ------ | ----- | ------ | ----- | ------ |
| `0`   | 0px    | `8`   | 32px   | `24`  | 96px   |
| `1`   | 4px    | `10`  | 40px   | `32`  | 128px  |
| `2`   | 8px    | `12`  | 48px   | `40`  | 160px  |
| `3`   | 12px   | `14`  | 56px   | `48`  | 192px  |
| `4`   | 16px   | `16`  | 64px   | `64`  | 256px  |
| `6`   | 24px   | `20`  | 80px   | `96`  | 384px  |

## Padding & Margin

```tsx
// All sides
<div className="p-4">All sides (16px)</div>

// Individual sides
<div className="pt-4 pr-6 pb-4 pl-6">Different sides</div>

// Horizontal/Vertical
<div className="px-4 py-2">Horizontal 16px, vertical 8px</div>

// Margin (same syntax with 'm')
<div className="m-4">All sides margin</div>
<div className="mx-auto">Center horizontally</div>
<div className="-mt-4">Negative margin</div>
```

## Space Between Children

```tsx
// Vertical spacing
<div className="space-y-4">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>

// Horizontal spacing
<div className="flex space-x-4">
  <div>Item 1</div>
  <div>Item 2</div>
</div>
```

## Flexbox Layouts

### Basic Flex

```tsx
// Horizontal
<div className="flex">
  <div>Item 1</div>
  <div>Item 2</div>
</div>

// Vertical
<div className="flex flex-col">
  <div>Item 1</div>
  <div>Item 2</div>
</div>

// Wrap
<div className="flex flex-wrap">
  {items}
</div>
```

### Alignment

```tsx
// Justify (horizontal)
<div className="flex justify-between">Left and right</div>
<div className="flex justify-center">Center</div>
<div className="flex justify-around">Space around</div>

// Align (vertical)
<div className="flex items-center">Vertically centered</div>
<div className="flex items-start">Top aligned</div>
<div className="flex items-end">Bottom aligned</div>

// Combined
<div className="flex items-center justify-between">
  <span>Left</span>
  <span>Right</span>
</div>
```

### Gap

```tsx
// Gap between flex items (preferred over margin)
<div className="flex gap-4">
  {items}
</div>

// Different horizontal and vertical gaps
<div className="flex flex-wrap gap-x-4 gap-y-2">
  {items}
</div>
```

## Grid Layouts

### Basic Grid

```tsx
// Simple grid
<div className="grid grid-cols-3 gap-4">
  {items}
</div>

// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {items}
</div>

// Game card grid (common pattern)
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {games.map(game => <GameCard key={game.id} game={game} />)}
</div>
```

### Column Spanning

```tsx
<div className="grid grid-cols-4 gap-4">
  <div className="col-span-2">Spans 2 columns</div>
  <div>1 column</div>
  <div>1 column</div>
  <div className="col-span-full">Full width</div>
</div>
```

## Page Layout Patterns

### Standard Page

```tsx
<div className="min-h-screen bg-background">
  <header className="border-b border-border">
    <div className="container mx-auto px-4 py-4">{/* Header content */}</div>
  </header>

  <main className="container mx-auto px-4 py-8">
    <h1 className="text-4xl font-bold mb-6">Page Title</h1>
    <div className="space-y-8">{/* Page sections */}</div>
  </main>

  <footer className="border-t border-border mt-16">
    <div className="container mx-auto px-4 py-8">{/* Footer */}</div>
  </footer>
</div>
```

### Two-Column Layout

```tsx
<div className="container mx-auto px-4 py-8">
  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
    {/* Sidebar (3 columns) */}
    <aside className="lg:col-span-3">
      <FilterPanel />
    </aside>

    {/* Main (9 columns) */}
    <main className="lg:col-span-9">
      <GameGrid />
    </main>
  </div>
</div>
```

### Card Grid

```tsx
<div className="container mx-auto px-4 py-8">
  <div className="mb-8">
    <h1 className="text-4xl font-bold mb-2">Browse Games</h1>
    <p className="text-lg text-muted-foreground">Explore the collection</p>
  </div>

  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
    {games.map((game) => (
      <GameCard key={game.id} game={game} />
    ))}
  </div>
</div>
```

## Container Component

Max-width container with responsive padding:

```tsx
// Basic
<div className="container mx-auto px-4">
  Content
</div>

// Responsive padding
<div className="container mx-auto px-4 md:px-6 lg:px-8">
  More padding on larger screens
</div>
```

**Max Widths:**

- Mobile: 100% (with padding)
- 2xl (1400px+): 1400px fixed width

## Responsive Spacing

```tsx
// Padding
<div className="p-4 md:p-6 lg:p-8">
  Increases on larger screens
</div>

// Margin
<div className="mb-4 md:mb-6 lg:mb-8">
  Section margin
</div>

// Gap
<div className="flex gap-2 md:gap-4 lg:gap-6">
  {items}
</div>

// Space between
<div className="space-y-4 md:space-y-6 lg:space-y-8">
  {items}
</div>
```

## Width & Height

### Fixed Widths

```tsx
<div className="w-64">256px</div>
<div className="w-96">384px</div>

// Percentages
<div className="w-1/2">50%</div>
<div className="w-1/3">33%</div>
<div className="w-2/3">67%</div>
<div className="w-full">100%</div>
```

### Max Widths

```tsx
<div className="max-w-md">448px max</div>
<div className="max-w-lg">512px max</div>
<div className="max-w-2xl">672px max</div>

// Common pattern for centered content
<article className="max-w-2xl mx-auto">
  Centered content with readable width
</article>
```

### Min/Max Heights

```tsx
<div className="min-h-screen">Full viewport height</div>
<div className="min-h-full">100% of parent</div>
<div className="max-h-96">Max height 384px</div>
```

## Best Practices

### 1. Use Consistent Spacing Units

```tsx
// Good: Consistent scale
<div className="mb-4">
  <h2 className="mb-2">Title</h2>
  <p>Content</p>
</div>

// Bad: Arbitrary values
<div className="mb-[17px]">
  <h2 className="mb-[9px]">Title</h2>
</div>
```

### 2. Prefer Gap Over Margins

```tsx
// Good: Using gap
<div className="flex gap-4">
  {items}
</div>

// Less ideal: Using margins
<div className="flex">
  <div className="mr-4">Item</div>
</div>
```

### 3. Maintain Vertical Rhythm

```tsx
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

```tsx
// Increase spacing on larger screens
<div className="px-4 md:px-6 lg:px-8">Content</div>
```

---

Next: [Typography](./typography.md) - Font system and text styles
