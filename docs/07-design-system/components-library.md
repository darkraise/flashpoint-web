# Components Library

Shadcn UI components copied directly into the codebase for full customization
without npm dependencies. All components are fully typed with TypeScript and
support light/dark themes.

**Installation Approach:** Copy-paste components from Shadcn instead of npm
packages.

## Form Components

### Button

6 variants: default, destructive, outline, secondary, ghost, link 4 sizes:
default (h-10), sm (h-9), lg (h-11), icon (h-10 w-10)

```tsx
import { Button } from '@/components/ui/button';

<Button>Default</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Outline</Button>
<Button size="sm">Small</Button>
<Button size="icon"><Heart className="h-4 w-4" /></Button>
<Button asChild><Link to="/games">Browse</Link></Button>
```

### Input

```tsx
import { Input } from '@/components/ui/input';

<Input placeholder="Enter text" />
<Input type="email" />
<Input disabled />
<Input className="border-destructive" />
```

### Textarea

```tsx
import { Textarea } from '@/components/ui/textarea';

<Textarea placeholder="Enter description..." />
<Textarea rows={5} />
```

### Select

```tsx
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

<Select>
  <SelectTrigger className="w-48">
    <SelectValue placeholder="Select..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
  </SelectContent>
</Select>;
```

### Checkbox, Radio, Switch

```tsx
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';

<Checkbox id="terms" />
<RadioGroup defaultValue="option1">
  <RadioGroupItem value="option1" id="option1" />
</RadioGroup>
<Switch id="notifications" />
```

### Label

```tsx
import { Label } from '@/components/ui/label';

<Label htmlFor="username">Username <span className="text-destructive">*</span></Label>
<Input id="username" />
```

### Form (React Hook Form)

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';

const schema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
});

function MyForm() {
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { username: '', email: '' },
  });

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
                <Input {...field} />
              </FormControl>
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

## Layout Components

### Card

```tsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>Content</CardContent>
  <CardFooter>Actions</CardFooter>
</Card>;
```

### Separator, Scroll Area, Collapsible

```tsx
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';

<Separator className="my-4" />
<ScrollArea className="h-72 w-48"><div>{items}</div></ScrollArea>
<Collapsible>
  <CollapsibleTrigger>Show more</CollapsibleTrigger>
  <CollapsibleContent>Hidden content</CollapsibleContent>
</Collapsible>
```

## Data Display

### Table

```tsx
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Title</TableHead>
      <TableHead>Platform</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {games.map((game) => (
      <TableRow key={game.id}>
        <TableCell>{game.title}</TableCell>
        <TableCell>{game.platform}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>;
```

### Badge

Variants: default, secondary, destructive, outline, platform, tag

```tsx
import { Badge } from '@/components/ui/badge';

<Badge>Default</Badge>
<Badge variant="destructive">Error</Badge>
<Badge variant="platform">Flash</Badge>
<Badge variant="tag">Action</Badge>
```

**Platform Colors:** Flash (green), HTML5 (blue), Shockwave (purple), Java
(orange), Unity (slate)

### Avatar, Skeleton, Tooltip, Popover

```tsx
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';

<Avatar>
  <AvatarImage src="..." />
  <AvatarFallback>UN</AvatarFallback>
</Avatar>

<Skeleton className="h-12 w-12 rounded-full" />

<TooltipProvider>
  <Tooltip>
    <TooltipTrigger>Hover</TooltipTrigger>
    <TooltipContent>Helpful info</TooltipContent>
  </Tooltip>
</TooltipProvider>

<Popover>
  <PopoverTrigger>Open</PopoverTrigger>
  <PopoverContent>Popover content</PopoverContent>
</Popover>
```

## Navigation

### Dropdown Menu

```tsx
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

<DropdownMenu>
  <DropdownMenuTrigger>Menu</DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>Profile</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem>Log out</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>;
```

### Toggle, Toggle Group

```tsx
import { Toggle } from '@/components/ui/toggle';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

<Toggle><Italic className="h-4 w-4" /></Toggle>

<ToggleGroup type="single" value={value} onValueChange={setValue}>
  <ToggleGroupItem value="left"><AlignLeft /></ToggleGroupItem>
  <ToggleGroupItem value="center"><AlignCenter /></ToggleGroupItem>
</ToggleGroup>
```

## Overlay Components

### Dialog

```tsx
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

<Dialog>
  <DialogTrigger>Open</DialogTrigger>
  <DialogContent className="sm:max-w-[425px]">
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
      <DialogDescription>Description</DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline">Cancel</Button>
      <Button>Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>;
```

### Alert Dialog

```tsx
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';

<AlertDialog>
  <AlertDialogTrigger variant="destructive">Delete</AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete?</AlertDialogTitle>
      <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction>Delete</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>;
```

### Sheet

```tsx
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

<Sheet>
  <SheetTrigger>Open</SheetTrigger>
  <SheetContent side="left">
    <SheetHeader>
      <SheetTitle>Title</SheetTitle>
    </SheetHeader>
  </SheetContent>
</Sheet>;
```

## Feedback

### Alert

```tsx
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

<Alert>
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Heads up!</AlertTitle>
  <AlertDescription>Important information</AlertDescription>
</Alert>

<Alert variant="destructive">
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>Something went wrong</AlertDescription>
</Alert>
```

### Toast (Sonner)

```tsx
import { toast } from 'sonner';

toast.success('Saved!');
toast.error('Failed', { description: 'Details here' });
toast.info('Update available');
toast.promise(saveGame(), {
  loading: 'Saving...',
  success: 'Saved!',
  error: 'Failed',
});
```

## Custom Components

### Pagination

```tsx
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationLink,
  PaginationNext,
} from '@/components/ui/pagination';

<Pagination>
  <PaginationContent>
    <PaginationItem>
      <PaginationPrevious href="#" />
    </PaginationItem>
    <PaginationItem>
      <PaginationLink href="#" isActive>
        1
      </PaginationLink>
    </PaginationItem>
    <PaginationItem>
      <PaginationNext href="#" />
    </PaginationItem>
  </PaginationContent>
</Pagination>;
```

### Platform Icon

```tsx
import { PlatformIcon } from '@/components/ui/platform-icon';

<PlatformIcon platform="Flash" className="h-5 w-5" />
<PlatformIcon platform="HTML5" className="h-5 w-5" />
```

## Best Practices

1. **Use Semantic Components** - Prefer Card/Button over generic divs
2. **Use asChild Prop** - For polymorphic components:
   `<Button asChild><Link>Browse</Link></Button>`
3. **Controlled vs Uncontrolled** - Use state for complex logic, uncontrolled
   for simple cases
4. **Accessibility** - Always add labels, ARIA attributes, and sr-only text for
   icon-only buttons

---

See [Shadcn UI Docs](https://ui.shadcn.com) for complete component API
reference.

Next: [Icons](./icons.md) - Lucide icons usage
