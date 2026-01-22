# Design Patterns

This document outlines common UI patterns and best practices used throughout the Flashpoint Web application. Following these patterns ensures consistency, maintainability, and excellent user experience.

## Layout Patterns

### Page Layout with Header and Content

```tsx
function PageLayout({ children }) {
  return (
    <div className="min-h-screen bg-background">
      {/* Fixed header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center justify-between">
            <Logo />
            <Navigation />
            <UserMenu />
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
```

### Sidebar Layout

```tsx
function SidebarLayout() {
  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card">
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">Filters</h2>
          <FilterPanel />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-6 py-8">
          <Content />
        </div>
      </main>
    </div>
  );
}
```

### Responsive Sidebar (Mobile Drawer)

```tsx
function ResponsiveSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile: Sheet (drawer) */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="lg:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Desktop: Fixed sidebar */}
      <aside className="hidden lg:block w-64 border-r border-border">
        <div className="sticky top-0 p-6">
          <SidebarContent />
        </div>
      </aside>
    </>
  );
}
```

---

## Card Patterns

### Basic Game Card

```tsx
function GameCard({ game }) {
  return (
    <Card className="group cursor-pointer overflow-hidden hover:shadow-lg transition-all">
      {/* Image with overlay */}
      <div className="relative aspect-video overflow-hidden">
        <img
          src={game.thumbnail}
          alt={game.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
        />
        {/* Badge overlay */}
        <Badge variant="platform" className="absolute top-2 right-2">
          {game.platform}
        </Badge>
        {/* Favorite button */}
        <Button
          size="icon"
          variant="ghost"
          className="absolute top-2 left-2 bg-black/50 hover:bg-black/70"
        >
          <Heart className="h-4 w-4" />
        </Button>
      </div>

      <CardHeader>
        <CardTitle className="line-clamp-1">{game.title}</CardTitle>
        <CardDescription className="line-clamp-2">
          {game.description}
        </CardDescription>
      </CardHeader>

      <CardFooter className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>{game.releaseDate}</span>
        </div>
        <Button size="sm">
          <Play className="mr-2 h-4 w-4" />
          Play
        </Button>
      </CardFooter>
    </Card>
  );
}
```

### Feature Card

```tsx
function FeatureCard({ icon: Icon, title, description }) {
  return (
    <Card className="text-center">
      <CardHeader>
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Icon className="h-8 w-8 text-primary" />
        </div>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
```

### Stat Card

