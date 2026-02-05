# UI Components

Documentation for Shadcn UI components used in the application.

## Overview

The application uses [Shadcn UI](https://ui.shadcn.com/) - a collection of
beautifully designed, accessible, and customizable components built with:

- **Radix UI** - Unstyled, accessible component primitives
- **Tailwind CSS** - Utility-first styling
- **CVA** (Class Variance Authority) - Component variants

All components are located in `frontend/src/components/ui/` and can be
customized directly.

## Core Components

### Button

Versatile button component with multiple variants.

```typescript
import { Button } from '@/components/ui/button';

<Button>Default</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Cancel</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
<Button size="icon"><Icon /></Button>
```

**Variants:**

- `default` - Primary action button
- `destructive` - Dangerous actions (delete, remove)
- `outline` - Secondary actions
- `ghost` - Minimal button style
- `link` - Text link style
- `secondary` - Alternative secondary style

### Card

Container component for content grouping.

```typescript
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    Content here
  </CardContent>
  <CardFooter>
    Footer actions
  </CardFooter>
</Card>
```

### Dialog

Modal dialog component.

```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
      <DialogDescription>Description</DialogDescription>
    </DialogHeader>
    <div>Content</div>
    <DialogFooter>
      <Button onClick={handleSave}>Save</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Dropdown Menu

Dropdown menu with items and separators.

```typescript
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';

<DropdownMenu>
  <DropdownMenuTrigger>
    <Button>Menu</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuLabel>Options</DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuItem>Action 1</DropdownMenuItem>
    <DropdownMenuItem>Action 2</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### Input

Form input component.

```typescript
import { Input } from '@/components/ui/input';

<Input
  type="text"
  placeholder="Enter text"
  value={value}
  onChange={(e) => setValue(e.target.value)}
/>
```

### Select

Dropdown select component.

```typescript
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

<Select value={value} onValueChange={setValue}>
  <SelectTrigger>
    <SelectValue placeholder="Select option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
  </SelectContent>
</Select>
```

### Badge

Small status or label component.

```typescript
import { Badge } from '@/components/ui/badge';

<Badge>Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="outline">Outline</Badge>
<Badge variant="destructive">Destructive</Badge>
```

### Toast / Sonner

Toast notification system.

```typescript
import { toast } from 'sonner';

toast.success('Success message');
toast.error('Error message');
toast.info('Info message');
toast.warning('Warning message');
toast.promise(asyncFunction, {
  loading: 'Loading...',
  success: 'Success!',
  error: 'Failed',
});
```

### Table

Data table component.

```typescript
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Column 1</TableHead>
      <TableHead>Column 2</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Data 1</TableCell>
      <TableCell>Data 2</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

## Form Components

### Form (React Hook Form Integration)

```typescript
import { useForm } from 'react-hook-form';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';

const form = useForm();

<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)}>
    <FormField
      control={form.control}
      name="username"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Username</FormLabel>
          <FormControl>
            <Input {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  </form>
</Form>
```

## Layout Components

### Separator

Horizontal or vertical separator.

```typescript
import { Separator } from '@/components/ui/separator';

<Separator />
<Separator orientation="vertical" />
```

### ScrollArea

Scrollable area with custom scrollbar.

```typescript
import { ScrollArea } from '@/components/ui/scroll-area';

<ScrollArea className="h-72">
  <div>Long content here...</div>
</ScrollArea>
```

### Skeleton

Loading placeholder.

```typescript
import { Skeleton } from '@/components/ui/skeleton';

<Skeleton className="h-12 w-full" />
```

## All Available Components (40+)

- Alert, AlertDialog
- Avatar
- Badge
- Button
- Card
- Checkbox
- Collapsible
- Dialog
- Dropdown Menu
- Form
- Input, Textarea
- Label
- Pagination
- Popover
- Radio Group
- Scroll Area
- Select
- Separator
- Sheet
- Skeleton
- Sonner (Toast)
- Switch
- Table, Data Table
- Toast, Toaster
- Toggle, Toggle Group
- Tooltip
- **Custom:** Platform Icon, Tooltip

## Customization

All components can be customized by editing files in
`frontend/src/components/ui/`. They use Tailwind CSS classes and CSS variables
for theming.

### Theme Variables

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
  --primary-foreground: 210 40% 98%;
  /* ... more variables */
}
```

## Further Reading

- [Shadcn UI Documentation](https://ui.shadcn.com/)
- [Radix UI Documentation](https://www.radix-ui.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
