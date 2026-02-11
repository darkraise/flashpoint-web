import { beforeAll, afterAll, vi } from 'vitest';

// Mock logger to prevent console noise during tests
vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Global test setup
beforeAll(() => {
  // Set test environment
  process.env.NODE_ENV = 'test';
});

// Global test cleanup
afterAll(() => {
  // Restore environment
  delete process.env.NODE_ENV;
});
