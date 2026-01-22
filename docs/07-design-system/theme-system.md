# Theme System

The Flashpoint Web theme system provides flexible, user-customizable theming with light/dark modes and 22 color palette options. The system uses CSS custom properties for dynamic theme switching and Zustand for state management.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Theme System                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  User Preferences → Zustand Store → CSS Variables → UI      │
│                          ↓                                   │
│                    localStorage                              │
│                          ↓                                   │
│                    Backend Sync                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Theme Modes

The system supports three theme modes:

### 1. Light Mode
Clean, bright interface optimized for daylight viewing.

```tsx
import { useThemeStore } from '@/store/theme';

function Example() {
  const { setMode } = useThemeStore();

  return <button onClick={() => setMode('light')}>Light Mode</button>;
}
```

**Color Characteristics:**
- High contrast backgrounds (98% lightness)
- Dark text on light backgrounds
- Subtle shadows for depth
- Vibrant primary colors

### 2. Dark Mode
Eye-friendly interface for low-light environments.

```tsx
import { useThemeStore } from '@/store/theme';

function Example() {
  const { setMode } = useThemeStore();

  return <button onClick={() => setMode('dark')}>Dark Mode</button>;
}
```

**Color Characteristics:**
- Deep backgrounds (4.9% lightness)
- Light text on dark backgrounds
- Reduced brightness for comfort
- Slightly muted primary colors

### 3. System Mode (Auto)
Automatically matches user's operating system preference.

```tsx
import { useThemeStore } from '@/store/theme';

function Example() {
  const { setMode } = useThemeStore();

  return <button onClick={() => setMode('system')}>Auto Theme</button>;
}
```

**How It Works:**
- Listens to `prefers-color-scheme` media query
- Updates theme when system preference changes
- No manual switching required
- Respects user's OS-level dark mode schedule

## Primary Color Customization

Users can choose from 22 color palettes to personalize the interface.

### Available Colors

**Neutral Colors (5):**
- Slate - Cool gray with blue undertones
- Gray - True neutral gray
- Zinc - Modern, slightly warm gray
- Neutral - Pure grayscale
- Stone - Warm beige-gray

**Chromatic Colors (17):**
- Red - Bold and energetic
- Orange - Vibrant and warm
- Amber - Golden and inviting
- Yellow - Bright and cheerful
- Lime - Fresh and lively
- Green - Natural and balanced
- Emerald - Rich and sophisticated
- Teal - Calm and professional
- Cyan - Cool and modern
- Sky - Light and airy
- Blue - Classic and trustworthy (default)
- Indigo - Deep and elegant
- Violet - Creative and unique
- Purple - Royal and luxurious
- Fuchsia - Bold and playful
- Pink - Soft and friendly
- Rose - Romantic and warm

### Usage Example

```tsx
import { useThemeStore, type PrimaryColor } from '@/store/theme';

function ColorPicker() {
  const { primaryColor, setPrimaryColor } = useThemeStore();

  const colors: PrimaryColor[] = ['blue', 'purple', 'green', 'red'];

  return (
    <div className="flex gap-2">
      {colors.map(color => (
        <button
          key={color}
          onClick={() => setPrimaryColor(color)}
          className={primaryColor === color ? 'ring-2' : ''}
        >
          {color}
        </button>
      ))}
    </div>
  );
}
```

## CSS Custom Properties

All theme values are stored as CSS custom properties (CSS variables) for dynamic updates.

### Root Variables (Light Mode)

```css
:root {
  --background: 0 0% 98%;              /* Page background */
  --foreground: 222.2 84% 4.9%;        /* Main text */
  --card: 0 0% 100%;                   /* Card backgrounds */
  --card-foreground: 222.2 84% 4.9%;   /* Card text */
  --popover: 0 0% 100%;                /* Popover backgrounds */
  --popover-foreground: 222.2 84% 4.9%; /* Popover text */
  --primary: 221.2 83.2% 53.3%;        /* Brand color (blue default) */
  --primary-foreground: 210 40% 98%;   /* Text on primary */
  --secondary: 210 40% 96.1%;          /* Secondary elements */
  --secondary-foreground: 222.2 47.4% 11.2%; /* Text on secondary */
  --muted: 210 40% 96.1%;              /* Muted backgrounds */
  --muted-foreground: 215.4 16.3% 46.9%; /* Muted text */
  --accent: 210 40% 96.1%;             /* Accent backgrounds */
  --accent-foreground: 222.2 47.4% 11.2%; /* Text on accent */
  --destructive: 0 84.2% 60.2%;        /* Error/danger color */
  --destructive-foreground: 210 40% 98%; /* Text on destructive */
  --border: 214.3 31.8% 91.4%;         /* Border color */
  --input: 214.3 31.8% 91.4%;          /* Input border */
  --ring: 221.2 83.2% 53.3%;           /* Focus ring color */
  --radius: 0.5rem;                    /* Border radius */
}
```