```tsx
function StatCard({ icon: Icon, label, value, trend }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        {trend && (
          <div className={cn(
            "flex items-center gap-1 text-sm",
            trend > 0 ? "text-green-500" : "text-destructive"
          )}>
            {trend > 0 ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## Form Patterns

### Login Form

```tsx
function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    // Login logic
    setIsLoading(false);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
        <CardDescription>
          Enter your credentials to access your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              placeholder="Enter username"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter password"
              required
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox id="remember" />
              <Label htmlFor="remember" className="text-sm cursor-pointer">
                Remember me
              </Label>
            </div>
            <Button variant="link" size="sm" className="px-0">
              Forgot password?
            </Button>
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign In
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        <Separator />
        <p className="text-sm text-muted-foreground text-center">
          Don't have an account?{' '}
          <Button variant="link" className="px-0">
            Sign up
          </Button>
        </p>
      </CardFooter>
    </Card>
  );
}
```

### Filter Form

```tsx
function FilterForm({ onFilterChange }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Filters
          <Button variant="ghost" size="sm">
            Reset
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Platform filter */}
        <div className="space-y-2">
          <Label>Platform</Label>
          <Select onValueChange={(value) => onFilterChange('platform', value)}>
            <SelectTrigger>
              <SelectValue placeholder="All Platforms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              <SelectItem value="flash">Flash</SelectItem>
              <SelectItem value="html5">HTML5</SelectItem>
              <SelectItem value="shockwave">Shockwave</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Year range */}
        <div className="space-y-2">
          <Label>Release Year</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input type="number" placeholder="From" />
            <Input type="number" placeholder="To" />
          </div>
        </div>

        {/* Tags (checkboxes) */}
        <div className="space-y-2">
          <Label>Tags</Label>
          <ScrollArea className="h-32">
            <div className="space-y-2">
              {tags.map((tag) => (
                <div key={tag} className="flex items-center space-x-2">
                  <Checkbox id={tag} />
                  <Label htmlFor={tag} className="cursor-pointer">
                    {tag}
                  </Label>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full">Apply Filters</Button>
      </CardFooter>
    </Card>
  );
}
```

---

## List Patterns

### Simple List

```tsx
function SimpleList({ items }) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={item.avatar} />
              <AvatarFallback>{item.initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{item.title}</p>
              <p className="text-sm text-muted-foreground">{item.subtitle}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
```

### Grouped List

```tsx
function GroupedList({ groups }) {
  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.title}>
          <h3 className="text-sm font-medium text-muted-foreground mb-2 px-2">
            {group.title}
          </h3>
          <div className="space-y-1">
            {group.items.map((item) => (
              <button
                key={item.id}
                className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-accent transition-colors text-left"
              >
                {item.icon && <item.icon className="h-4 w-4 text-muted-foreground" />}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

## Data Display Patterns

### Key-Value Pairs

```tsx
function MetadataDisplay({ data }) {
  return (
    <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Object.entries(data).map(([key, value]) => (
        <div key={key} className="space-y-1">
          <dt className="text-sm font-medium text-muted-foreground">
            {key}
          </dt>
          <dd className="text-base font-normal">
            {value || 'N/A'}
          </dd>
        </div>
      ))}
    </dl>
  );
}
```

### Data Table with Actions

```tsx
function DataTableExample() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Games Library</CardTitle>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search..."
              className="w-64"
            />
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Game
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Release Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {games.map((game) => (
              <TableRow key={game.id}>
                <TableCell className="font-medium">{game.title}</TableCell>
                <TableCell>
                  <Badge variant="platform">{game.platform}</Badge>
                </TableCell>
                <TableCell>{game.releaseDate}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Play className="mr-2 h-4 w-4" />
                        Play
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">
                        <Trash className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter>
        <Pagination />
      </CardFooter>
    </Card>
  );
}
```

---

## Modal/Dialog Patterns

### Confirmation Dialog

```tsx
function DeleteConfirmation({ gameName, onConfirm, onCancel }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">
          <Trash className="mr-2 h-4 w-4" />
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {gameName}?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently remove the game
            from your library.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

### Form Dialog

```tsx
function EditGameDialog({ game, onSave }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Edit className="mr-2 h-4 w-4" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Game</DialogTitle>
          <DialogDescription>
            Make changes to game information.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" defaultValue={game.title} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" defaultValue={game.description} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="platform">Platform</Label>
              <Select defaultValue={game.platform}>
                <SelectTrigger id="platform">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flash">Flash</SelectItem>
                  <SelectItem value="html5">HTML5</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">Release Year</Label>
              <Input id="year" type="number" defaultValue={game.year} />
            </div>
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => { onSave(); setOpen(false); }}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Loading States

### Skeleton Loaders

```tsx
function GameCardSkeleton() {
  return (
    <Card>
      <Skeleton className="aspect-video w-full" />
      <CardHeader>
        <Skeleton className="h-6 w-3/4 mb-2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </CardHeader>
      <CardFooter>
        <Skeleton className="h-9 w-full" />
      </CardFooter>
    </Card>
  );
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <GameCardSkeleton key={i} />
      ))}
    </div>
  );
}
```

### Loading Spinner

```tsx
function LoadingSpinner({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center p-12">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}
```

---

## Empty States

### No Results

```tsx
function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
        <Icon className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="text-2xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-md mb-6">{description}</p>
      {action && action}
    </div>
  );
}

// Usage
<EmptyState
  icon={Search}
  title="No games found"
  description="Try adjusting your search or filter criteria to find what you're looking for."
  action={
    <Button>
      <RotateCw className="mr-2 h-4 w-4" />
      Reset Filters
    </Button>
  }
/>
```

---

## Notification Patterns

### Toast Notifications

```tsx
// Success
toast.success('Game added to favorites!');

// Error with retry action
toast.error('Failed to load game', {
  action: {
    label: 'Retry',
    onClick: () => retryLoad(),
  },
});

// Info with description
toast.info('New update available', {
  description: 'Version 2.0 includes new features and improvements.',
});

// Promise-based loading
toast.promise(
  saveGame(),
  {
    loading: 'Saving...',
    success: 'Game saved successfully!',
    error: 'Failed to save game',
  }
);
```

### Alert Messages

```tsx
<Alert>
  <Info className="h-4 w-4" />
  <AlertTitle>Tip</AlertTitle>
  <AlertDescription>
    You can press F11 to toggle fullscreen mode while playing.
  </AlertDescription>
</Alert>

<Alert variant="destructive">
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>
    Failed to load game content. Please check your internet connection.
  </AlertDescription>
</Alert>
```

---

## Search Patterns

### Search with Suggestions

```tsx
function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search games..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>
      {query && results.length > 0 && (
        <Card className="absolute top-full left-0 right-0 mt-2 z-50">
          <ScrollArea className="max-h-96">
            <div className="p-2">
              {results.map((result) => (
                <button
                  key={result.id}
                  className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-accent transition-colors text-left"
                >
                  <img
                    src={result.thumbnail}
                    alt={result.title}
                    className="h-10 w-10 rounded object-cover"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{result.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {result.platform}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </Card>
      )}
    </div>
  );
}
```

---

## Pagination Pattern

```tsx
function PaginationControls({ currentPage, totalPages, onPageChange }) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        Page {currentPage} of {totalPages}
      </p>
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
            />
          </PaginationItem>
          {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
            const page = i + 1;
            return (
              <PaginationItem key={page}>
                <PaginationLink
                  onClick={() => onPageChange(page)}
                  isActive={page === currentPage}
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            );
          })}
          <PaginationItem>
            <PaginationNext
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
```

---

## Best Practices

### 1. Consistent Component Structure

```tsx
// Good: Consistent pattern
function ComponentName({ prop1, prop2 }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Title</CardTitle>
        <CardDescription>Description</CardDescription>
      </CardHeader>
      <CardContent>{/* content */}</CardContent>
      <CardFooter>{/* actions */}</CardFooter>
    </Card>
  );
}
```

### 2. Reusable Patterns

Extract common patterns into reusable components:

```tsx
// Reusable empty state component
<EmptyState
  icon={Search}
  title="No results"
  description="Try different criteria"
/>

// Reusable loading state
<LoadingSpinner message="Loading games..." />
```

### 3. Accessible Interactions

```tsx
// Good: Keyboard accessible
<button
  onClick={handleClick}
  onKeyDown={(e) => e.key === 'Enter' && handleClick()}
  aria-label="Action description"
>
  Action
</button>

// Good: Focus management
<Dialog onOpenChange={(open) => {
  if (!open) {
    // Return focus to trigger
    triggerRef.current?.focus();
  }
}}>
```

### 4. Error Handling

```tsx
function ComponentWithError() {
  const [error, setError] = useState(null);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  return <Content />;
}
```

---

Last updated: 2026-01-18
