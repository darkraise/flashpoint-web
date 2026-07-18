import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { apiClient } from './client';
import { useAuthStore } from '@/store/auth';
import type { User } from '@/types/auth';

// sonner's toast renders nothing without a mounted <Toaster>; stub it so the
// interceptor's user-facing messages don't need one during the test.
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

const mockUser: User = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  role: 'user',
  permissions: ['games.play'],
};

describe('apiClient response interceptor — 401 handling', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    useAuthStore.getState().clearAuth();
    localStorage.clear();
    sessionStorage.clear();
    // jsdom refuses real navigation, so swap window.location for a plain object
    // whose `href` we can assert against.
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { href: 'http://localhost/', assign: vi.fn() },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: originalLocation,
    });
    vi.clearAllMocks();
  });

  it('does not clear guest state or redirect when a guest hits an auth-only 401', async () => {
    server.use(
      http.get('/api/favorites/game-ids', () =>
        HttpResponse.json({ message: 'No token provided' }, { status: 401 })
      )
    );

    useAuthStore.getState().setGuestMode();

    await expect(apiClient.get('/favorites/game-ids')).rejects.toMatchObject({
      response: { status: 401 },
    });

    // Guest browsing survives: no session teardown, no bounce to /login.
    const state = useAuthStore.getState();
    expect(state.isGuest).toBe(true);
    expect(state.user).not.toBeNull();
    expect(window.location.href).toBe('http://localhost/');
  });

  it('clears auth and redirects to /login when an authenticated user 401s and refresh fails', async () => {
    server.use(
      http.get('/api/favorites/game-ids', () =>
        HttpResponse.json({ message: 'No token provided' }, { status: 401 })
      ),
      http.post('/api/auth/refresh', () =>
        HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
      )
    );

    useAuthStore.getState().setAuth(mockUser);

    await expect(apiClient.get('/favorites/game-ids')).rejects.toBeDefined();

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(window.location.href).toBe('/login');
  });
});
