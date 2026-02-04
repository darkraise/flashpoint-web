# Color Palette

22 color palettes with HSL values for light and dark modes. All colors meet WCAG
2.1 AA accessibility standards.

## HSL Format

Colors stored as HSL without `hsl()` wrapper to support opacity modifiers:

```css
--primary: 221.2 83.2% 53.3%;
```

Usage:

```tsx
bg-primary; /* hsl(221.2 83.2% 53.3%) */
bg-primary/50; /* hsl(221.2 83.2% 53.3% / 0.5) */
bg-primary/20; /* hsl(221.2 83.2% 53.3% / 0.2) */
```

## Neutral Palettes

| Palette     | Light               | Dark              | Use Cases          |
| ----------- | ------------------- | ----------------- | ------------------ |
| **Slate**   | `215.4 16.3% 46.9%` | `215.3 25% 56.9%` | Cool, modern       |
| **Gray**    | `220 8.9% 46.1%`    | `220 13% 69%`     | True neutral       |
| **Zinc**    | `240 3.8% 46.1%`    | `240 5% 65%`      | Warm, contemporary |
| **Neutral** | `0 0% 45.1%`        | `0 0% 65%`        | Pure grayscale     |
| **Stone**   | `25 5.3% 44.7%`     | `33.3 5.5% 63.9%` | Beige-gray, warm   |

## Warm Palettes

| Palette    | Light              | Dark               | Use Cases          |
| ---------- | ------------------ | ------------------ | ------------------ |
| **Red**    | `0 72.2% 50.6%`    | `0 72.2% 60.6%`    | Energy, attention  |
| **Orange** | `24.6 95% 53.1%`   | `20.5 90.2% 58.2%` | Warm, friendly     |
| **Amber**  | `37.7 92.1% 50.2%` | `32.1 94.6% 58%`   | Golden, inviting   |
| **Yellow** | `45 93.4% 47.5%`   | `47.9 95.8% 58.1%` | Cheerful, positive |

## Cool Palettes

| Palette     | Light               | Dark                | Use Cases              |
| ----------- | ------------------- | ------------------- | ---------------------- |
| **Lime**    | `84 81% 44.3%`      | `82.7 85% 55.1%`    | Fresh, lively          |
| **Green**   | `142.1 70.6% 45.3%` | `142.1 76.2% 56.2%` | Success, growth        |
| **Emerald** | `160.1 84.1% 39.4%` | `160.1 84.1% 49.4%` | Rich, luxurious        |
| **Teal**    | `173.4 80.4% 40%`   | `172.5 66% 50.4%`   | Professional, calm     |
| **Cyan**    | `188.7 85.7% 53.3%` | `187.2 85.7% 53.3%` | Modern, refreshing     |
| **Sky**     | `199.3 89.1% 48.2%` | `198.6 88.7% 58.4%` | Airy, open             |
| **Blue**    | `221.2 83.2% 53.3%` | `217.2 91.2% 59.8%` | Professional (default) |

## Violet/Purple Palettes

| Palette     | Light               | Dark                | Use Cases           |
| ----------- | ------------------- | ------------------- | ------------------- |
| **Indigo**  | `238.7 83.5% 66.7%` | `239.4 84.1% 76.7%` | Deep, elegant       |
| **Violet**  | `262.1 83.3% 57.8%` | `262.1 83.3% 67.8%` | Creative, unique    |
| **Purple**  | `258.3 89.5% 58.4%` | `258.3 89.5% 68.4%` | Luxury, imagination |
| **Fuchsia** | `292.2 84.1% 60.6%` | `292.2 84.1% 70.6%` | Bold, playful       |

## Pink/Rose Palettes

| Palette  | Light               | Dark                | Use Cases         |
| -------- | ------------------- | ------------------- | ----------------- |
| **Pink** | `330.4 81.2% 60.4%` | `330.4 81.2% 70.4%` | Social, friendly  |
| **Rose** | `346.8 77.2% 49.8%` | `346.8 77.2% 59.8%` | Romantic, elegant |

## Semantic Color Roles

### Background & Foreground

```tsx
// Page background
<div className="bg-background" />
// Light: 0 0% 98% | Dark: 222.2 84% 4.9%

// Main text
<p className="text-foreground" />
// Light: 222.2 84% 4.9% | Dark: 210 40% 98%

// Muted text (secondary info)
<p className="text-muted-foreground" />
// Light: 215.4 16.3% 46.9% | Dark: 215 20.2% 65.1%
```

### Interactive Colors

```tsx
// Primary actions (user-customizable)
<Button className="bg-primary text-primary-foreground">Save</Button>

// Secondary actions
<Button className="bg-secondary text-secondary-foreground">Cancel</Button>

// Errors and destructive actions
<Button className="bg-destructive text-destructive-foreground">Delete</Button>

// Hover/accent states
<div className="hover:bg-accent hover:text-accent-foreground" />
```

### Borders & Inputs

```tsx
// Borders
<div className="border border-border" />
// Light: 214.3 31.8% 91.4% | Dark: 217.2 32.6% 17.5%

// Focus rings (matches primary)
<button className="focus-visible:ring-2 ring-ring" />
```

## Usage Guidelines

### Use Semantic Tokens

```tsx
// Good: Theme-aware
<Card className="bg-card border-border" />

// Bad: Hard-coded colors
<Card className="bg-white border-gray-200" />
```

### Opacity Modifiers

```tsx
// Background with opacity
<div className="bg-primary/10" />  // 10% opacity
<div className="bg-primary/50" />  // 50% opacity

// Text with opacity
<p className="text-foreground/70" />  // 70% opacity

// Borders with opacity
<div className="border border-primary/30" />
```

## Contrast Requirements (WCAG 2.1 AA)

- **Normal text (< 18pt):** 4.5:1 contrast ratio
- **Large text (>= 18pt):** 3:1 contrast ratio
- **UI components:** 3:1 contrast ratio

All palette colors meet these standards.

## Best Practices

### 1. Use Semantic Tokens

```tsx
// Good
<div className="bg-background text-foreground border-border" />

// Bad - breaks theming
<div className="bg-white text-black border-gray-300" />
```

### 2. Limit Primary Color Usage

```tsx
// Good: Strategic primary use
<Button variant="default">Save</Button>  /* primary */
<Button variant="outline">Cancel</Button>  /* secondary */

// Bad: Primary everywhere
<div className="bg-primary text-primary">
  <h1 className="text-primary">Title</h1>
</div>
```

### 3. Test Both Themes

Always verify in light and dark modes:

```tsx
const { setMode } = useThemeStore();

// Toggle for testing
<button onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}>
  Toggle Theme
</button>;
```

### 4. Maintain Consistency

Keep error colors consistent across app:

```tsx
// Consistent error color
<Alert variant="destructive">Error</Alert>
<Button variant="destructive">Delete</Button>
```

---

Next: [Typography](./typography.md) - Font system and text styles
