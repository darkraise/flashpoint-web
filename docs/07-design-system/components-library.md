# Components Library

The Flashpoint Web components library is built on Shadcn UI, a collection of beautifully designed, accessible React components built with Radix UI primitives and styled with Tailwind CSS. All components are fully typed with TypeScript and support light/dark themes.

## Installation Approach

Shadcn UI uses a **copy-paste approach** rather than npm packages. Components are copied directly into your codebase (`components/ui/`) allowing full customization without dependency constraints.

**Benefits:**
- Full control over component code
- No version conflicts
- Easy customization
- Tree-shakeable
- No runtime overhead

---

## Component Categories

- [Form Components](#form-components)
- [Layout Components](#layout-components)
- [Data Display](#data-display)
- [Feedback Components](#feedback-components)
- [Navigation Components](#navigation-components)
- [Overlay Components](#overlay-components)

---

## Form Components

### Button

Versatile button component with 6 variants and 4 sizes.

**Variants:** default, destructive, outline, secondary, ghost, link
**Sizes:** default (h-10), sm (h-9), lg (h-11), icon (h-10 w-10)

```tsx
import { Button } from '@/components/ui/button';

// Variants
<Button>Default</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Outline</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon"><Heart /></Button>

// With icons
<Button>
  <Plus className="mr-2 h-4 w-4" />
  Add Game
</Button>

// As child (polymorphic)
<Button asChild>
  <Link to="/games">Browse Games</Link>
</Button>
```

**Props:**
```typescript
interface ButtonProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  asChild?: boolean;
}
```

---

### Input

Styled text input with full accessibility support.

```tsx
import { Input } from '@/components/ui/input';

// Basic
<Input placeholder="Enter username" />

// With type
<Input type="email" placeholder="you@example.com" />
<Input type="password" placeholder="Password" />
<Input type="number" min={0} max={100} />

// With label
<div className="space-y-2">
  <Label htmlFor="username">Username</Label>
  <Input id="username" placeholder="johndoe" />
</div>

// Disabled
<Input disabled placeholder="Disabled input" />

// With error state
<Input className="border-destructive" placeholder="Invalid input" />
```

**Features:**
- Auto-resizing on mobile (text-base) vs desktop (text-sm)
- Focus ring with primary color
- File input styling
- Disabled state styling

---

### Textarea

Multi-line text input.

```tsx
import { Textarea } from '@/components/ui/textarea';

<Textarea placeholder="Enter description..." />

// With rows
<Textarea rows={5} placeholder="Long description" />

// Disabled
<Textarea disabled />
```

---

### Select

Custom styled dropdown select using Radix UI.

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

<Select>
  <SelectTrigger className="w-48">
    <SelectValue placeholder="Select platform" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="flash">Flash</SelectItem>
    <SelectItem value="html5">HTML5</SelectItem>
    <SelectItem value="shockwave">Shockwave</SelectItem>
  </SelectContent>
</Select>

// Controlled
const [value, setValue] = useState('flash');

<Select value={value} onValueChange={setValue}>
  {/* ... */}
</Select>
```

---

### Checkbox

Accessible checkbox with custom styling.

```tsx
import { Checkbox } from '@/components/ui/checkbox';

<Checkbox id="terms" />

// With label
<div className="flex items-center space-x-2">
  <Checkbox id="terms" />
  <Label htmlFor="terms">Accept terms and conditions</Label>
</div>

// Controlled
const [checked, setChecked] = useState(false);

<Checkbox checked={checked} onCheckedChange={setChecked} />
```

---

### Radio Group

Mutually exclusive options.

```tsx
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

<RadioGroup defaultValue="option1">
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="option1" id="option1" />
    <Label htmlFor="option1">Option 1</Label>
  </div>
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="option2" id="option2" />
    <Label htmlFor="option2">Option 2</Label>
  </div>
</RadioGroup>
```

---

### Switch

Toggle switch for boolean values.

```tsx
import { Switch } from '@/components/ui/switch';

<Switch />

// With label
<div className="flex items-center space-x-2">
  <Switch id="notifications" />
  <Label htmlFor="notifications">Enable notifications</Label>
</div>

// Controlled
const [enabled, setEnabled] = useState(false);

<Switch checked={enabled} onCheckedChange={setEnabled} />
```

---

### Label

Accessible form labels.

```tsx
import { Label } from '@/components/ui/label';

<Label htmlFor="username">Username</Label>
<Input id="username" />

// Required indicator
<Label htmlFor="email">
  Email <span className="text-destructive">*</span>
</Label>
```

---

### Form

Advanced form handling with React Hook Form integration.

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const formSchema = z.object({
  username: z.string().min(3).max(20),
  email: z.string().email(),
});

function MyForm() {
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      email: '',
    },
  });

  const onSubmit = (values) => {
    console.log(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="johndoe" {...field} />
              </FormControl>
              <FormDescription>
                Your public display name.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}
```

---

## Layout Components

### Card

Container component for content grouping.

```tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>Game Title</CardTitle>
    <CardDescription>Released in 2010</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Game description goes here...</p>
  </CardContent>
  <CardFooter className="flex justify-between">
    <Button variant="outline">Cancel</Button>
    <Button>Play Now</Button>
  </CardFooter>
</Card>

// Clickable card
<Card className="cursor-pointer hover:bg-accent transition-colors">
  <CardHeader>
    <CardTitle>Clickable Card</CardTitle>
  </CardHeader>
</Card>
```

**Structure:**
- `Card` - Container with border and shadow
- `CardHeader` - Header section (p-6)
- `CardTitle` - Title text (text-2xl font-semibold)
- `CardDescription` - Subtitle text (text-sm text-muted-foreground)
- `CardContent` - Main content (p-6 pt-0)
- `CardFooter` - Footer section (p-6 pt-0)

---

### Separator

Horizontal or vertical divider.

```tsx
import { Separator } from '@/components/ui/separator';

// Horizontal (default)
<div>
  <p>Section 1</p>
  <Separator className="my-4" />
  <p>Section 2</p>
</div>

// Vertical
<div className="flex h-5 items-center space-x-4">
  <span>Item 1</span>
  <Separator orientation="vertical" />
  <span>Item 2</span>
</div>
```

---

### Scroll Area

Customized scrollable container.

```tsx
import { ScrollArea } from '@/components/ui/scroll-area';

<ScrollArea className="h-72 w-48 rounded-md border">
  <div className="p-4">
    {Array.from({ length: 50 }).map((_, i) => (
      <div key={i} className="text-sm">
        Item {i + 1}
      </div>
    ))}
  </div>
</ScrollArea>

// Horizontal
<ScrollArea className="w-96 whitespace-nowrap">
  <div className="flex w-max space-x-4 p-4">
    {items.map((item) => (
      <div key={item.id} className="w-64 shrink-0">
        {item.content}
      </div>
    ))}
  </div>
</ScrollArea>
```

---

### Collapsible

Expandable/collapsible section.

```tsx
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

const [isOpen, setIsOpen] = useState(false);

<Collapsible open={isOpen} onOpenChange={setIsOpen}>
  <CollapsibleTrigger asChild>
    <Button variant="ghost" className="w-full justify-between">
      Show more
      <ChevronDown className={cn(
        "h-4 w-4 transition-transform",
        isOpen && "rotate-180"
      )} />
    </Button>
  </CollapsibleTrigger>
  <CollapsibleContent className="space-y-2">
    <div>Hidden content</div>
    <div>More content</div>
  </CollapsibleContent>
</Collapsible>
```

---

## Data Display

### Table

Styled table component.

```tsx
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

<Table>
  <TableCaption>A list of your recent games.</TableCaption>
  <TableHeader>
    <TableRow>
      <TableHead>Title</TableHead>
      <TableHead>Platform</TableHead>
      <TableHead>Release Date</TableHead>
      <TableHead className="text-right">Play Count</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {games.map((game) => (
      <TableRow key={game.id}>
        <TableCell className="font-medium">{game.title}</TableCell>
        <TableCell>{game.platform}</TableCell>
        <TableCell>{game.releaseDate}</TableCell>
        <TableCell className="text-right">{game.playCount}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

---

### Data Table

Advanced table with sorting, filtering, and pagination (using TanStack Table).

```tsx
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';

const columns: ColumnDef<Game>[] = [
  {
    accessorKey: 'title',
    header: 'Title',
  },
  {
    accessorKey: 'platform',
    header: 'Platform',
  },
  {
    accessorKey: 'releaseDate',
    header: 'Release Date',
  },
];

<DataTable columns={columns} data={games} />
```

---

### Badge

Small label for status, categories, or counts.

**Variants:** default, secondary, destructive, outline, platform, tag

```tsx
import { Badge } from '@/components/ui/badge';

// Variants
<Badge>Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="destructive">Error</Badge>
<Badge variant="outline">Outline</Badge>

// Platform badges (auto-colored)
<Badge variant="platform">Flash</Badge>
<Badge variant="platform">HTML5</Badge>
<Badge variant="platform">Shockwave</Badge>

// Tag badges
<Badge variant="tag">Action</Badge>
<Badge variant="tag">Adventure</Badge>

// With icons
<Badge>
  <Star className="mr-1 h-3 w-3" />
  Featured
</Badge>
```

**Platform Colors:**
- Flash: Green
- HTML5: Blue
- Shockwave: Purple
- Java: Orange
- Unity: Slate
- Silverlight: Indigo
- ActiveX: Red
- Default: Gray

---

### Avatar

User avatar with fallback support.

```tsx
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

<Avatar>
  <AvatarImage src="https://github.com/username.png" alt="@username" />
  <AvatarFallback>UN</AvatarFallback>
</Avatar>

// Different sizes
<Avatar className="h-8 w-8">
  <AvatarFallback>SM</AvatarFallback>
</Avatar>

<Avatar className="h-16 w-16">
  <AvatarFallback>LG</AvatarFallback>
</Avatar>
```

---

### Skeleton

Loading placeholder.

```tsx
import { Skeleton } from '@/components/ui/skeleton';

<Skeleton className="h-12 w-12 rounded-full" />
<Skeleton className="h-4 w-full" />
<Skeleton className="h-4 w-3/4" />

// Card skeleton
<Card>
  <CardHeader>
    <Skeleton className="h-6 w-1/2 mb-2" />
    <Skeleton className="h-4 w-1/3" />
  </CardHeader>
  <CardContent>
    <Skeleton className="h-32 w-full mb-4" />
    <Skeleton className="h-4 w-full mb-2" />
    <Skeleton className="h-4 w-2/3" />
  </CardContent>
</Card>
```

---

### Tooltip

Hover information popup.

```tsx
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button variant="outline">Hover me</Button>
    </TooltipTrigger>
    <TooltipContent>
      <p>Helpful information</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>

// With delay
<Tooltip delayDuration={300}>
  {/* ... */}
</Tooltip>

// Different sides
<TooltipContent side="top">Top</TooltipContent>
<TooltipContent side="right">Right</TooltipContent>
<TooltipContent side="bottom">Bottom</TooltipContent>
<TooltipContent side="left">Left</TooltipContent>
```

---

### Popover

Click-triggered popup.

```tsx
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline">Open popover</Button>
  </PopoverTrigger>
  <PopoverContent className="w-80">
    <div className="space-y-2">
      <h4 className="font-medium">Popover Title</h4>
      <p className="text-sm text-muted-foreground">
        Popover content goes here.
      </p>
    </div>
  </PopoverContent>
</Popover>

// Different alignments
<PopoverContent align="start">Left aligned</PopoverContent>
<PopoverContent align="center">Center</PopoverContent>
<PopoverContent align="end">Right aligned</PopoverContent>
```

---

## Feedback Components

### Alert

Informational message blocks.

```tsx
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

<Alert>
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Heads up!</AlertTitle>
  <AlertDescription>
    You can add components to your app using the CLI.
  </AlertDescription>
</Alert>

// Destructive variant
<Alert variant="destructive">
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>
    Your session has expired. Please log in again.
  </AlertDescription>
</Alert>
```

---

### Toast (Sonner)

Temporary notification messages.

```tsx
import { toast } from 'sonner';

// Success toast
toast.success('Game added to favorites!');

// Error toast
toast.error('Failed to load game');

// Info toast
toast.info('Loading game data...');

// Warning toast
toast.warning('Your session will expire soon');

// Custom toast
toast('Custom message', {
  description: 'Additional details here',
  action: {
    label: 'Undo',
    onClick: () => console.log('Undo'),
  },
});

// Loading toast
const toastId = toast.loading('Loading...');
// Later...
toast.success('Done!', { id: toastId });
```

**Toaster Component:**
```tsx
import { Toaster } from '@/components/ui/sonner';

// Add to root layout
function App() {
  return (
    <>
      {/* App content */}
      <Toaster />
    </>
  );
}
```

---

## Navigation Components

### Dropdown Menu

Context menu with keyboard navigation.

```tsx
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline">Menu</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuLabel>My Account</DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuItem>
      <User className="mr-2 h-4 w-4" />
      Profile
    </DropdownMenuItem>
    <DropdownMenuItem>
      <Settings className="mr-2 h-4 w-4" />
      Settings
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem>
      <LogOut className="mr-2 h-4 w-4" />
      Log out
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>

// With checkboxes
<DropdownMenuCheckboxItem checked={showPanel} onCheckedChange={setShowPanel}>
  Show Side Panel
</DropdownMenuCheckboxItem>

// With radio items
<DropdownMenuRadioGroup value={position} onValueChange={setPosition}>
  <DropdownMenuRadioItem value="top">Top</DropdownMenuRadioItem>
  <DropdownMenuRadioItem value="bottom">Bottom</DropdownMenuRadioItem>
</DropdownMenuRadioGroup>

// With submenu
<DropdownMenuSub>
  <DropdownMenuSubTrigger>More options</DropdownMenuSubTrigger>
  <DropdownMenuSubContent>
    <DropdownMenuItem>Option 1</DropdownMenuItem>
    <DropdownMenuItem>Option 2</DropdownMenuItem>
  </DropdownMenuSubContent>
</DropdownMenuSub>
```

---

### Toggle

Toggle button for binary states.

```tsx
import { Toggle } from '@/components/ui/toggle';

<Toggle aria-label="Toggle italic">
  <Italic className="h-4 w-4" />
</Toggle>

// Controlled
const [pressed, setPressed] = useState(false);

<Toggle pressed={pressed} onPressedChange={setPressed}>
  <Bold className="h-4 w-4" />
</Toggle>

// With text
<Toggle>
  <Star className="mr-2 h-4 w-4" />
  Favorite
</Toggle>
```

---

### Toggle Group

Mutually exclusive or multi-select toggles.

```tsx
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

// Single select
<ToggleGroup type="single" value={value} onValueChange={setValue}>
  <ToggleGroupItem value="left">
    <AlignLeft className="h-4 w-4" />
  </ToggleGroupItem>
  <ToggleGroupItem value="center">
    <AlignCenter className="h-4 w-4" />
  </ToggleGroupItem>
  <ToggleGroupItem value="right">
    <AlignRight className="h-4 w-4" />
  </ToggleGroupItem>
</ToggleGroup>

// Multiple select
<ToggleGroup type="multiple" value={values} onValueChange={setValues}>
  <ToggleGroupItem value="bold">
    <Bold className="h-4 w-4" />
  </ToggleGroupItem>
  <ToggleGroupItem value="italic">
    <Italic className="h-4 w-4" />
  </ToggleGroupItem>
  <ToggleGroupItem value="underline">
    <Underline className="h-4 w-4" />
  </ToggleGroupItem>
</ToggleGroup>
```

---

## Overlay Components

### Dialog

Modal dialog window.

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Are you sure?</DialogTitle>
      <DialogDescription>
        This action cannot be undone.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline">Cancel</Button>
      <Button>Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

// Controlled
const [open, setOpen] = useState(false);

<Dialog open={open} onOpenChange={setOpen}>
  {/* ... */}
</Dialog>

// Custom width
<DialogContent className="sm:max-w-[425px]">
  {/* ... */}
</DialogContent>

<DialogContent className="sm:max-w-[800px]">
  {/* ... */}
</DialogContent>
```

---

### Alert Dialog

Confirmati on dialog (non-dismissible).

```tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">Delete</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete game?</AlertDialogTitle>
      <AlertDialogDescription>
        This will permanently delete the game from your library.
        This action cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={handleDelete}>
        Delete
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

### Sheet

Slide-in panel from any edge.

```tsx
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

<Sheet>
  <SheetTrigger asChild>
    <Button>Open Sheet</Button>
  </SheetTrigger>
  <SheetContent>
    <SheetHeader>
      <SheetTitle>Filter Options</SheetTitle>
      <SheetDescription>
        Customize your search results
      </SheetDescription>
    </SheetHeader>
    <div className="py-4">
      {/* Sheet content */}
    </div>
  </SheetContent>
</Sheet>

// Different sides
<SheetContent side="left">Left panel</SheetContent>
<SheetContent side="right">Right panel (default)</SheetContent>
<SheetContent side="top">Top panel</SheetContent>
<SheetContent side="bottom">Bottom panel</SheetContent>
```

---

## Custom Components

### Pagination

Page navigation component.

```tsx
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

<Pagination>
  <PaginationContent>
    <PaginationItem>
      <PaginationPrevious href="#" />
    </PaginationItem>
    <PaginationItem>
      <PaginationLink href="#" isActive>1</PaginationLink>
    </PaginationItem>
    <PaginationItem>
      <PaginationLink href="#">2</PaginationLink>
    </PaginationItem>
    <PaginationItem>
      <PaginationLink href="#">3</PaginationLink>
    </PaginationItem>
    <PaginationItem>
      <PaginationNext href="#" />
    </PaginationItem>
  </PaginationContent>
</Pagination>
```

---

### Platform Icon

Custom game platform icon component.

```tsx
import { PlatformIcon } from '@/components/ui/platform-icon';

<PlatformIcon platform="Flash" className="h-5 w-5" />
<PlatformIcon platform="HTML5" className="h-5 w-5" />
<PlatformIcon platform="Unity Web Player" className="h-5 w-5" />
```

---

## Component Composition Patterns

### Form with Multiple Fields

```tsx
<Card>
  <CardHeader>
    <CardTitle>User Settings</CardTitle>
    <CardDescription>Update your profile information</CardDescription>
  </CardHeader>
  <CardContent>
    <form className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input id="username" placeholder="johndoe" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" placeholder="you@example.com" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea id="bio" placeholder="Tell us about yourself" />
      </div>
      <div className="flex items-center space-x-2">
        <Switch id="notifications" />
        <Label htmlFor="notifications">Email notifications</Label>
      </div>
    </form>
  </CardContent>
  <CardFooter className="flex justify-between">
    <Button variant="outline">Cancel</Button>
    <Button>Save Changes</Button>
  </CardFooter>
</Card>
```

### Confirmation Flow

```tsx
const [showDialog, setShowDialog] = useState(false);

<>
  <Button variant="destructive" onClick={() => setShowDialog(true)}>
    Delete Account
  </Button>

  <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
        <AlertDialogDescription>
          This action cannot be undone. This will permanently delete
          your account and remove your data from our servers.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction
          onClick={handleDelete}
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
        >
          Delete Account
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</>
```

---

## Best Practices

### 1. Use Semantic Components

```tsx
// Good: Semantic structure
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>Content</CardContent>
</Card>

// Bad: Generic divs
<div className="border rounded-lg p-4">
  <div className="text-xl font-bold">Title</div>
  <div>Content</div>
</div>
```

### 2. Leverage asChild Prop

```tsx
// Good: Use asChild for polymorphic components
<Button asChild>
  <Link to="/games">Browse</Link>
</Button>

// Bad: Nesting interactive elements
<Link to="/games">
  <Button>Browse</Button>
</Link>
```

### 3. Controlled vs Uncontrolled

```tsx
// Controlled (recommended for complex logic)
const [open, setOpen] = useState(false);

<Dialog open={open} onOpenChange={setOpen}>
  {/* ... */}
</Dialog>

// Uncontrolled (simpler, less control)
<Dialog>
  {/* ... */}
</Dialog>
```

### 4. Accessibility

```tsx
// Good: Proper labels and ARIA
<Label htmlFor="search">Search</Label>
<Input id="search" aria-label="Search games" />

// Good: Screen reader text
<Button>
  <X className="h-4 w-4" />
  <span className="sr-only">Close</span>
</Button>
```

---

Next: [Icons](./icons.md) - Lucide icons usage guide