### Dark Mode Variables

```css
.dark {
  --background: 222.2 84% 4.9%;        /* Dark background */
  --foreground: 210 40% 98%;           /* Light text */
  --card: 222.2 47% 11%;               /* Card backgrounds */
  --card-foreground: 210 40% 98%;      /* Card text */
  --popover: 222.2 47% 11%;            /* Popover backgrounds */
  --popover-foreground: 210 40% 98%;   /* Popover text */
  --primary: 217.2 91.2% 59.8%;        /* Lighter brand color */
  --primary-foreground: 222.2 47.4% 11.2%; /* Dark text on primary */
  --secondary: 217.2 32.6% 17.5%;      /* Darker secondary */
  --secondary-foreground: 210 40% 98%; /* Light text */
  --muted: 217.2 32.6% 17.5%;          /* Muted backgrounds */
  --muted-foreground: 215 20.2% 65.1%; /* Muted text */
  --accent: 217.2 32.6% 17.5%;         /* Accent backgrounds */
  --accent-foreground: 210 40% 98%;    /* Text on accent */
  --destructive: 0 62.8% 30.6%;        /* Darker destructive */
  --destructive-foreground: 210 40% 98%; /* Light text */
  --border: 217.2 32.6% 17.5%;         /* Subtle borders */
  --input: 217.2 32.6% 17.5%;          /* Input borders */
  --ring: 224.3 76.3% 48%;             /* Focus ring */
}
```

### Using CSS Variables in Components

```tsx
// Tailwind classes automatically use CSS variables
<div className="bg-background text-foreground border-border" />

// Compiles to:
<div className="bg-[hsl(var(--background))] text-[hsl(var(--foreground))] border-[hsl(var(--border))]" />

// Direct CSS usage
<div style={{ backgroundColor: 'hsl(var(--primary))' }} />
```

## State Management (Zustand)

The theme system uses Zustand for state management with localStorage persistence.

### Theme Store Structure

```tsx
interface ThemeState {
  mode: ThemeMode;                          // 'light' | 'dark' | 'system'
  primaryColor: PrimaryColor;               // Selected color palette
  isLoading: boolean;                       // Server sync loading state
  setMode: (mode: ThemeMode) => void;       // Update theme mode
  setPrimaryColor: (color: PrimaryColor) => void; // Update color
  loadThemeFromServer: () => Promise<void>; // Load user preferences
  syncThemeToServer: () => Promise<void>;   // Save to server
}
```

### Complete Usage Example

```tsx
import { useThemeStore } from '@/store/theme';

function ThemeSettings() {
  const {
    mode,
    setMode,
    primaryColor,
    setPrimaryColor,
    isLoading
  } = useThemeStore();

  return (
    <div>
      <h2>Theme Mode</h2>
      <select value={mode} onChange={(e) => setMode(e.target.value)}>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="system">System</option>
      </select>

      <h2>Primary Color</h2>
      <select
        value={primaryColor}
        onChange={(e) => setPrimaryColor(e.target.value)}
      >
        <option value="blue">Blue</option>
        <option value="purple">Purple</option>
        <option value="green">Green</option>
        {/* ... more colors */}
      </select>

      {isLoading && <p>Syncing preferences...</p>}
    </div>
  );
}
```

## Theme Persistence

The theme system persists user preferences in three layers:

### 1. LocalStorage (Client-Side)

```typescript
// Automatically persisted via Zustand middleware
{
  name: 'flashpoint-theme-settings',
  partialize: (state) => ({
    mode: state.mode,
    primaryColor: state.primaryColor
  })
}
```

**Storage Key:** `flashpoint-theme-settings`

**Storage Format:**
```json
{
  "state": {
    "mode": "dark",
    "primaryColor": "purple"
  },
  "version": 0
}
```

### 2. Server Sync (Backend)

Authenticated users sync preferences to the backend database.

```typescript
// Automatic sync on changes
await usersApi.updateThemeSettings(mode, primaryColor);

// Load on app start
const settings = await usersApi.getThemeSettings();
```

**Backend Endpoint:**
- `GET /api/users/me/theme` - Fetch theme settings
- `PUT /api/users/me/theme` - Update theme settings

**Database Storage:**
```sql
CREATE TABLE user_settings (
  user_id INTEGER PRIMARY KEY,
  theme_mode TEXT DEFAULT 'dark',
  theme_color TEXT DEFAULT 'blue',
  -- other settings...
);
```

### 3. Rehydration Flow

```
1. App loads → Read from localStorage
2. Apply theme immediately (no flash)
3. If authenticated → Fetch from server
4. Merge server preferences → Apply updates
5. User changes setting → Update all three layers
```

## Theme Components

### ThemePicker Component

Pre-built component for theme mode selection.

