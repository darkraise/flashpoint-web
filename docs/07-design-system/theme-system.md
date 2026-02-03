# Theme System

Dynamic theme system with light/dark modes and 22 customizable color palettes. Uses CSS variables for instant theme switching with Zustand state management.

## Architecture

```
User Preferences → Zustand Store → CSS Variables → UI
       ↓
   localStorage
       ↓
  Backend Sync
```

## Theme Modes

### Light Mode
Clean, bright interface for daylight viewing.

```tsx
import { useThemeStore } from '@/store/theme';

const { setMode } = useThemeStore();
setMode('light');
```

**Characteristics:**
- Light backgrounds (98% lightness)
- Dark text on light backgrounds
- Subtle shadows
- Vibrant primary colors

### Dark Mode
Eye-friendly interface for low-light viewing.

```tsx
setMode('dark');
```

**Characteristics:**
- Deep backgrounds (4.9% lightness)
- Light text on dark
- Reduced brightness
- Slightly muted primary colors

### System Mode (Auto)
Automatically matches OS preference.

```tsx
setMode('system');
```

Listens to `prefers-color-scheme` media query and updates when system preference changes.

## Primary Color Customization

22 color palettes available:

```tsx
import { useThemeStore } from '@/store/theme';

const { primaryColor, setPrimaryColor } = useThemeStore();

setPrimaryColor('purple');
setPrimaryColor('green');
setPrimaryColor('rose');
```

**Available Colors:**
Neutral: Slate, Gray, Zinc, Neutral, Stone
Warm: Red, Orange, Amber, Yellow
Cool: Lime, Green, Emerald, Teal, Cyan, Sky, Blue
Purple: Indigo, Violet, Purple, Fuchsia
Pink: Pink, Rose

## CSS Variables

All theme values use CSS custom properties for dynamic updates.

### Light Mode Root

```css
:root {
  --background: 0 0% 98%;
  --foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;        /* Blue default */
  --secondary: 210 40% 96.1%;
  --destructive: 0 84.2% 60.2%;
  --muted: 210 40% 96.1%;
  --accent: 210 40% 96.1%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 221.2 83.2% 53.3%;
}
```

### Dark Mode

```css
.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --primary: 217.2 91.2% 59.8%;        /* Lighter blue */
  --secondary: 217.2 32.6% 17.5%;
  --destructive: 0 62.8% 30.6%;
  --border: 217.2 32.6% 17.5%;
}
```

### Usage

```tsx
// Tailwind automatically uses CSS variables
<div className="bg-background text-foreground border-border" />

// With opacity
<div className="bg-primary/20" />
<div className="text-foreground/70" />
```

## State Management

Theme store using Zustand with localStorage persistence:

```tsx
interface ThemeState {
  mode: 'light' | 'dark' | 'system';
  primaryColor: PrimaryColor;
  isLoading: boolean;
  setMode: (mode: ThemeMode) => void;
  setPrimaryColor: (color: PrimaryColor) => void;
  loadThemeFromServer: () => Promise<void>;
  syncThemeToServer: () => Promise<void>;
}
```

### Complete Usage

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
      <select value={mode} onChange={(e) => setMode(e.target.value)}>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="system">System</option>
      </select>

      <select value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)}>
        <option value="blue">Blue</option>
        <option value="purple">Purple</option>
        <option value="green">Green</option>
      </select>

      {isLoading && <p>Syncing...</p>}
    </div>
  );
}
```

## Theme Components

### ThemePicker

Dropdown for theme mode selection:

```tsx
import { ThemePicker } from '@/components/theme/ThemePicker';

function Header() {
  return (
    <header>
      <nav>
        {/* ... nav items ... */}
        <ThemePicker />
      </nav>
    </header>
  );
}
```

**Features:**
- 3 options (Light, Dark, System)
- Icon changes based on current mode
- Keyboard accessible
- ARIA labels

### PrimaryColorPicker

Color palette selector:

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
- Visual color swatches
- Grouped by category
- Live preview
- Scrollable for all 22 colors

## Theme Persistence

Three-layer persistence system:

### 1. LocalStorage (Client)

Automatically persisted via Zustand:

```json
{
  "state": {
    "mode": "dark",
    "primaryColor": "purple"
  },
  "version": 0
}
```

Storage key: `flashpoint-theme-settings`

### 2. Server Sync

Authenticated users sync to backend:

```typescript
await usersApi.updateThemeSettings(mode, primaryColor);
const settings = await usersApi.getThemeSettings();
```

Endpoints:
- `GET /api/users/me/theme` - Fetch
- `PUT /api/users/me/theme` - Update

### 3. Rehydration Flow

1. App loads → Read localStorage
2. Apply theme immediately (no flash)
3. If authenticated → Fetch from server
4. Merge server preferences
5. User changes → Update all layers

## Dynamic Theme Updates

Theme changes apply instantly without page reload:

```typescript
// 1. User selects new theme
setMode('dark');

// 2. Store updates
set({ mode: 'dark' });

// 3. Apply to DOM
document.documentElement.classList.remove('light');
document.documentElement.classList.add('dark');

// 4. Sync to server (non-blocking)
syncThemeToServer();
```

### Primary Color Application

```typescript
// Update CSS variable dynamically
const colorValue = colorPalette[color][theme];
document.documentElement.style.setProperty('--primary', colorValue);
document.documentElement.style.setProperty('--ring', colorValue);
```

## System Theme Detection

Listens to OS-level theme changes in "system" mode:

```typescript
window.matchMedia('(prefers-color-scheme: dark)')
  .addEventListener('change', (e) => {
    const state = useThemeStore.getState();
    if (state.mode === 'system') {
      applyTheme('system');
      applyPrimaryColor(state.primaryColor, 'system');
    }
  });
```

Supports:
- Windows dark mode toggle
- macOS dark mode schedule
- Linux desktop themes
- Browser preferences

## Accessibility

### Focus Rings

Focus rings use primary color for consistency:

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

All palettes meet WCAG 2.1 AA:
- Normal text: 4.5:1 ratio
- Large text: 3:1 ratio
- Interactive: 3:1 ratio

### Reduced Motion

Respects `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Best Practices

### 1. Use Semantic Tokens

```tsx
// Good: Adapts to theme
<div className="bg-background text-foreground" />

// Bad: Breaks theming
<div className="bg-white text-black" />
```

### 2. Test Both Themes

Toggle themes frequently during development:

```tsx
const { setMode } = useThemeStore();

<button onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}>
  Toggle Theme
</button>
```

### 3. Respect User Preferences

Never force a theme. Let users choose or use system preference.

```tsx
// Good: Let user choose
const { mode } = useThemeStore();

// Bad: Force theme
document.documentElement.classList.add('dark');
```

### 4. Avoid Theme-Specific Logic

Design components to work in any theme:

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

1. Check `dark` class on `<html>` element
2. Verify CSS variables in `index.css`
3. Ensure Tailwind `darkMode: ["class"]`
4. Clear localStorage and refresh

### Colors Look Wrong

1. Verify HSL values in `colorPalette`
2. Check primary color applied to `--primary`
3. Test in both light and dark modes
4. Check for CSS conflicts

### System Mode Not Working

1. Check browser support for `prefers-color-scheme`
2. Verify media query listener is attached
3. Test by changing OS setting
4. Check browser's own dark mode setting

---

Next: [Color Palette](./color-palette.md) - Detailed color definitions
