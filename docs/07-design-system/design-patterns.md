# Design Patterns

Common UI patterns and best practices for Flashpoint Web.

## Layout Patterns

### Page Layout with Header

```tsx
<div className="min-h-screen bg-background">
  <header className="sticky top-0 z-50 border-b border-border bg-background">
    <div className="container mx-auto px-4 py-4">
      <nav className="flex items-center justify-between">
        <Logo />
        <Navigation />
        <UserMenu />
      </nav>
    </div>
  </header>

  <main className="container mx-auto px-4 py-8">
    {children}
  </main>
</div>
```

### Sidebar Layout

```tsx
<div className="flex h-screen">
  <aside className="w-64 border-r border-border bg-card">
    <div className="p-6">
      <h2 className="text-lg font-semibold mb-4">Filters</h2>
      <FilterPanel />
    </div>
  </aside>

  <main className="flex-1 overflow-y-auto">
    <div className="container mx-auto px-6 py-8">
      <Content />
    </div>
  </main>
</div>
```

### Responsive Sidebar (Mobile Drawer)

```tsx
const [open, setOpen] = useState(false);

<>
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

  <aside className="hidden lg:block w-64 border-r border-border">
    <div className="sticky top-0 p-6">
      <SidebarContent />
    </div>
  </aside>
</>
```

## Card Patterns

### Game Card

```tsx
<Card className="group cursor-pointer overflow-hidden hover:shadow-lg transition-all">
  <div className="relative aspect-video overflow-hidden">
    <img src={thumbnail} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
    <Badge variant="platform" className="absolute top-2 right-2">{platform}</Badge>
  </div>

  <CardHeader>
    <CardTitle className="line-clamp-1">{title}</CardTitle>
    <CardDescription className="line-clamp-2">{description}</CardDescription>
  </CardHeader>

  <CardFooter className="flex items-center justify-between">
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Calendar className="h-3 w-3" />
      <span>{releaseDate}</span>
    </div>
    <Button size="sm"><Play className="mr-2 h-4 w-4" />Play</Button>
  </CardFooter>
</Card>
```

### Feature Card

```tsx
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
```

## Form Patterns

### Login Form

```tsx
const [isLoading, setIsLoading] = useState(false);

<Card className="w-full max-w-md mx-auto">
  <CardHeader>
    <CardTitle>Sign In</CardTitle>
    <CardDescription>Enter your credentials</CardDescription>
  </CardHeader>
  <CardContent>
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input id="username" placeholder="Enter username" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" placeholder="Enter password" required />
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Sign In
      </Button>
    </form>
  </CardContent>
</Card>
```

### Filter Form

```tsx
<Card>
  <CardHeader>
    <CardTitle className="flex items-center justify-between">
      Filters
      <Button variant="ghost" size="sm">Reset</Button>
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
          <SelectItem value="flash">Flash</SelectItem>
          <SelectItem value="html5">HTML5</SelectItem>
        </SelectContent>
      </Select>
    </div>

    {/* Year range */}
    <div className="grid grid-cols-2 gap-2">
      <Input type="number" placeholder="From" />
      <Input type="number" placeholder="To" />
    </div>
  </CardContent>
  <CardFooter>
    <Button className="w-full">Apply Filters</Button>
  </CardFooter>
</Card>
```

## List & Table Patterns

### Simple List

```tsx
<div className="space-y-2">
  {items.map(item => (
    <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent transition-colors cursor-pointer">
      <div className="flex items-center gap-3">
        <Avatar><AvatarImage src={item.avatar} /><AvatarFallback>{item.initials}</AvatarFallback></Avatar>
        <div>
          <p className="font-medium">{item.title}</p>
          <p className="text-sm text-muted-foreground">{item.subtitle}</p>
        </div>
      </div>
      <Button variant="ghost" size="sm"><ChevronRight className="h-4 w-4" /></Button>
    </div>
  ))}
</div>
```

### Data Table with Actions

```tsx
<Card>
  <CardHeader className="flex items-center justify-between">
    <CardTitle>Games Library</CardTitle>
    <div className="flex items-center gap-2">
      <Input placeholder="Search..." className="w-64" />
      <Button><Plus className="mr-2 h-4 w-4" />Add Game</Button>
    </div>
  </CardHeader>
  <CardContent>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Platform</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {games.map(game => (
          <TableRow key={game.id}>
            <TableCell className="font-medium">{game.title}</TableCell>
            <TableCell><Badge variant="platform">{game.platform}</Badge></TableCell>
            <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem><Play className="mr-2 h-4 w-4" />Play</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive"><Trash className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </CardContent>
</Card>
```

## Modal/Dialog Patterns

### Confirmation Dialog

```tsx
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive"><Trash className="mr-2 h-4 w-4" />Delete</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete {gameName}?</AlertDialogTitle>
      <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground">
        Delete
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### Form Dialog

```tsx
const [open, setOpen] = useState(false);

<Dialog open={open} onOpenChange={setOpen}>
  <DialogTrigger asChild>
    <Button variant="outline"><Edit className="mr-2 h-4 w-4" />Edit</Button>
  </DialogTrigger>
  <DialogContent className="sm:max-w-[600px]">
    <DialogHeader>
      <DialogTitle>Edit Game</DialogTitle>
    </DialogHeader>
    <form className="space-y-4">
      {/* Form fields */}
    </form>
    <DialogFooter>
      <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
      <Button onClick={() => { onSave(); setOpen(false); }}>Save</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

## Loading States

### Skeleton Loaders

```tsx
<Card>
  <Skeleton className="aspect-video w-full" />
  <CardHeader>
    <Skeleton className="h-6 w-3/4 mb-2" />
    <Skeleton className="h-4 w-full" />
  </CardHeader>
</Card>

<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  {Array.from({ length: 8 }).map((_, i) => (
    <GameCardSkeleton key={i} />
  ))}
</div>
```

## Empty & Error States

### Empty State

```tsx
<div className="flex flex-col items-center justify-center p-12 text-center">
  <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
    <Search className="h-10 w-10 text-muted-foreground" />
  </div>
  <h3 className="text-2xl font-semibold mb-2">No games found</h3>
  <p className="text-muted-foreground max-w-md mb-6">Try adjusting your search or filters.</p>
  <Button>
    <RotateCw className="mr-2 h-4 w-4" />
    Reset Filters
  </Button>
</div>
```

## Notifications

### Toast

```tsx
toast.success('Game added to favorites!');
toast.error('Failed to load game', { action: { label: 'Retry', onClick: () => retryLoad() } });
toast.promise(saveGame(), { loading: 'Saving...', success: 'Saved!', error: 'Failed' });
```

### Alert

```tsx
<Alert>
  <Info className="h-4 w-4" />
  <AlertTitle>Tip</AlertTitle>
  <AlertDescription>Press F11 to toggle fullscreen.</AlertDescription>
</Alert>

<Alert variant="destructive">
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>Failed to load content. Check your connection.</AlertDescription>
</Alert>
```

---

Next: [Spacing & Layout](./spacing-layout.md) - Spacing scale and layouts
