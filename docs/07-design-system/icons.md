# Icons

Flashpoint Web uses Lucide React v0.358.0, a beautiful icon library with 358+ carefully crafted icons. All icons are SVG-based, fully customizable, and tree-shakeable for optimal bundle sizes.

## Installation

Lucide React is already installed in the project:

```bash
npm install lucide-react@^0.358.0
```

## Basic Usage

Import icons individually for tree-shaking benefits:

```tsx
import { Heart, Star, Search, Settings } from 'lucide-react';

function Example() {
  return (
    <div>
      <Heart className="h-5 w-5" />
      <Star className="h-5 w-5" />
      <Search className="h-5 w-5" />
      <Settings className="h-5 w-5" />
    </div>
  );
}
```

## Icon Sizing

Use Tailwind's sizing utilities for consistent icon sizes:

```tsx
// Extra small (16px)
<Icon className="h-4 w-4" />

// Small (20px) - Most common
<Icon className="h-5 w-5" />

// Medium (24px)
<Icon className="h-6 w-6" />

// Large (32px)
<Icon className="h-8 w-8" />

// Extra large (48px)
<Icon className="h-12 w-12" />
```

**Recommended Sizes:**
- Buttons: `h-4 w-4` or `h-5 w-5`
- Navigation: `h-5 w-5` or `h-6 w-6`
- Hero sections: `h-8 w-8` or larger
- Tiny indicators: `h-3 w-3`

## Icon Colors

Icons inherit text color by default:

```tsx
// Inherit text color (recommended)
<Heart className="h-5 w-5" />

// Semantic colors
<Heart className="h-5 w-5 text-primary" />
<AlertCircle className="h-5 w-5 text-destructive" />
<CheckCircle className="h-5 w-5 text-green-500" />
<Info className="h-5 w-5 text-muted-foreground" />

// Custom colors
<Star className="h-5 w-5 text-yellow-500" />
```

## Icon Props

All Lucide icons accept standard SVG props:

```tsx
<Heart
  className="h-5 w-5"
  color="red"
  fill="red"
  strokeWidth={2}
  absoluteStrokeWidth
  size={20}
/>
```

**Common Props:**
- `size` - Number (defaults to 24)
- `color` - String (CSS color)
- `strokeWidth` - Number (defaults to 2)
- `fill` - String (defaults to 'none')
- `absoluteStrokeWidth` - Boolean (maintains stroke width on scaling)

## Common Icon Categories

### User & Account Icons

```tsx
import {
  User,
  UserCircle,
  UserPlus,
  UserMinus,
  Users,
  UserCheck,
  UserX,
  Settings,
  LogIn,
  LogOut,
} from 'lucide-react';

<User className="h-5 w-5" />
<Settings className="h-5 w-5" />
<LogIn className="h-5 w-5" />
<LogOut className="h-5 w-5" />
```

### Navigation Icons

```tsx
import {
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  ArrowRight,
  Home,
  Search,
} from 'lucide-react';

<Menu className="h-6 w-6" />
<ChevronDown className="h-4 w-4" />
<Home className="h-5 w-5" />
<Search className="h-5 w-5" />
```

### Action Icons

```tsx
import {
  Plus,
  Minus,
  Edit,
  Trash,
  Save,
  Download,
  Upload,
  Copy,
  Share,
  MoreVertical,
  MoreHorizontal,
} from 'lucide-react';

<Plus className="h-4 w-4" />
<Edit className="h-4 w-4" />
<Trash className="h-4 w-4" />
<Save className="h-4 w-4" />
```

### Media & Playback Icons

```tsx
import {
  Play,
  Pause,
  Square,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Film,
  Image,
} from 'lucide-react';

<Play className="h-6 w-6" />
<Pause className="h-6 w-6" />
<Volume2 className="h-5 w-5" />
<Maximize className="h-4 w-4" />
```

### File & Folder Icons

```tsx
import {
  File,
  FileText,
  Folder,
  FolderOpen,
  Download,
  Upload,
  Archive,
  Package,
} from 'lucide-react';

<File className="h-5 w-5" />
<Folder className="h-5 w-5" />
<Archive className="h-5 w-5" />
```

### Feedback & Status Icons

```tsx
import {
  Check,
  CheckCircle,
  X,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  HelpCircle,
  Loader,
  Loader2,
} from 'lucide-react';

<CheckCircle className="h-5 w-5 text-green-500" />
<XCircle className="h-5 w-5 text-destructive" />
<AlertCircle className="h-5 w-5 text-yellow-500" />
<Info className="h-5 w-5 text-blue-500" />
```

