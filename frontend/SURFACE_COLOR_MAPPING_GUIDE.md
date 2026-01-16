# Surface Color Mapping Guide

This guide shows how to replace hardcoded gray colors with dynamic surface colors that respond to theme changes.

## Color System Overview

### Primary Colors (for accents)
- `bg-primary-*`, `text-primary-*`, `border-primary-*`
- Use for: buttons, links, badges, highlights, active states
- Changes when user selects different primary color in theme picker

### Surface Colors (for neutral backgrounds)
- `bg-background-*`, `bg-surface-*`, `border-*`
- Use for: page backgrounds, sidebars, panels, cards, dividers
- Changes when user selects different surface color in theme picker

---

## Replacement Mapping

### Background Colors

| Old (Hardcoded Gray) | New (Dynamic Surface) | Usage |
|---------------------|----------------------|-------|
| `bg-gray-900` or darker | `bg-background-primary` | Main page background (darkest) |
| `bg-gray-800` | `bg-background-secondary` | Sidebar, main panels, container backgrounds |
| `bg-gray-700` | `bg-background-tertiary` | Cards, form inputs, interactive surfaces |
| `bg-gray-600` or lighter | `bg-background-elevated` | Modals, popovers, tooltips, elevated elements |
| `hover:bg-gray-700` | `hover:bg-background-tertiary` | Hover states for interactive elements |

### Border Colors

| Old (Hardcoded Gray) | New (Dynamic Border) | Usage |
|---------------------|---------------------|-------|
| `border-gray-800` | `border-border` | Dividers, panel borders, card borders |
| `border-gray-700` | `border-border` | Standard borders |
| `border-gray-600` | `border-border-light` | Lighter borders, subtle dividers |
| `border-gray-800/50` | `border-border/50` | Semi-transparent borders (with opacity) |
| `border-gray-700/30` | `border-border-light/30` | Very subtle borders |

---

## Component Examples

### Before (Hardcoded)
```tsx
<div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
  <input className="bg-gray-700 border border-gray-600 text-white" />
  <div className="border-t border-gray-800/50 my-4" />
</div>
```

### After (Dynamic)
```tsx
<div className="bg-background-secondary border border-border rounded-lg p-4">
  <input className="bg-background-tertiary border border-border-light text-white" />
  <div className="border-t border-border/50 my-4" />
</div>
```

---

## Specific Component Patterns

### Sidebar
```tsx
// Old
<aside className="bg-gray-800 border-r border-gray-800/50">

// New
<aside className="bg-background-secondary border-r border-border/50">
```

### Card
```tsx
// Old
<div className="bg-gray-800 border border-gray-700 hover:bg-gray-750">

// New
<div className="bg-background-secondary border border-border hover:bg-background-tertiary">
```

### Form Input
```tsx
// Old
<input className="bg-gray-700 border border-gray-600 focus:border-primary-500" />

// New
<input className="bg-background-tertiary border border-border-light focus:border-primary-500" />
```

### Divider
```tsx
// Old
<div className="border-t border-gray-800/50" />

// New
<div className="border-t border-border/50" />
```

### Table
```tsx
// Old
<table className="bg-gray-800">
  <thead className="bg-gray-700">

// New
<table className="bg-background-secondary">
  <thead className="bg-background-tertiary">
```

### Modal/Dialog
```tsx
// Old
<div className="bg-gray-800 border border-gray-700">

// New
<div className="bg-background-elevated border border-border-light">
```

---

## Search & Replace Guide

To update your codebase systematically:

### Step 1: Background Colors
```bash
# Find all bg-gray-900
grep -r "bg-gray-900" --include="*.tsx" --include="*.jsx" src/

# Find all bg-gray-800
grep -r "bg-gray-800" --include="*.tsx" --include="*.jsx" src/

# Find all bg-gray-700
grep -r "bg-gray-700" --include="*.tsx" --include="*.jsx" src/
```

### Step 2: Border Colors
```bash
# Find all border-gray-800
grep -r "border-gray-800" --include="*.tsx" --include="*.jsx" src/

# Find all border-gray-700
grep -r "border-gray-700" --include="*.tsx" --include="*.jsx" src/

# Find all border-gray-600
grep -r "border-gray-600" --include="*.tsx" --include="*.jsx" src/
```

### Step 3: Update Files
For each component:
1. Open the file
2. Replace according to the mapping table above
3. Test that the component responds to surface color changes

---

## Components That Need Updates (211 instances found)

Based on our search, these components need updating:

### High Priority (Main Structure)
- ✅ **Sidebar** - Already uses `bg-background-tertiary`, but borders need updating
- **ActivityTable** - Multiple bg-gray-800, bg-gray-700 instances
- **LoginForm** - Forms using bg-gray-800, bg-gray-700
- **RegisterForm** - Forms using bg-gray-800, bg-gray-700
- **Badge** - Uses bg-gray-900/50

### Medium Priority (Common Components)
- All card components
- All form input components
- All table components
- All modal/dialog components

### Low Priority (Specific Features)
- Stats components
- Player components
- Settings panels

---

## Testing Checklist

After updating components, test that:

1. ✅ **Surface color changes affect the component**
   - Open theme picker
   - Select different surface colors (slate-900, gray-700, zinc-600)
   - Verify component backgrounds and borders change

2. ✅ **Visual hierarchy is preserved**
   - Darkest elements use `bg-background-primary`
   - Medium elements use `bg-background-secondary`
   - Light elements use `bg-background-tertiary`
   - Elevated elements use `bg-background-elevated`

3. ✅ **Borders are subtle but visible**
   - Dividers should be visible but not too prominent
   - Borders should match the surface color tone

4. ✅ **No hardcoded colors remain**
   - Search for `bg-gray-`, `border-gray-` in the file
   - Ensure all structural backgrounds/borders are dynamic

---

## Available Surface Colors

All surface colors follow Tailwind naming convention with 4 levels:

- `slate-900`, `slate-800`, `slate-700`, `slate-600`, `slate-500`
- `gray-900`, `gray-800`, `gray-700`, `gray-600`, `gray-500`
- `zinc-900`, `zinc-800`, `zinc-700`, `zinc-600`, `zinc-500`
- `neutral-900`, `neutral-800`, `neutral-700`, `neutral-600`, `neutral-500`
- `stone-900`, `stone-800`, `stone-700`, `stone-600`, `stone-500`
- `cyan-800`, `teal-800`

Each provides:
- **dark** - Darkest background
- **DEFAULT** - Medium background
- **hover** - Light background
- **elevated** - Lightest background
- **border** - Default border color
- **borderLight** - Lighter border color
