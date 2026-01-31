# Testing Guide

Comprehensive guide to testing practices for Flashpoint Web application.

## Table of Contents

- [Testing Philosophy](#testing-philosophy)
- [Backend Testing](#backend-testing)
- [Frontend Testing](#frontend-testing)
- [Test Organization](#test-organization)
- [Testing Patterns](#testing-patterns)
- [Mocking Strategies](#mocking-strategies)
- [Coverage Goals](#coverage-goals)
- [CI/CD Integration](#cicd-integration)

---

## Testing Philosophy

### Testing Pyramid

```
        /\
       /  \  E2E Tests (Few)
      /____\
     /      \  Integration Tests (Some)
    /________\
   /          \  Unit Tests (Many)
  /__________\
```

**Our Approach:**
1. **Unit Tests (70%)**: Test individual functions and classes in isolation
2. **Integration Tests (20%)**: Test service interactions and API endpoints
3. **E2E Tests (10%)**: Test critical user flows (future implementation)

### Test Coverage Goals

- **Backend**: 80% coverage target
- **Critical Services**: 90%+ coverage
- **Routes**: Test all endpoints
- **Frontend**: TBD (future implementation)

### When to Write Tests

**Always test:**
- Business logic in services
- Database operations
- Authentication and authorization
- API endpoints
- Utility functions
- Data transformations

**Consider testing:**
- UI components with complex logic
- Custom React hooks
- Form validation
- State management

**Can skip:**
- Simple getter/setter methods
- Trivial UI components
- Configuration files
- Type definitions

---

## Backend Testing

### Test Framework: Vitest

**Configuration** (`backend/vitest.config.ts`):

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'src/tests/',
        '**/*.test.ts',
        '**/*.spec.ts'
      ]
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
```

### Running Backend Tests

```bash
cd backend

# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test src/services/GameService.test.ts

# Run tests matching pattern
npm test -- --grep "authentication"
```

### Test File Structure

```
backend/src/
├── services/
│   ├── GameService.ts
│   └── GameService.test.ts        # Co-located with implementation
├── routes/
│   ├── games.ts
│   └── games.test.ts
├── utils/
│   ├── jwt.ts
│   └── jwt.test.ts
└── tests/
    ├── setup.ts                    # Test setup/teardown
    ├── fixtures/                   # Test data
    │   ├── games.ts
    │   └── users.ts
    └── helpers/                    # Test utilities
        ├── database.ts
        └── mocks.ts
```

### Unit Test Example: Service

```typescript
// src/services/GameService.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GameService } from './GameService';
import { DatabaseService } from './DatabaseService';
import type { Game } from '@/types/game';

describe('GameService', () => {
  let gameService: GameService;
  let mockDb: DatabaseService;

  beforeEach(() => {
    // Setup
    mockDb = {
      prepare: vi.fn(),
      close: vi.fn()
    } as unknown as DatabaseService;

    gameService = new GameService(mockDb);
  });

  afterEach(() => {
    // Cleanup
    vi.clearAllMocks();
  });

  describe('getGameById', () => {
    it('should return game when found', () => {
      // Arrange
      const gameId = 'game-123';
      const mockGame: Game = {
        id: gameId,
        title: 'Test Game',
        platform: 'Flash',
        library: 'arcade'
      };

      const mockPrepare = vi.fn().mockReturnValue({
        get: vi.fn().mockReturnValue(mockGame)
      });
      mockDb.prepare = mockPrepare;

      // Act
      const result = gameService.getGameById(gameId);

      // Assert
      expect(result).toEqual(mockGame);
      expect(mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining('SELECT')
      );
    });

    it('should return null when game not found', () => {
      // Arrange
      const mockPrepare = vi.fn().mockReturnValue({
        get: vi.fn().mockReturnValue(undefined)
      });
      mockDb.prepare = mockPrepare;

      // Act
      const result = gameService.getGameById('nonexistent');

      // Assert
      expect(result).toBeNull();
    });

    it('should throw error on database failure', () => {
      // Arrange
      const mockPrepare = vi.fn().mockImplementation(() => {
        throw new Error('Database error');
      });
      mockDb.prepare = mockPrepare;

      // Act & Assert
      expect(() => gameService.getGameById('game-123')).toThrow('Database error');
    });
  });

  describe('searchGames', () => {
    it('should return games matching title query', () => {
      // Arrange
      const query = { title: 'Mario' };
      const mockGames: Game[] = [
        { id: '1', title: 'Super Mario', platform: 'Flash', library: 'arcade' },
        { id: '2', title: 'Mario Kart', platform: 'Flash', library: 'arcade' }
      ];

      const mockPrepare = vi.fn().mockReturnValue({
        all: vi.fn().mockReturnValue(mockGames)
      });
      mockDb.prepare = mockPrepare;

      // Act
      const results = gameService.searchGames(query);

      // Assert
      expect(results).toHaveLength(2);
      expect(results).toEqual(mockGames);
    });

    it('should return empty array when no matches', () => {
      // Arrange
      const mockPrepare = vi.fn().mockReturnValue({
        all: vi.fn().mockReturnValue([])
      });
      mockDb.prepare = mockPrepare;

      // Act
      const results = gameService.searchGames({ title: 'nonexistent' });

      // Assert
      expect(results).toEqual([]);
    });

    it('should apply multiple filters correctly', () => {
      // Arrange
      const query = {
        title: 'Test',
        platform: 'Flash',
        library: 'arcade'
      };

      const mockPrepare = vi.fn().mockReturnValue({
        all: vi.fn().mockReturnValue([])
      });
      mockDb.prepare = mockPrepare;

      // Act
      gameService.searchGames(query);

      // Assert
      const sqlCall = mockPrepare.mock.calls[0][0];
      expect(sqlCall).toContain('title LIKE');
      expect(sqlCall).toContain('platform =');
      expect(sqlCall).toContain('library =');
    });
  });
});
```

### Integration Test Example: Route

```typescript
// src/routes/games.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../server';
import { createTestUser, getAuthToken } from '@/tests/helpers/auth';
import { createTestGame } from '@/tests/fixtures/games';

describe('Games API', () => {
  let authToken: string;
  let testGameId: string;

  beforeAll(async () => {
    // Setup test user and get auth token
    const user = await createTestUser({
      username: 'testuser',
      email: 'test@example.com'
    });
    authToken = await getAuthToken(user.id);

    // Create test game
    const game = await createTestGame({
      title: 'Test Game',
      platform: 'Flash'
    });
    testGameId = game.id;
  });

  afterAll(async () => {
    // Cleanup test data
  });

  describe('GET /api/games', () => {
    it('should return list of games', async () => {
      const response = await request(app)
        .get('/api/games')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toHaveProperty('pagination');
    });

    it('should filter games by platform', async () => {
      const response = await request(app)
        .get('/api/games?platform=Flash')
        .expect(200);

      const games = response.body.data;
      games.forEach((game: Game) => {
        expect(game.platform).toBe('Flash');
      });
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/api/games?page=1&limit=10')
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(10);
      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 10
      });
    });
  });

  describe('GET /api/games/:id', () => {
    it('should return game by ID', async () => {
      const response = await request(app)
        .get(`/api/games/${testGameId}`)
        .expect(200);

      expect(response.body.data).toMatchObject({
        id: testGameId,
        title: 'Test Game'
      });
    });

    it('should return 404 for nonexistent game', async () => {
      const response = await request(app)
        .get('/api/games/nonexistent-id')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/games/:id/favorite', () => {
    it('should require authentication', async () => {
      await request(app)
        .post(`/api/games/${testGameId}/favorite`)
        .expect(401);
    });

    it('should add game to favorites', async () => {
      const response = await request(app)
        .post(`/api/games/${testGameId}/favorite`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
    });

    it('should handle duplicate favorites gracefully', async () => {
      // Add to favorites first time
      await request(app)
        .post(`/api/games/${testGameId}/favorite`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      // Try to add again
      const response = await request(app)
        .post(`/api/games/${testGameId}/favorite`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.message).toContain('already');
    });
  });
});
```

### Database Testing

**In-memory database for tests:**

```typescript
// src/tests/helpers/database.ts
import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';

export function createTestDatabase() {
  // Create in-memory database
  const db = new Database(':memory:');

  // Run migrations
  const schema = readFileSync(
    join(__dirname, '../../migrations/001_user-schema.sql'),
    'utf-8'
  );
  db.exec(schema);

  return db;
}

export function seedTestData(db: Database.Database) {
  // Insert test users
  db.prepare(`
    INSERT INTO users (id, username, email, password_hash)
    VALUES (?, ?, ?, ?)
  `).run('user-1', 'testuser', 'test@example.com', 'hash');

  // Insert test roles
  db.prepare(`
    INSERT INTO roles (id, name)
    VALUES (?, ?)
  `).run('role-1', 'user');

  // Assign role to user
  db.prepare(`
    INSERT INTO user_roles (user_id, role_id)
    VALUES (?, ?)
  `).run('user-1', 'role-1');
}
```

**Usage in tests:**

```typescript
import { describe, it, beforeEach } from 'vitest';
import { createTestDatabase, seedTestData } from '@/tests/helpers/database';

describe('UserService', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDatabase();
    seedTestData(db);
  });

  it('should find user by username', () => {
    // Test implementation
  });
});
```

---

## Frontend Testing

### Status: To Be Implemented

Frontend testing setup is planned but not yet implemented. When implemented, it will use:

**Testing Stack:**
- **Vitest**: Test runner
- **React Testing Library**: Component testing
- **MSW (Mock Service Worker)**: API mocking
- **Playwright/Cypress**: E2E testing

### Planned Component Test Example

```tsx
// src/components/library/GameCard.test.tsx (future)
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameCard } from './GameCard';

describe('GameCard', () => {
  const mockGame = {
    id: 'game-1',
    title: 'Test Game',
    platform: 'Flash',
    library: 'arcade'
  };

  it('should render game title', () => {
    render(<GameCard game={mockGame} onPlay={vi.fn()} />);
    expect(screen.getByText('Test Game')).toBeInTheDocument();
  });

  it('should call onPlay when clicked', () => {
    const onPlay = vi.fn();
    render(<GameCard game={mockGame} onPlay={onPlay} />);

    fireEvent.click(screen.getByRole('button'));
    expect(onPlay).toHaveBeenCalledWith('game-1');
  });
});
```

### Planned Hook Test Example

```typescript
// src/hooks/useAuth.test.ts (future)
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuth } from './useAuth';

describe('useAuth', () => {
  it('should login user', async () => {
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login('username', 'password');
    });

    expect(result.current.user).toBeDefined();
    expect(result.current.isAuthenticated).toBe(true);
  });
});
```

---

## Test Organization

### Naming Conventions

**Test files:**
- Co-locate with implementation: `GameService.test.ts`
- Alternative: `__tests__/GameService.test.ts`

**Test suites:**
```typescript
describe('ComponentName', () => {
  describe('methodName', () => {
    it('should do something when condition', () => {});
  });
});
```

**Test naming:**
- Use descriptive names: "should return null when game not found"
- Follow pattern: "should [expected behavior] when [condition]"
- Be specific: "should throw ValidationError when email is invalid"

### Arrange-Act-Assert Pattern

```typescript
it('should calculate total correctly', () => {
  // Arrange - setup test data and dependencies
  const cart = new ShoppingCart();
  cart.addItem({ id: '1', price: 10, quantity: 2 });
  cart.addItem({ id: '2', price: 15, quantity: 1 });

  // Act - execute the behavior being tested
  const total = cart.calculateTotal();

  // Assert - verify the expected outcome
  expect(total).toBe(35);
});
```

### Test Data Fixtures

```typescript
// src/tests/fixtures/games.ts
export const testGames = {
  flashGame: {
    id: 'flash-1',
    title: 'Flash Game',
    platform: 'Flash',
    library: 'arcade',
    developer: 'Test Dev',
    releaseDate: '2010-01-01'
  },
  html5Game: {
    id: 'html5-1',
    title: 'HTML5 Game',
    platform: 'HTML5',
    library: 'arcade',
    developer: 'Test Dev',
    releaseDate: '2020-01-01'
  }
};

export function createTestGame(overrides = {}) {
  return {
    ...testGames.flashGame,
    ...overrides
  };
}
```

**Usage:**

```typescript
import { testGames, createTestGame } from '@/tests/fixtures/games';

it('should handle Flash games', () => {
  const game = testGames.flashGame;
  // Test with predefined game
});

it('should handle custom game', () => {
  const game = createTestGame({ title: 'Custom Game' });
  // Test with customized game
});
```

---

## Testing Patterns

### Testing Async Code

```typescript
it('should fetch games asynchronously', async () => {
  // Arrange
  const service = new GameService(mockDb);

  // Act
  const games = await service.fetchGames();

  // Assert
  expect(games).toHaveLength(10);
});
```

### Testing Error Handling

```typescript
it('should throw error on invalid input', () => {
  expect(() => {
    validateGameData({ title: '' });
  }).toThrow('Title is required');
});

it('should handle async errors', async () => {
  await expect(async () => {
    await service.getGameById('invalid');
  }).rejects.toThrow('Game not found');
});
```

### Testing Callbacks

```typescript
it('should call callback with result', () => {
  const callback = vi.fn();
  const service = new GameService(mockDb);

  service.fetchGames({ onSuccess: callback });

  expect(callback).toHaveBeenCalledWith(
    expect.arrayContaining([expect.objectContaining({ id: expect.any(String) })])
  );
});
```

### Testing Timers

```typescript
import { vi } from 'vitest';

it('should debounce search', () => {
  vi.useFakeTimers();

  const onSearch = vi.fn();
  const debouncedSearch = debounce(onSearch, 300);

  debouncedSearch('query');
  debouncedSearch('query2');
  debouncedSearch('query3');

  expect(onSearch).not.toHaveBeenCalled();

  vi.advanceTimersByTime(300);

  expect(onSearch).toHaveBeenCalledTimes(1);
  expect(onSearch).toHaveBeenCalledWith('query3');

  vi.useRealTimers();
});
```

### Parameterized Tests

```typescript
describe('validateEmail', () => {
  const testCases = [
    ['valid@example.com', true],
    ['invalid', false],
    ['@example.com', false],
    ['user@domain', false],
    ['user@domain.co.uk', true]
  ];

  testCases.forEach(([email, expected]) => {
    it(`should return ${expected} for "${email}"`, () => {
      expect(validateEmail(email)).toBe(expected);
    });
  });
});
```

---

## Mocking Strategies

### Mocking Modules

```typescript
import { vi } from 'vitest';
import * as authUtils from '@/utils/jwt';

vi.mock('@/utils/jwt', () => ({
  verifyToken: vi.fn(),
  generateToken: vi.fn()
}));

it('should verify token', () => {
  const mockVerify = vi.mocked(authUtils.verifyToken);
  mockVerify.mockReturnValue({ userId: '123' });

  const result = authUtils.verifyToken('token');
  expect(result).toEqual({ userId: '123' });
});
```

### Mocking Functions

```typescript
it('should call logger on error', () => {
  const mockLogger = {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn()
  };

  const service = new GameService(mockDb, mockLogger);
  service.handleError(new Error('test'));

  expect(mockLogger.error).toHaveBeenCalledWith(
    expect.stringContaining('test'),
    expect.any(Object)
  );
});
```

### Partial Mocking

```typescript
const mockDb = {
  prepare: vi.fn(),
  close: vi.fn(),
  // Only mock what you need
} as unknown as Database;
```

### Spy on Methods

```typescript
it('should call internal method', () => {
  const service = new GameService(mockDb);
  const spy = vi.spyOn(service as any, 'cacheGame');

  service.getGameById('game-1');

  expect(spy).toHaveBeenCalledWith(expect.objectContaining({ id: 'game-1' }));

  spy.mockRestore();
});
```

---

## Coverage Goals

### Running Coverage Reports

```bash
cd backend
npm test -- --coverage
```

**Output:**
```
File                    | % Stmts | % Branch | % Funcs | % Lines
------------------------|---------|----------|---------|--------
services/GameService.ts |   95.12 |    89.47 |   100.0 |   95.12
services/UserService.ts |   88.23 |    78.26 |    92.3 |   88.23
routes/games.ts         |   91.66 |    85.71 |   100.0 |   91.66
```

### Coverage Thresholds

Add to `vitest.config.ts`:

```typescript
export default defineConfig({
  test: {
    coverage: {
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80
      }
    }
  }
});
```

### What to Test for Coverage

**Priority 1 - Critical Paths:**
- Authentication logic
- Authorization checks
- Database operations
- Payment processing (if applicable)
- Data transformations

**Priority 2 - Business Logic:**
- Service layer methods
- Utility functions
- Validation logic
- API endpoints

**Priority 3 - Edge Cases:**
- Error handling
- Null/undefined checks
- Boundary conditions
- Race conditions

---

## CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [master, develop]
  pull_request:
    branches: [master, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm run install:all

      - name: Run backend tests
        run: |
          cd backend
          npm test -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./backend/coverage/coverage-final.json
          flags: backend

      - name: Type check
        run: npm run typecheck
```

### Pre-commit Hooks

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run typecheck && npm test",
      "pre-push": "npm run build"
    }
  }
}
```

---

## Best Practices

### Do's

- Write tests before fixing bugs (regression testing)
- Test one thing per test
- Use descriptive test names
- Keep tests simple and readable
- Mock external dependencies
- Clean up after tests
- Use fixtures for test data
- Test edge cases and error paths

### Don'ts

- Don't test implementation details
- Don't make tests dependent on each other
- Don't use production databases
- Don't test external libraries
- Don't ignore failing tests
- Don't commit commented-out tests
- Don't test getters/setters without logic

---

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Docs](https://testing-library.com/)
- [Coding Standards](./coding-standards.md)
- [Debugging Guide](./debugging.md)