```tsx
import { ThemePicker } from '@/components/theme/ThemePicker';

function Header() {
  return (
    <header>
      <nav>
        {/* ... other nav items */}
        <ThemePicker />
      </nav>
    </header>
  );
}
```

**Features:**
- Dropdown menu with three options
- Icon changes based on current mode (Sun/Moon/Monitor)
- Keyboard accessible
- ARIA labels for screen readers

### PrimaryColorPicker Component

Pre-built component for color palette selection.

```tsx
import { PrimaryColorPicker } from '@/components/theme/PrimaryColorPicker';

function Settings() {
  return (
    <div>
      <h2>Customize Colors</h2>
      <PrimaryColorPicker />
    </div>
  );
}
```

**Features:**
- Visual color swatches with labels
- Grouped by category (Neutral/Colors)
- Checkmark on selected color
- Scrollable dropdown for all 22 options
- Live preview of colors

## Dynamic Theme Updates

The system applies theme changes instantly without page reload.

### Update Flow

```typescript
// 1. User selects new theme mode
setMode('dark');

// 2. Store updates
set({ mode: 'dark' });

// 3. Apply to DOM
document.documentElement.classList.remove('light');
document.documentElement.classList.add('dark');

// 4. Reapply primary color for new mode
applyPrimaryColor(get().primaryColor, 'dark');

// 5. Sync to server (async, non-blocking)
syncThemeToServer();
```

### Primary Color Application

```typescript
// Update CSS custom property dynamically
const colorValue = colorPalette[color][theme]; // e.g., '217.2 91.2% 59.8%'
document.documentElement.style.setProperty('--primary', colorValue);
document.documentElement.style.setProperty('--ring', colorValue);
```

## System Theme Detection

The system listens to OS-level theme changes when in "system" mode.

```typescript
// Media query listener
window.matchMedia('(prefers-color-scheme: dark)')
  .addEventListener('change', (e) => {
    const state = useThemeStore.getState();
    if (state.mode === 'system') {
      // Reapply theme based on new system preference
      applyTheme('system');
      applyPrimaryColor(state.primaryColor, 'system');
    }
  });
```

**Supported Scenarios:**
- Windows dark mode toggle
- macOS dark mode schedule
- Linux desktop environment themes
- Browser dark mode preferences

## Accessibility Considerations

### Focus Rings
Focus rings use the primary color for brand consistency.

```css
:focus-visible {
  outline: none;
  ring: 2px;
  ring-color: hsl(var(--ring));
  ring-offset: 2px;
  ring-offset-color: hsl(var(--background));
}
```

### Color Contrast
All color palettes meet WCAG 2.1 AA standards:
- Normal text: 4.5:1 contrast ratio
- Large text: 3:1 contrast ratio
- Interactive elements: 3:1 contrast ratio

### Reduced Motion
Respects `prefers-reduced-motion` for animations.

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Best Practices

### 1. Always Use Semantic Color Tokens

```tsx
// Good: Semantic tokens adapt to theme
<div className="bg-background text-foreground" />

// Bad: Hard-coded colors break theming
<div className="bg-white text-black" />
```

### 2. Test Both Themes

Always preview components in both light and dark modes:

```tsx
// During development
const { setMode } = useThemeStore();

// Toggle for testing
<button onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}>
  Toggle Theme
</button>
```

### 3. Respect User Preferences

Don't force a theme mode. Let users choose or use system preference.

```tsx
// Good: Respects user choice
const { mode } = useThemeStore();

// Bad: Forcing dark mode
document.documentElement.classList.add('dark');
```

### 4. Avoid Theme-Specific Logic

Design components to work in any theme without conditional rendering.

```tsx
// Good: Works in any theme
<Card className="bg-card text-card-foreground">
  Content
</Card>

// Bad: Theme-specific components
{mode === 'dark' ? <DarkCard /> : <LightCard />}
```

## Troubleshooting

### Theme Not Applying

**Symptoms:** Theme changes don't affect UI

**Solutions:**
1. Check that `dark` class is on `<html>` element
2. Verify CSS variables are defined in `index.css`
3. Ensure Tailwind's `darkMode: ["class"]` is configured
4. Clear localStorage and refresh

### Colors Look Wrong

**Symptoms:** Colors don't match expectations

**Solutions:**
1. Verify HSL values in `colorPalette`
2. Check that primary color is applied to `--primary` variable
3. Test in both light and dark modes
4. Ensure no CSS conflicts overriding variables

### System Mode Not Working

**Symptoms:** Auto theme doesn't follow OS preference

**Solutions:**
1. Check browser support for `prefers-color-scheme`
2. Verify media query listener is attached
3. Test by changing OS dark mode setting
4. Check browser's own dark mode isn't overriding

---

Next: [Color Palette](./color-palette.md) - Detailed color definitions and usage