### Social & Communication Icons

```tsx
import {
  Heart,
  Star,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Mail,
  Bell,
  BellOff,
  Share2,
} from 'lucide-react';

<Heart className="h-5 w-5" />
<Star className="h-5 w-5" />
<Bell className="h-5 w-5" />
<Mail className="h-5 w-5" />
```

### Gaming Icons

```tsx
import {
  Gamepad,
  Gamepad2,
  Joystick,
  Trophy,
  Award,
  Target,
  Zap,
} from 'lucide-react';

<Gamepad2 className="h-6 w-6" />
<Trophy className="h-5 w-5" />
<Award className="h-5 w-5" />
```

### Theme & Display Icons

```tsx
import {
  Sun,
  Moon,
  Monitor,
  Palette,
  Eye,
  EyeOff,
  Layout,
  Grid,
  List,
} from 'lucide-react';

<Sun className="h-5 w-5" />
<Moon className="h-5 w-5" />
<Monitor className="h-5 w-5" />
<Palette className="h-5 w-5" />
```

### Filter & Sort Icons

```tsx
import {
  Filter,
  Search,
  SortAsc,
  SortDesc,
  Calendar,
  Clock,
} from 'lucide-react';

<Filter className="h-4 w-4" />
<Search className="h-4 w-4" />
<SortAsc className="h-4 w-4" />
```

## Icon Usage Patterns

### In Buttons

```tsx
// Icon before text
<Button>
  <Plus className="mr-2 h-4 w-4" />
  Add Game
</Button>

// Icon after text
<Button>
  Next
  <ChevronRight className="ml-2 h-4 w-4" />
</Button>

// Icon only (use size="icon")
<Button size="icon">
  <Settings className="h-4 w-4" />
  <span className="sr-only">Settings</span>
</Button>
```

### In Navigation

```tsx
<nav className="flex items-center gap-4">
  <a href="/" className="flex items-center gap-2">
    <Home className="h-5 w-5" />
    <span>Home</span>
  </a>
  <a href="/browse" className="flex items-center gap-2">
    <Gamepad2 className="h-5 w-5" />
    <span>Browse</span>
  </a>
  <a href="/favorites" className="flex items-center gap-2">
    <Heart className="h-5 w-5" />
    <span>Favorites</span>
  </a>
</nav>
```

### In Lists

```tsx
<ul className="space-y-2">
  <li className="flex items-center gap-2">
    <CheckCircle className="h-4 w-4 text-green-500" />
    <span>Task completed</span>
  </li>
  <li className="flex items-center gap-2">
    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
    <span>Processing...</span>
  </li>
  <li className="flex items-center gap-2">
    <XCircle className="h-4 w-4 text-destructive" />
    <span>Failed</span>
  </li>
</ul>
```

### In Cards

```tsx
<Card>
  <CardHeader>
    <div className="flex items-center justify-between">
      <CardTitle className="flex items-center gap-2">
        <Gamepad2 className="h-5 w-5" />
        Game Title
      </CardTitle>
      <Button size="icon" variant="ghost">
        <Heart className="h-4 w-4" />
      </Button>
    </div>
  </CardHeader>
  <CardContent>
    <div className="flex items-center gap-4 text-sm text-muted-foreground">
      <div className="flex items-center gap-1">
        <Calendar className="h-3 w-3" />
        <span>2010</span>
      </div>
      <div className="flex items-center gap-1">
        <Users className="h-3 w-3" />
        <span>Multiplayer</span>
      </div>
    </div>
  </CardContent>
</Card>
```

### In Alerts

```tsx
<Alert>
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Information</AlertTitle>
  <AlertDescription>Your changes have been saved.</AlertDescription>
</Alert>

<Alert variant="destructive">
  <AlertTriangle className="h-4 w-4" />
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>Something went wrong.</AlertDescription>
</Alert>
```

### With Tooltips

```tsx
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button size="icon" variant="ghost">
        <Info className="h-4 w-4" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>
      <p>Click for more information</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

## Animated Icons

### Spinning Loader

```tsx
import { Loader2 } from 'lucide-react';

<Loader2 className="h-4 w-4 animate-spin" />

// In button
<Button disabled>
  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
  Loading...
</Button>
```

### Rotating Refresh

```tsx
import { RotateCw } from 'lucide-react';

<button className="group">
  <RotateCw className="h-4 w-4 group-hover:rotate-180 transition-transform" />
