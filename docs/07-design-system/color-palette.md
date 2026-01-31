# Color Palette

The Flashpoint Web design system includes 22 carefully crafted color palettes, each with optimized values for both light and dark themes. All colors are defined in HSL (Hue, Saturation, Lightness) format for precise control and easy manipulation.

## HSL Color Format

Colors are stored as HSL values without the `hsl()` wrapper, allowing Tailwind to apply opacity modifiers.

```css
/* CSS Variable Definition */
--primary: 221.2 83.2% 53.3%;

/* Usage in Tailwind */
bg-primary        /* hsl(221.2 83.2% 53.3%) */
bg-primary/50     /* hsl(221.2 83.2% 53.3% / 0.5) */
bg-primary/20     /* hsl(221.2 83.2% 53.3% / 0.2) */
```

## Color Palettes

### Default: Blue
Classic, trustworthy, and professional.

**Light Mode:** `221.2 83.2% 53.3%` (Medium blue)
**Dark Mode:** `217.2 91.2% 59.8%` (Brighter blue)

```tsx
setPrimaryColor('blue');
```

**Use Cases:**
- Default theme color
- Professional applications
- Trust and reliability
- Technology products

---

### Neutral Palettes

#### Slate
Cool gray with subtle blue undertones. Modern and clean.

**Light Mode:** `215.4 16.3% 46.9%` (Cool gray)
**Dark Mode:** `215.3 25% 56.9%` (Lighter cool gray)

```tsx
setPrimaryColor('slate');
```

**Use Cases:**
- Minimalist interfaces
- Professional dashboards
- Content-focused apps

#### Gray
True neutral gray without color bias. Balanced and versatile.

**Light Mode:** `220 8.9% 46.1%` (Neutral gray)
**Dark Mode:** `220 13% 69%` (Light gray)

```tsx
setPrimaryColor('gray');
```

**Use Cases:**
- Neutral, unbiased interfaces
- Reading applications
- Documentation sites

#### Zinc
Modern gray with slight warmth. Contemporary and sophisticated.

**Light Mode:** `240 3.8% 46.1%` (Warm gray)
**Dark Mode:** `240 5% 65%` (Lighter warm gray)

```tsx
setPrimaryColor('zinc');
```

**Use Cases:**
- Modern web apps
- Portfolio sites
- Premium products

#### Neutral
Pure grayscale without any color tint. Clean and simple.

**Light Mode:** `0 0% 45.1%` (True gray)
**Dark Mode:** `0 0% 65%` (Light true gray)

```tsx
setPrimaryColor('neutral');
```

**Use Cases:**
- Monochrome designs
- Accessibility-first apps
- Classic interfaces

#### Stone
Warm beige-gray inspired by natural materials. Comfortable and inviting.

**Light Mode:** `25 5.3% 44.7%` (Beige-gray)
**Dark Mode:** `33.3 5.5% 63.9%` (Light beige-gray)

```tsx
setPrimaryColor('stone');
```

**Use Cases:**
- Warm, welcoming interfaces
- Lifestyle applications
- Content platforms

---

### Warm Palettes

#### Red
Bold, energetic, and attention-grabbing. Use with caution.

**Light Mode:** `0 72.2% 50.6%` (Vibrant red)
**Dark Mode:** `0 72.2% 60.6%` (Lighter red)

```tsx
setPrimaryColor('red');
```

**Use Cases:**
- High-energy brands
- Alert systems (use sparingly)
- Entertainment apps

**Accessibility Note:** Ensure sufficient contrast for text readability.

#### Orange
Vibrant, warm, and enthusiastic. Energizing and friendly.

**Light Mode:** `24.6 95% 53.1%` (Bright orange)
**Dark Mode:** `20.5 90.2% 58.2%` (Lighter orange)

```tsx
setPrimaryColor('orange');
```

**Use Cases:**
- Creative applications
- Food and lifestyle brands
- Call-to-action buttons

#### Amber
Golden and inviting. Warm without being overwhelming.

**Light Mode:** `37.7 92.1% 50.2%` (Golden amber)
**Dark Mode:** `32.1 94.6% 58%` (Light amber)

```tsx
setPrimaryColor('amber');
```

**Use Cases:**
- Warm, welcoming interfaces
- Premium products
- Autumn-themed designs

#### Yellow
Bright, cheerful, and optimistic. Use for positive interactions.

**Light Mode:** `45 93.4% 47.5%` (Bright yellow)
**Dark Mode:** `47.9 95.8% 58.1%` (Lighter yellow)

```tsx
setPrimaryColor('yellow');
```

**Use Cases:**
- Playful interfaces
- Educational apps
- Highlight and focus elements

**Accessibility Note:** Requires careful contrast management for text.

---

### Cool Palettes

#### Lime
Fresh, lively, and vibrant. Energetic green-yellow.

**Light Mode:** `84 81% 44.3%` (Bright lime)
**Dark Mode:** `82.7 85% 55.1%` (Lighter lime)

```tsx
setPrimaryColor('lime');
```

