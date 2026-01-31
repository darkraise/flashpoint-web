# Coding Standards

Comprehensive coding standards and best practices for Flashpoint Web development.

## Table of Contents

- [TypeScript Standards](#typescript-standards)
- [Naming Conventions](#naming-conventions)
- [Code Organization](#code-organization)
- [ESLint Configuration](#eslint-configuration)
- [Comment Standards](#comment-standards)
- [Error Handling](#error-handling)
- [Backend Standards](#backend-standards)
- [Frontend Standards](#frontend-standards)
- [Git Commit Standards](#git-commit-standards)

---

## TypeScript Standards

### Strict Mode Configuration

All services use TypeScript strict mode:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### Type Annotations

**Use explicit return types for public functions:**

```typescript
// Good
export function getGameById(id: string): Game | null {
  return games.find(g => g.id === id) ?? null;
}

// Avoid (implicit return type)
export function getGameById(id: string) {
  return games.find(g => g.id === id) ?? null;
}
```

**Use type inference for simple cases:**

```typescript
// Good - type is obvious
const count = 0;
const message = 'Hello';
const isActive = true;

// Avoid - redundant annotation
const count: number = 0;
const message: string = 'Hello';
```

**Prefer interfaces over type aliases for object shapes:**

```typescript
// Good
interface User {
  id: string;
  username: string;
  email: string;
}

// Use for unions, intersections, mapped types
type Status = 'active' | 'inactive' | 'pending';
type ReadonlyUser = Readonly<User>;
```

### Avoid `any` Type

```typescript
// Bad
function processData(data: any) {
  return data.value;
}

// Good - use unknown and type guards
function processData(data: unknown) {
  if (isValidData(data)) {
    return data.value;
  }
  throw new Error('Invalid data');
}

function isValidData(data: unknown): data is { value: string } {
  return (
    typeof data === 'object' &&
    data !== null &&
    'value' in data &&
    typeof data.value === 'string'
  );
}
```

**ESLint rule:**
```json
{
  "@typescript-eslint/no-explicit-any": "warn"
}
```

### Null vs Undefined

**Prefer `null` for intentional absence:**

```typescript
// Good
function findUser(id: string): User | null {
  return users.find(u => u.id === id) ?? null;
}

// Avoid
function findUser(id: string): User | undefined {
  return users.find(u => u.id === id);
}
```

**Use optional parameters for truly optional values:**

```typescript
// Good
interface GameOptions {
  title: string;
  description?: string;  // Optional property
}

function createGame(options: GameOptions) {
  const description = options.description ?? 'No description';
}
```

### Enums vs Union Types

**Prefer union types over enums:**

```typescript
// Good
type Platform = 'flash' | 'html5' | 'unity';
type Library = 'arcade' | 'theatre';

// Avoid (unless you need reverse mapping)
enum Platform {
  Flash = 'flash',
  Html5 = 'html5',
  Unity = 'unity'
}
```

**Use `as const` for readonly arrays and objects:**

```typescript
// Good
const PLATFORMS = ['flash', 'html5', 'unity'] as const;
type Platform = typeof PLATFORMS[number];

const STATUS_CONFIG = {
  ACTIVE: 'active',
  INACTIVE: 'inactive'
} as const;
```

---

## Naming Conventions

### Files and Directories

**Backend:**
- Services: `PascalCase.ts` (e.g., `GameService.ts`)
- Routes: `kebab-case.ts` (e.g., `play-tracking.ts`)
- Middleware: `camelCase.ts` (e.g., `errorHandler.ts`)
- Utils: `camelCase.ts` (e.g., `logger.ts`)
- Types: `camelCase.ts` (e.g., `auth.ts`)

**Frontend:**
- Components: `PascalCase.tsx` (e.g., `GameCard.tsx`)
- Hooks: `camelCase.ts` with `use` prefix (e.g., `useAuth.ts`)
- Stores: `camelCase.ts` (e.g., `auth.ts`)
- Utils: `kebab-case.ts` (e.g., `date-utils.ts`)
- Views: `PascalCase.tsx` with `View` suffix (e.g., `BrowseView.tsx`)

**Game Service:**
- All files: `kebab-case.ts` (e.g., `proxy-server.ts`)

### Variables and Functions

```typescript
// Variables: camelCase
const gameCount = 100;
const isAuthenticated = true;
const userProfile = { name: 'John' };

// Functions: camelCase
function calculateScore() {}
function getUserById(id: string) {}

// Constants: SCREAMING_SNAKE_CASE
const MAX_RETRIES = 3;
const API_BASE_URL = 'http://localhost:3100';
const DEFAULT_PAGE_SIZE = 20;

// Private properties: prefix with underscore
class GameService {
  private _cache: Map<string, Game>;

  constructor() {
    this._cache = new Map();
  }
}

// Boolean variables: is/has/should prefix
const isLoading = false;
const hasPermission = true;
const shouldRetry = false;
```

### Classes and Interfaces

```typescript
// Classes: PascalCase
class GameService {}
class UserDatabaseService {}

// Interfaces: PascalCase (no I prefix)
interface Game {}
interface User {}
interface ApiResponse {}

// Type aliases: PascalCase
type Status = 'active' | 'inactive';
type GameQuery = { title?: string; platform?: string };

// Generics: Single letter or PascalCase
function identity<T>(value: T): T {
  return value;
}

function mapValues<TInput, TOutput>(
  values: TInput[],
  mapper: (value: TInput) => TOutput
): TOutput[] {
  return values.map(mapper);
}
```

### React Components

```tsx
// Component names: PascalCase
export function GameCard() {}
export function UserProfileMenu() {}

// Props interfaces: ComponentName + Props
interface GameCardProps {
  game: Game;
  onPlay: (gameId: string) => void;
}

export function GameCard({ game, onPlay }: GameCardProps) {
  return <div>...</div>;
}

// Event handlers: handle prefix
const handleClick = () => {};
const handleSubmit = (event: FormEvent) => {};
const handleGameSelect = (gameId: string) => {};
```

---

## Code Organization

### Import Order

```typescript
// 1. Node.js built-in modules
import { readFile } from 'fs/promises';
import { join } from 'path';

// 2. External packages (alphabetical)
import axios from 'axios';
import express from 'express';
import { z } from 'zod';

// 3. Internal modules with @ alias (alphabetical)
import { DatabaseService } from '@/services/DatabaseService';
import { GameService } from '@/services/GameService';
import { logger } from '@/utils/logger';

// 4. Relative imports
import { validateInput } from './validation';

// 5. Type imports (separate)
import type { Game } from '@/types/game';
import type { User } from '@/types/user';
```

### Export Patterns

**Prefer named exports:**

```typescript
// Good
export function getUserById(id: string) {}
export function createUser(data: UserData) {}

// Avoid default exports (except for React components)
export default function getUserById(id: string) {}
```

**React components: default export is acceptable:**

```tsx
// Acceptable for components
export default function GameCard({ game }: GameCardProps) {
  return <div>...</div>;
}

// But named export is preferred
export function GameCard({ game }: GameCardProps) {
  return <div>...</div>;
}
```

### File Structure

**Service file structure:**

```typescript
// 1. Imports
import { DatabaseService } from '@/services/DatabaseService';
import { logger } from '@/utils/logger';
import type { Game, GameQuery } from '@/types/game';

// 2. Types and interfaces
interface GameServiceOptions {
  cacheEnabled: boolean;
}

// 3. Constants
const DEFAULT_PAGE_SIZE = 20;
const MAX_RESULTS = 1000;

// 4. Class definition
export class GameService {
  // 4a. Private properties
  private db: DatabaseService;
  private cache: Map<string, Game>;

  // 4b. Constructor
  constructor(db: DatabaseService, options?: GameServiceOptions) {
    this.db = db;
    this.cache = new Map();
  }

  // 4c. Public methods
  public async getGameById(id: string): Promise<Game | null> {
    // Implementation
  }

  public async searchGames(query: GameQuery): Promise<Game[]> {
    // Implementation
  }

  // 4d. Private methods
  private cacheGame(game: Game): void {
    this.cache.set(game.id, game);
  }
}

// 5. Helper functions
function normalizeQuery(query: GameQuery): GameQuery {
  // Implementation
}
```

**React component structure:**

```tsx
// 1. Imports
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import type { Game } from '@/types/game';

// 2. Types
interface GameCardProps {
  game: Game;
  onPlay: (gameId: string) => void;
}

// 3. Constants
const HOVER_DELAY = 300;

// 4. Component
export function GameCard({ game, onPlay }: GameCardProps) {
  // 4a. Hooks
  const { user } = useAuth();
  const [isHovered, setIsHovered] = useState(false);

  // 4b. Effects
  useEffect(() => {
    // Setup
    return () => {
      // Cleanup
    };
  }, []);

  // 4c. Event handlers
  const handleClick = () => {
    onPlay(game.id);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  // 4d. Render
  return (
    <div onClick={handleClick} onMouseEnter={handleMouseEnter}>
      {/* JSX */}
    </div>
  );
}

// 5. Helper components (if small and component-specific)
function GameCardFooter({ children }: { children: React.ReactNode }) {
  return <div className="footer">{children}</div>;
}
```

---

## ESLint Configuration

### Backend (.eslintrc.json)

```json
{
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 2022,
    "sourceType": "module",
    "project": "./tsconfig.json"
  },
  "plugins": ["@typescript-eslint"],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": ["error", {
      "argsIgnorePattern": "^_",
      "varsIgnorePattern": "^_"
    }],
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-non-null-assertion": "warn",
    "no-console": "off"
  },
  "env": {
    "node": true,
    "es2022": true
  }
}
```

### Frontend (.eslintrc.json)

```json
{
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 2020,
    "sourceType": "module",
    "ecmaFeatures": {
      "jsx": true
    }
  },
  "plugins": ["@typescript-eslint", "react-hooks", "react-refresh"],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": ["error", {
      "argsIgnorePattern": "^_",
      "varsIgnorePattern": "^_"
    }],
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "react-refresh/only-export-components": ["warn", {
      "allowConstantExport": true
    }],
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
    "no-console": "off"
  },
  "env": {
    "browser": true,
    "es2020": true
  }
}
```

### Running ESLint

```bash
# Backend
cd backend
npm run lint

# Frontend
cd frontend
npm run lint

# Auto-fix issues
npm run lint -- --fix
```

---

## Comment Standards

### Documentation Comments

**Use JSDoc for public APIs:**

```typescript
/**
 * Retrieves a game by its ID from the database.
 *
 * @param id - The unique identifier of the game
 * @returns The game object if found, null otherwise
 * @throws {DatabaseError} If database connection fails
 *
 * @example
 * const game = await gameService.getGameById('abc-123');
 * if (game) {
 *   console.log(game.title);
 * }
 */
export async function getGameById(id: string): Promise<Game | null> {
  // Implementation
}
```

**Complex type documentation:**

```typescript
/**
 * Configuration options for game search queries.
 */
interface GameQuery {
  /** Search term for game title */
  title?: string;

  /** Filter by platform (e.g., 'flash', 'html5') */
  platform?: string;

  /** Filter by library (e.g., 'arcade', 'theatre') */
  library?: string;

  /** Maximum number of results to return (default: 20) */
  limit?: number;
}
```

### Inline Comments

**Use comments to explain "why", not "what":**

```typescript
// Bad - obvious from code
// Set user to null
user = null;

// Good - explains reasoning
// Clear user data to prevent memory leaks in long-running sessions
user = null;
```

**TODO comments:**

```typescript
// TODO: Implement caching to improve performance
// TODO(username): Add validation for email format
// FIXME: This doesn't handle edge case when game has no platform
// HACK: Temporary workaround until API v2 is available
```

### Avoid Over-Commenting

```typescript
// Bad - too many obvious comments
// Get the user ID
const userId = user.id;
// Create a new game object
const game = { id, title };
// Save the game
await db.save(game);

// Good - self-documenting code
const userId = user.id;
const game = { id, title };
await db.save(game);
```

---

## Error Handling

### Backend Error Handling

**Use try-catch for async operations:**

```typescript
export async function getGameById(id: string): Promise<Game | null> {
  try {
    const game = await db.query('SELECT * FROM game WHERE id = ?', [id]);
    return game ?? null;
  } catch (error) {
    logger.error('Failed to get game by ID', { id, error });
    throw new DatabaseError('Failed to retrieve game', { cause: error });
  }
}
```

**Custom error classes:**

```typescript
export class DatabaseError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'DatabaseError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public fields: string[]) {
    super(message);
    this.name = 'ValidationError';
  }
}
```

**Express error handling:**

```typescript
// Route handler
app.get('/api/games/:id', async (req, res, next) => {
  try {
    const game = await gameService.getGameById(req.params.id);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    res.json(game);
  } catch (error) {
    next(error);  // Pass to error handler middleware
  }
});

// Error handler middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Request error', { error: err, path: req.path });

  if (err instanceof ValidationError) {
    return res.status(400).json({ error: err.message, fields: err.fields });
  }

  res.status(500).json({ error: 'Internal server error' });
});
```

### Frontend Error Handling

**React Query error handling:**

```tsx
function GameList() {
  const { data, error, isError } = useQuery({
    queryKey: ['games'],
    queryFn: fetchGames,
  });

  if (isError) {
    return (
      <div className="error">
        <p>Failed to load games</p>
        <p>{error.message}</p>
      </div>
    );
  }

  // Render games
}
```

**Error boundaries:**

```tsx
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <div>Something went wrong.</div>;
    }
    return this.props.children;
  }
}
```

---

## Backend Standards

### Database Queries

**Use prepared statements:**

```typescript
// Good
const game = db.prepare('SELECT * FROM game WHERE id = ?').get(id);

// Bad - SQL injection risk
const game = db.prepare(`SELECT * FROM game WHERE id = '${id}'`).get();
```

**Transaction handling:**

```typescript
export function createPlaylist(userId: string, playlist: PlaylistData) {
  const transaction = db.transaction(() => {
    const result = db.prepare(`
      INSERT INTO user_playlists (user_id, name, description)
      VALUES (?, ?, ?)
    `).run(userId, playlist.name, playlist.description);

    const playlistId = result.lastInsertRowid;

    // Insert games
    const insertGame = db.prepare(`
      INSERT INTO playlist_games (playlist_id, game_id, order_index)
      VALUES (?, ?, ?)
    `);

    playlist.games.forEach((gameId, index) => {
      insertGame.run(playlistId, gameId, index);
    });

    return playlistId;
  });

  return transaction();
}
```

### Service Layer Patterns

```typescript
export class GameService {
  constructor(private db: DatabaseService) {}

  // Simple queries return null for not found
  public getGameById(id: string): Game | null {
    return this.db.getGame(id) ?? null;
  }

  // List queries return empty arrays
  public searchGames(query: GameQuery): Game[] {
    return this.db.searchGames(query);
  }

  // Mutations throw errors on failure
  public async updateGame(id: string, updates: Partial<Game>): Promise<Game> {
    const game = this.getGameById(id);
    if (!game) {
      throw new NotFoundError(`Game ${id} not found`);
    }

    return this.db.updateGame(id, updates);
  }
}
```

### Route Handlers

```typescript
// Consistent error responses
router.get('/games/:id', async (req, res, next) => {
  try {
    const game = await gameService.getGameById(req.params.id);

    if (!game) {
      return res.status(404).json({
        error: 'Game not found',
        message: `No game with ID ${req.params.id}`
      });
    }

    res.json({ data: game });
  } catch (error) {
    next(error);
  }
});

// Input validation with Zod
const createGameSchema = z.object({
  title: z.string().min(1).max(255),
  platform: z.string(),
  library: z.enum(['arcade', 'theatre'])
});

router.post('/games', async (req, res, next) => {
  try {
    const data = createGameSchema.parse(req.body);
    const game = await gameService.createGame(data);
    res.status(201).json({ data: game });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors
      });
    }
    next(error);
  }
});
```

---

## Frontend Standards

### React Component Patterns

**Prefer function components:**

```tsx
// Good
export function GameCard({ game }: GameCardProps) {
  return <div>{game.title}</div>;
}

// Avoid class components (unless you need error boundaries)
class GameCard extends React.Component<GameCardProps> {
  render() {
    return <div>{this.props.game.title}</div>;
  }
}
```

**Extract custom hooks:**

```tsx
// Good - reusable logic in custom hook
function useGameSelection(initialGameId?: string) {
  const [selectedGameId, setSelectedGameId] = useState(initialGameId);
  const { data: game } = useQuery({
    queryKey: ['game', selectedGameId],
    queryFn: () => fetchGame(selectedGameId!),
    enabled: !!selectedGameId
  });

  return { selectedGameId, setSelectedGameId, game };
}

function GameBrowser() {
  const { selectedGameId, setSelectedGameId, game } = useGameSelection();
  // Use hook
}
```

**Prop destructuring:**

```tsx
// Good
export function GameCard({ game, onPlay, isSelected }: GameCardProps) {
  return <div>...</div>;
}

// Avoid
export function GameCard(props: GameCardProps) {
  return <div>{props.game.title}</div>;
}
```

### State Management

**Use appropriate state management:**

```tsx
// Local state for component-specific data
const [isOpen, setIsOpen] = useState(false);

// React Query for server state
const { data: games } = useQuery({
  queryKey: ['games'],
  queryFn: fetchGames
});

// Zustand for global UI state
const { theme, setTheme } = useThemeStore();

// URL params for shareable state
const [searchParams, setSearchParams] = useSearchParams();
const page = searchParams.get('page') ?? '1';
```

### Tailwind CSS Standards

```tsx
// Group related classes
<div className="flex flex-col gap-4 p-4 bg-white rounded-lg shadow-md">

// Use conditional classes with clsx
import { clsx } from 'clsx';

<button
  className={clsx(
    'px-4 py-2 rounded',
    isActive ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
  )}
>

// Extract common styles to constants
const cardStyles = 'p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition';

<div className={cardStyles}>...</div>
```

---

## Git Commit Standards

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, semicolons, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**

```
feat(backend): add game favoriting functionality

Implement endpoints for adding and removing games from user favorites.
Includes database migrations and service layer updates.

Closes #123
```

```
fix(frontend): resolve infinite scroll pagination bug

Fixed issue where pagination would reset when scrolling to bottom.
Updated useInfiniteQuery configuration to properly handle page params.

Fixes #456
```

```
docs(development): add coding standards documentation

Created comprehensive coding standards guide covering TypeScript,
naming conventions, and best practices for all services.
```

### Branch Naming

```
feature/<description>
bugfix/<description>
hotfix/<description>
docs/<description>
refactor/<description>
```

**Examples:**
- `feature/game-favorites`
- `bugfix/pagination-reset`
- `docs/api-reference`
- `refactor/auth-service`

---

## Additional Resources

- [Project Structure](./project-structure.md) - Codebase organization
- [Testing Guide](./testing-guide.md) - Testing best practices
- [Commands Reference](./commands.md) - Development commands