</button>
```

### Pulsing Notification

```tsx
import { Bell } from 'lucide-react';

<Button size="icon" variant="ghost" className="relative">
  <Bell className="h-5 w-5" />
  <span className="absolute top-1 right-1 h-2 w-2 bg-destructive rounded-full animate-pulse" />
</Button>
```

## Custom Stroke Width

Adjust icon weight for different visual hierarchies:

```tsx
// Thin (delicate)
<Icon strokeWidth={1} className="h-5 w-5" />

// Regular (default)
<Icon strokeWidth={2} className="h-5 w-5" />

// Bold (emphasis)
<Icon strokeWidth={3} className="h-5 w-5" />
```

## Filled Icons

Some icons support filled variants:

```tsx
import { Heart, Star } from 'lucide-react';

// Outline (default)
<Heart className="h-5 w-5" />

// Filled
<Heart className="h-5 w-5 fill-current" />
<Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />

// Conditional fill (favorite toggle)
<Heart className={cn(
  "h-5 w-5",
  isFavorite && "fill-red-500 text-red-500"
)} />
```

## Icon Spacing

Consistent spacing around icons:

```tsx
// Before text
<span className="flex items-center">
  <Icon className="mr-2 h-4 w-4" />
  Text
</span>

// After text
<span className="flex items-center">
  Text
  <Icon className="ml-2 h-4 w-4" />
</span>

// Between elements
<div className="flex items-center gap-2">
  <Icon className="h-4 w-4" />
  <span>Label</span>
  <Icon className="h-4 w-4" />
</div>
```

**Standard Spacing:**
- Small icons (h-4 w-4): `mr-2` or `ml-2` (8px gap)
- Medium icons (h-5 w-5): `mr-2` or `ml-2` (8px gap)
- Large icons (h-6 w-6): `mr-3` or `ml-3` (12px gap)

## Accessibility

Always provide accessible labels for icon-only buttons:

```tsx
// Good: Screen reader text
<Button size="icon">
  <Settings className="h-4 w-4" />
  <span className="sr-only">Settings</span>
</Button>

// Good: aria-label
<button aria-label="Close dialog">
  <X className="h-4 w-4" />
</button>

// Bad: No accessible label
<Button size="icon">
  <Settings className="h-4 w-4" />
</Button>
```

## Full Icon List

Browse all 358 icons at [lucide.dev](https://lucide.dev).

**Common Categories:**
- Arrows (24 icons)
- Communication (18 icons)
- Design (22 icons)
- Devices (14 icons)
- Files (32 icons)
- Finance (12 icons)
- Gaming (8 icons)
- Media (28 icons)
- Navigation (16 icons)
- Notification (8 icons)
- Photography (10 icons)
- Security (14 icons)
- Shopping (12 icons)
- Social (16 icons)
- Text (14 icons)
- Time (10 icons)
- Weather (12 icons)
- ...and many more!

## Best Practices

### 1. Consistent Sizing

Use standard sizes across similar contexts:

```tsx
// Good: Consistent button icons
<Button><Plus className="mr-2 h-4 w-4" />Add</Button>
<Button><Edit className="mr-2 h-4 w-4" />Edit</Button>
<Button><Trash className="mr-2 h-4 w-4" />Delete</Button>

// Bad: Inconsistent sizes
<Button><Plus className="mr-2 h-3 w-3" />Add</Button>
<Button><Edit className="mr-2 h-5 w-5" />Edit</Button>
```

### 2. Semantic Colors

Match icon colors to their meaning:

```tsx
// Good: Semantic colors
<CheckCircle className="h-4 w-4 text-green-500" />
<XCircle className="h-4 w-4 text-destructive" />
<AlertTriangle className="h-4 w-4 text-yellow-500" />

// Bad: Random colors
<CheckCircle className="h-4 w-4 text-purple-500" />
```

### 3. Import Only What You Need

```tsx
// Good: Tree-shakeable imports
import { Heart, Star, Settings } from 'lucide-react';

// Bad: Import all (not supported anyway)
// import * as Icons from 'lucide-react';
```

### 4. Align Icons Properly

```tsx
// Good: Vertically centered
<div className="flex items-center gap-2">
  <Icon className="h-5 w-5" />
  <span>Text</span>
</div>

// Bad: Misaligned
<div className="flex gap-2">
  <Icon className="h-5 w-5" />
  <span>Text</span>
</div>
```

---

Next: [Responsive Design](./responsive-design.md) - Breakpoints and mobile-first patterns
