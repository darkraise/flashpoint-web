# Testing Guide

Testing practices for Flashpoint Web.

## Testing Philosophy

### Pyramid

- **Unit Tests (70%)**: Individual functions in isolation
- **Integration Tests (20%)**: Service interactions and API endpoints
- **E2E Tests (10%)**: Critical user flows

### Coverage Goals

- Backend: 80% target
- Critical services: 90%+
- Routes: Test all endpoints

### When to Test

**Always:**

- Business logic in services
- Database operations
- Authentication and authorization
- API endpoints
- Utility functions
- Data transformations

**Skip:**

- Simple getter/setter methods
- Trivial UI components
- Configuration files
- Type definitions

---

## Backend Testing (Vitest)

### Configuration

```typescript
// vitest.config.ts
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
    },
  },
});
```

### Running Tests

```bash
cd backend

npm test                                  # Run all tests
npm test -- --watch                       # Watch mode
npm test -- --coverage                    # With coverage
npm test src/services/GameService.test.ts # Specific file
npm test -- --grep "authentication"       # Pattern matching
```

### Test Structure

- Co-locate tests with implementation: `GameService.test.ts`
- Use fixtures for test data in `src/tests/fixtures/`
- Use helpers in `src/tests/helpers/`

### Unit Test Example

```typescript
describe('GameService', () => {
  let gameService: GameService;
  let mockDb: DatabaseService;

  beforeEach(() => {
    mockDb = { prepare: vi.fn() } as unknown as DatabaseService;
    gameService = new GameService(mockDb);
  });

  describe('getGameById', () => {
    it('should return game when found', () => {
      const mockGame = { id: 'game-123', title: 'Test Game' };
      const mockPrepare = vi
        .fn()
        .mockReturnValue({ get: vi.fn().mockReturnValue(mockGame) });
      mockDb.prepare = mockPrepare;

      const result = gameService.getGameById('game-123');

      expect(result).toEqual(mockGame);
    });

    it('should return null when game not found', () => {
      const mockPrepare = vi
        .fn()
        .mockReturnValue({ get: vi.fn().mockReturnValue(undefined) });
      mockDb.prepare = mockPrepare;

      const result = gameService.getGameById('nonexistent');

      expect(result).toBeNull();
    });
  });
});
```

### Integration Test Example

```typescript
describe('Games API', () => {
  let authToken: string;

  beforeAll(async () => {
    const user = await createTestUser({ username: 'testuser' });
    authToken = await getAuthToken(user.id);
  });

  describe('GET /api/games', () => {
    it('should return list of games', async () => {
      const response = await request(app).get('/api/games').expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
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
  },
};

export function createTestGame(overrides = {}) {
  return { ...testGames.flashGame, ...overrides };
}
```

### Testing Patterns

**Async Code:**

```typescript
it('should fetch games asynchronously', async () => {
  const games = await service.fetchGames();
  expect(games).toHaveLength(10);
});
```

**Error Handling:**

```typescript
it('should throw error on invalid input', () => {
  expect(() => validateGameData({ title: '' })).toThrow('Title is required');
});
```

**Mocking:**

```typescript
vi.mock('@/utils/jwt', () => ({
  verifyToken: vi.fn(),
}));

const mockVerify = vi.mocked(verifyToken);
mockVerify.mockReturnValue({ userId: '123' });
```

---

## Frontend Testing

Frontend testing setup is planned but not yet implemented. When implemented, it
will use:

- **Vitest**: Test runner
- **React Testing Library**: Component testing
- **MSW**: API mocking
- **Playwright/Cypress**: E2E testing

---

## Coverage

### Running Coverage Reports

```bash
cd backend
npm test -- --coverage
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
        lines: 80,
      },
    },
  },
});
```

---

## Best Practices

### Do's

- Write tests before fixing bugs (regression testing)
- Test one thing per test
- Use descriptive test names ("should return null when game not found")
- Keep tests simple and readable
- Mock external dependencies
- Use fixtures for test data
- Test edge cases and error paths

### Don'ts

- Don't test implementation details
- Don't make tests dependent on each other
- Don't use production databases
- Don't test external libraries
- Don't ignore failing tests

---

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Coding Standards](./coding-standards.md)
- [Debugging Guide](./debugging.md)
