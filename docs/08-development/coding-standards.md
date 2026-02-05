# Coding Standards

Coding standards and best practices for Flashpoint Web development.

## TypeScript Standards

### Strict Mode

All services use TypeScript strict mode with `noUnusedLocals`,
`noUnusedParameters`, and `noFallthroughCasesInSwitch` enabled.

### Type Annotations

- Use explicit return types for public functions
- Use type inference for obvious cases (const count = 0)
- Prefer interfaces over type aliases for object shapes
- Use `unknown` type guard instead of `any`
- Prefer `null` for intentional absence, `undefined` for optional parameters
- Prefer union types over enums (unless you need reverse mapping)

### Example:

```typescript
// Good
export function getGameById(id: string): Game | null {
  return games.find((g) => g.id === id) ?? null;
}

// Good - interfaces for objects, unions for types
interface User {
  id: string;
  name: string;
}
type Status = 'active' | 'inactive';

// Avoid
export function getGameById(id: string) {} // implicit return type
```

---

## Naming Conventions

### Files

- **Backend**: Services `PascalCase.ts`, routes `kebab-case.ts`,
  middleware/utils `camelCase.ts`
- **Frontend**: Components `PascalCase.tsx`, hooks `useXxxx.ts`, stores/utils
  `camelCase.ts`
- **Game Service**: All files `kebab-case.ts`

### Variables & Functions

- Variables/functions: `camelCase`
- Constants: `SCREAMING_SNAKE_CASE`
- Private properties: prefix with underscore `_cache`
- Boolean variables: `is/has/should` prefix
- Classes: `PascalCase`
- Interfaces: `PascalCase` (no `I` prefix)
- React components: `PascalCase`
- Component props: `ComponentNameProps`
- Event handlers: `handle` prefix

---

## Code Organization

### Import Order

1. Node.js built-in modules
2. External packages (alphabetical)
3. Internal modules with `@` alias (alphabetical)
4. Relative imports
5. Type imports (separate)

### Exports

- Prefer named exports (except React components where default export is
  acceptable)

### File Structure

Services: imports → types/interfaces → constants → class → helper functions

React components: imports → types → constants → component → helper components

---

## ESLint Rules

### Backend (.eslintrc.json)

```json
{
  "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
  "@typescript-eslint/no-explicit-any": "warn",
  "@typescript-eslint/no-non-null-assertion": "warn"
}
```

### Frontend (.eslintrc.json)

```json
{
  "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
  "react-hooks/rules-of-hooks": "error",
  "react-hooks/exhaustive-deps": "warn"
}
```

Run with `npm run lint` or auto-fix with `npm run lint -- --fix`

---

## Comment Standards

### Documentation Comments

Use JSDoc for public APIs:

```typescript
/**
 * Retrieves a game by its ID from the database.
 * @param id - The unique identifier of the game
 * @returns The game object if found, null otherwise
 */
export async function getGameById(id: string): Promise<Game | null> {
  // Implementation
}
```

### Inline Comments

- Explain "why", not "what"
- Use TODO, FIXME, HACK prefixes for issues
- Avoid obvious comments

---

## Error Handling

### Backend

```typescript
// Use try-catch for async operations
try {
  const game = await db.query('SELECT * FROM game WHERE id = ?', [id]);
  return game ?? null;
} catch (error) {
  logger.error('Failed to get game', { id, error });
  throw new DatabaseError('Failed to retrieve game', { cause: error });
}

// Express route handlers pass errors to middleware with next(error)
```

### Frontend

```typescript
// React Query error handling
const { data, error, isError } = useQuery({ queryKey: ['games'], queryFn: fetchGames });
if (isError) return <div>Failed: {error.message}</div>;
```

---

## Backend Standards

### Database

- Use prepared statements to prevent SQL injection
- Use transactions for multi-step operations
- Never write to flashpoint.sqlite (read-only)
- Use UserDatabaseService for writes to user.db

### Service Layer

```typescript
export class GameService {
  // Simple queries return null for not found
  public getGameById(id: string): Game | null {}

  // List queries return empty arrays
  public searchGames(query: GameQuery): Game[] {}

  // Mutations throw errors on failure
  public async updateGame(id: string, updates: Partial<Game>): Promise<Game> {}
}
```

### Routes

- Validate input with Zod
- Return consistent response structure
- Use 404 for not found, 400 for validation, 500 for server errors
- Pass errors to middleware with `next(error)`

---

## Frontend Standards

### React Components

- Prefer function components
- Extract custom hooks for reusable logic
- Destructure props in function signature
- Use appropriate state management (React Query for server state, Zustand for UI
  state)

### API Calls

**CRITICAL**: Use authenticated axios instance from `frontend/src/lib/api.ts`

```typescript
// CORRECT - authenticated
import { api } from '@/lib/api';
const { data } = await api.get('/api/games');

// WRONG - no authentication
const response = await fetch('/api/games'); // ❌ Bypasses auth!
```

### Styling

- Group related Tailwind classes
- Use `clsx` for conditional classes
- Extract common styles to constants

---

## Git Commit Standards

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting (not CSS)
- `refactor`: Code refactoring
- `test`: Tests
- `chore`: Maintenance

### Examples

```
feat(backend): add game favoriting functionality
fix(frontend): resolve infinite scroll pagination bug
docs(development): add coding standards documentation
```

### Branches

- `feature/<description>`
- `bugfix/<description>`
- `docs/<description>`
- `refactor/<description>`

---

## Additional Resources

- [Project Structure](./project-structure.md)
- [Commands Reference](./commands.md)
- [Testing Guide](./testing-guide.md)