**Use Cases:**
- Eco-friendly brands
- Health and fitness apps
- Fresh, modern interfaces

#### Green
Natural, balanced, and positive. Universal symbol of success.

**Light Mode:** `142.1 70.6% 45.3%` (Medium green)
**Dark Mode:** `142.1 76.2% 56.2%` (Lighter green)

```tsx
setPrimaryColor('green');
```

**Use Cases:**
- Environmental apps
- Success states
- Growth and finance

#### Emerald
Rich, sophisticated green. Luxurious and elegant.

**Light Mode:** `160.1 84.1% 39.4%` (Deep emerald)
**Dark Mode:** `160.1 84.1% 49.4%` (Lighter emerald)

```tsx
setPrimaryColor('emerald');
```

**Use Cases:**
- Premium products
- Financial applications
- Sophisticated interfaces

#### Teal
Calm, professional, and trustworthy. Balanced blue-green.

**Light Mode:** `173.4 80.4% 40%` (Deep teal)
**Dark Mode:** `172.5 66% 50.4%` (Lighter teal)

```tsx
setPrimaryColor('teal');
```

**Use Cases:**
- Healthcare applications
- Professional tools
- Communication platforms

#### Cyan
Cool, modern, and refreshing. Light blue-green.

**Light Mode:** `188.7 85.7% 53.3%` (Bright cyan)
**Dark Mode:** `187.2 85.7% 53.3%` (Same in dark mode)

```tsx
setPrimaryColor('cyan');
```

**Use Cases:**
- Tech products
- Modern interfaces
- Water and ocean themes

#### Sky
Light, airy, and open. Soft blue.

**Light Mode:** `199.3 89.1% 48.2%` (Sky blue)
**Dark Mode:** `198.6 88.7% 58.4%` (Lighter sky blue)

```tsx
setPrimaryColor('sky');
```

**Use Cases:**
- Cloud services
- Weather applications
- Calm, open interfaces

---

### Violet/Purple Palettes

#### Indigo
Deep, elegant, and professional. Rich blue-purple.

**Light Mode:** `238.7 83.5% 66.7%` (Bright indigo)
**Dark Mode:** `239.4 84.1% 76.7%` (Lighter indigo)

```tsx
setPrimaryColor('indigo');
```

**Use Cases:**
- Creative tools
- Premium brands
- Night-themed interfaces

#### Violet
Creative, unique, and sophisticated. True violet.

**Light Mode:** `262.1 83.3% 57.8%` (Medium violet)
**Dark Mode:** `262.1 83.3% 67.8%` (Lighter violet)

```tsx
setPrimaryColor('violet');
```

**Use Cases:**
- Creative applications
- Music and art platforms
- Unique brand identities

#### Purple
Royal, luxurious, and imaginative. Classic purple.

**Light Mode:** `258.3 89.5% 58.4%` (Vibrant purple)
**Dark Mode:** `258.3 89.5% 68.4%` (Lighter purple)

```tsx
setPrimaryColor('purple');
```

**Use Cases:**
- Luxury brands
- Gaming platforms
- Creative tools

#### Fuchsia
Bold, playful, and energetic. Bright pink-purple.

**Light Mode:** `292.2 84.1% 60.6%` (Vibrant fuchsia)
**Dark Mode:** `292.2 84.1% 70.6%` (Lighter fuchsia)

```tsx
setPrimaryColor('fuchsia');
```

**Use Cases:**
- Bold, modern brands
- Fashion and lifestyle
- Attention-grabbing elements

---

### Pink/Rose Palettes

#### Pink
Soft, friendly, and approachable. Warm pink.

**Light Mode:** `330.4 81.2% 60.4%` (Medium pink)
**Dark Mode:** `330.4 81.2% 70.4%` (Lighter pink)

```tsx
setPrimaryColor('pink');
```

**Use Cases:**
- Social applications
- Beauty and wellness
- Friendly, approachable brands

#### Rose
Romantic, warm, and elegant. Sophisticated pink-red.

**Light Mode:** `346.8 77.2% 49.8%` (Deep rose)
**Dark Mode:** `346.8 77.2% 59.8%` (Lighter rose)

```tsx
setPrimaryColor('rose');
```

**Use Cases:**
- Romantic themes
- Lifestyle brands
- Elegant interfaces

---

## Semantic Color Roles

Beyond the customizable primary color, the system uses semantic color roles:

### Background Colors

```tsx
// Page background
<div className="bg-background" />
// HSL: 0 0% 98% (light) | 222.2 84% 4.9% (dark)

// Card backgrounds
<div className="bg-card" />
// HSL: 0 0% 100% (light) | 222.2 47% 11% (dark)

// Popover backgrounds
<div className="bg-popover" />
// HSL: 0 0% 100% (light) | 222.2 47% 11% (dark)
```

### Foreground Colors

```tsx
// Main text
<p className="text-foreground" />
// HSL: 222.2 84% 4.9% (light) | 210 40% 98% (dark)

// Card text
<p className="text-card-foreground" />
// HSL: 222.2 84% 4.9% (light) | 210 40% 98% (dark)

// Muted text (descriptions, secondary info)
<p className="text-muted-foreground" />
// HSL: 215.4 16.3% 46.9% (light) | 215 20.2% 65.1% (dark)
```

### Interactive Colors

```tsx
// Primary actions (user-customizable)
<Button className="bg-primary text-primary-foreground">
  Primary Action
</Button>

// Secondary actions
<Button className="bg-secondary text-secondary-foreground">
  Secondary Action
</Button>

// Destructive actions
<Button className="bg-destructive text-destructive-foreground">
  Delete
</Button>

// Accent/hover states
<div className="hover:bg-accent hover:text-accent-foreground" />
```

### Border and Input Colors

```tsx
// Borders
<div className="border border-border" />
// HSL: 214.3 31.8% 91.4% (light) | 217.2 32.6% 17.5% (dark)

// Input borders
<input className="border-input" />
// HSL: 214.3 31.8% 91.4% (light) | 217.2 32.6% 17.5% (dark)

// Focus rings
<button className="focus-visible:ring-2 ring-ring" />
// HSL: Matches primary color
```

## Color Usage Guidelines

### Contrast Requirements (WCAG 2.1 AA)

All colors meet accessibility standards:

**Normal Text (< 18pt):**
- Minimum 4.5:1 contrast ratio
- Example: text-foreground on bg-background

**Large Text (>= 18pt or bold 14pt):**
- Minimum 3:1 contrast ratio
- Example: text-muted-foreground on bg-background

**UI Components:**
- Minimum 3:1 contrast ratio
- Example: border-border on bg-background

### Color Opacity Modifiers

Use Tailwind's opacity utilities for variations:

```tsx
// Background with opacity
<div className="bg-primary/10" />  // 10% opacity
<div className="bg-primary/20" />  // 20% opacity
<div className="bg-primary/50" />  // 50% opacity

// Text with opacity
<p className="text-foreground/70" />  // 70% opacity for subtle text

// Borders with opacity
<div className="border border-primary/30" />  // 30% opacity border
```

### Gradient Usage

Create gradients using primary and related colors:

```tsx
// Primary gradient
<div className="bg-gradient-to-r from-primary to-primary/80" />

// Multicolor gradient (use sparingly)
<div className="bg-gradient-to-r from-blue-500 to-purple-500" />
```

## Testing Colors

### Preview All Palettes

```tsx
import { colorPalette, type PrimaryColor } from '@/store/theme';

function ColorPreview() {
  return (
    <div className="grid grid-cols-3 gap-4">
      {Object.entries(colorPalette).map(([name, values]) => (
        <div key={name} className="space-y-2">
          <p className="font-medium">{values.label}</p>
          <div
            className="h-20 rounded border"
            style={{
              backgroundColor: `hsl(${values.light})`
            }}
          >
            Light
          </div>
          <div
            className="h-20 rounded border"
            style={{
              backgroundColor: `hsl(${values.dark})`
            }}
          >
            Dark
          </div>
        </div>
      ))}
    </div>
  );
}
```

### Test Contrast

```tsx
// Good: High contrast
<div className="bg-background text-foreground">
  Readable text
</div>

// Bad: Low contrast
<div className="bg-muted text-muted-foreground">
  Hard to read
</div>

// Good: Correct pairing
<Button className="bg-primary text-primary-foreground">
  Click Me
</Button>
```

## Best Practices

### 1. Use Semantic Tokens

```tsx
// Good: Semantic, theme-aware
<Card className="bg-card border-border" />

// Bad: Hard-coded colors
<Card className="bg-white border-gray-200" />
```

### 2. Limit Primary Color Usage

Use primary color strategically for emphasis:

```tsx
// Good: Primary for important actions
<Button variant="default">Save</Button>  {/* Uses primary */}
<Button variant="outline">Cancel</Button>  {/* Uses secondary */}

// Bad: Primary everywhere
<div className="bg-primary">
  <h1 className="text-primary">Title</h1>
  <p className="text-primary">Description</p>
</div>
```

### 3. Maintain Consistency

Keep color usage consistent across the app:

```tsx
// Good: Consistent error color
<Alert variant="destructive">Error message</Alert>
<Button variant="destructive">Delete</Button>

// Bad: Mixed error colors
<Alert className="bg-red-500">Error</Alert>
<Button className="bg-rose-600">Delete</Button>
```

### 4. Test in Both Themes

Always verify colors work in light and dark modes:

```bash
# During development, toggle themes frequently
# Use browser DevTools to simulate dark mode
```

## Color Picker Component

Use the built-in PrimaryColorPicker for user customization:

```tsx
import { PrimaryColorPicker } from '@/components/theme/PrimaryColorPicker';

function Settings() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Customize Theme</h2>
      <div className="flex items-center gap-4">
        <span>Primary Color:</span>
        <PrimaryColorPicker />
      </div>
    </div>
  );
}
```

---

Next: [Typography](./typography.md) - Font system and text styles
