import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { useAuthStore } from '@/store/auth';
import type { User, AuthTokens } from '@/types/auth';

// Mock hooks
vi.mock('@/hooks/useFeatureFlags', () => ({
  useFeatureFlags: () => ({
    enablePlaylists: true,
    enableFavorites: true,
    enableStatistics: false,
  }),
}));

vi.mock('@/hooks/useSharedPlaylistAccess', () => ({
  useSharedPlaylistAccess: (_gameId: string | null) => ({
    hasAccess: false,
    isLoading: false,
  }),
}));

describe('ProtectedRoute', () => {
  // Clear auth state before each test
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
  });

  describe('Authentication Requirements', () => {
    it('should redirect to login when not authenticated', () => {
      render(
        <MemoryRouter initialEntries={['/protected']}>
          <Routes>
            <Route
              path="/protected"
              element={
                <ProtectedRoute requireAuth={true}>
                  <div>Protected Content</div>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div>Login Page</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('Login Page')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should allow access when authenticated', () => {
      // Set authenticated user
      const mockUser: User = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        role: 'user',
        permissions: ['games.play'],
      };

      const mockTokens: AuthTokens = {
        accessToken: 'token',
        expiresIn: 3600,
      };

      useAuthStore.getState().setAuth(mockUser, mockTokens);

      render(
        <MemoryRouter initialEntries={['/protected']}>
          <Routes>
            <Route
              path="/protected"
              element={
                <ProtectedRoute requireAuth={true}>
                  <div>Protected Content</div>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div>Login Page</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
      expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
    });

    it('should allow guest access when auth not required', () => {
      // Set guest mode
      useAuthStore.getState().setGuestMode();

      render(
        <MemoryRouter initialEntries={['/protected']}>
          <Routes>
            <Route
              path="/protected"
              element={
                <ProtectedRoute requireAuth={false}>
                  <div>Public Content</div>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div>Login Page</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('Public Content')).toBeInTheDocument();
    });
  });

  describe('Permission Requirements', () => {
    beforeEach(() => {
      const mockUser: User = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        role: 'user',
        permissions: ['games.play', 'playlists.create'],
      };

      const mockTokens: AuthTokens = {
        accessToken: 'token',
        expiresIn: 3600,
      };

      useAuthStore.getState().setAuth(mockUser, mockTokens);
    });

    it('should allow access with correct permission', () => {
      render(
        <MemoryRouter initialEntries={['/protected']}>
          <Routes>
            <Route
              path="/protected"
              element={
                <ProtectedRoute requirePermission="games.play">
                  <div>Protected Content</div>
                </ProtectedRoute>
              }
            />
            <Route path="/unauthorized" element={<div>Unauthorized</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('should redirect to unauthorized without required permission', () => {
      render(
        <MemoryRouter initialEntries={['/protected']}>
          <Routes>
            <Route
              path="/protected"
              element={
                <ProtectedRoute requirePermission="users.manage">
                  <div>Protected Content</div>
                </ProtectedRoute>
              }
            />
            <Route path="/unauthorized" element={<div>Unauthorized</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('Unauthorized')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should allow access when user has any of the required permissions', () => {
      render(
        <MemoryRouter initialEntries={['/protected']}>
          <Routes>
            <Route
              path="/protected"
              element={
                <ProtectedRoute
                  requirePermissions={['games.play', 'users.manage']}
                  requireAllPermissions={false}
                >
                  <div>Protected Content</div>
                </ProtectedRoute>
              }
            />
            <Route path="/unauthorized" element={<div>Unauthorized</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('should deny access when user does not have all required permissions', () => {
      render(
        <MemoryRouter initialEntries={['/protected']}>
          <Routes>
            <Route
              path="/protected"
              element={
                <ProtectedRoute
                  requirePermissions={['games.play', 'users.manage']}
                  requireAllPermissions={true}
                >
                  <div>Protected Content</div>
                </ProtectedRoute>
              }
            />
            <Route path="/unauthorized" element={<div>Unauthorized</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('Unauthorized')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should allow access when user has all required permissions', () => {
      render(
        <MemoryRouter initialEntries={['/protected']}>
          <Routes>
            <Route
              path="/protected"
              element={
                <ProtectedRoute
                  requirePermissions={['games.play', 'playlists.create']}
                  requireAllPermissions={true}
                >
                  <div>Protected Content</div>
                </ProtectedRoute>
              }
            />
            <Route path="/unauthorized" element={<div>Unauthorized</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });

  describe('Role Requirements', () => {
    it('should allow access with correct role', () => {
      const mockUser: User = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        role: 'admin',
        permissions: ['users.manage'],
      };

      const mockTokens: AuthTokens = {
        accessToken: 'token',
        expiresIn: 3600,
      };

      useAuthStore.getState().setAuth(mockUser, mockTokens);

      render(
        <MemoryRouter initialEntries={['/admin']}>
          <Routes>
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireRole="admin">
                  <div>Admin Panel</div>
                </ProtectedRoute>
              }
            />
            <Route path="/unauthorized" element={<div>Unauthorized</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('Admin Panel')).toBeInTheDocument();
    });

    it('should deny access with incorrect role', () => {
      const mockUser: User = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        role: 'user',
        permissions: ['games.play'],
      };

      const mockTokens: AuthTokens = {
        accessToken: 'token',
        expiresIn: 3600,
      };

      useAuthStore.getState().setAuth(mockUser, mockTokens);

      render(
        <MemoryRouter initialEntries={['/admin']}>
          <Routes>
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireRole="admin">
                  <div>Admin Panel</div>
                </ProtectedRoute>
              }
            />
            <Route path="/unauthorized" element={<div>Unauthorized</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('Unauthorized')).toBeInTheDocument();
      expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument();
    });
  });

  describe('Feature Flag Requirements', () => {
    it('should allow access when feature is enabled', () => {
      const mockUser: User = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        role: 'user',
        permissions: ['playlists.create'],
      };

      const mockTokens: AuthTokens = {
        accessToken: 'token',
        expiresIn: 3600,
      };

      useAuthStore.getState().setAuth(mockUser, mockTokens);

      render(
        <MemoryRouter initialEntries={['/playlists']}>
          <Routes>
            <Route
              path="/playlists"
              element={
                <ProtectedRoute requireFeature="enablePlaylists">
                  <div>Playlists</div>
                </ProtectedRoute>
              }
            />
            <Route path="/unauthorized" element={<div>Unauthorized</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('Playlists')).toBeInTheDocument();
    });

    it('should deny access when feature is disabled', () => {
      const mockUser: User = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        role: 'user',
        permissions: ['statistics.view'],
      };

      const mockTokens: AuthTokens = {
        accessToken: 'token',
        expiresIn: 3600,
      };

      useAuthStore.getState().setAuth(mockUser, mockTokens);

      render(
        <MemoryRouter initialEntries={['/statistics']}>
          <Routes>
            <Route
              path="/statistics"
              element={
                <ProtectedRoute requireFeature="enableStatistics">
                  <div>Statistics</div>
                </ProtectedRoute>
              }
            />
            <Route path="/unauthorized" element={<div>Unauthorized</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('Unauthorized')).toBeInTheDocument();
      expect(screen.queryByText('Statistics')).not.toBeInTheDocument();
    });
  });

  describe('Custom Fallback Path', () => {
    it('should redirect to custom fallback path when unauthorized', () => {
      render(
        <MemoryRouter initialEntries={['/protected']}>
          <Routes>
            <Route
              path="/protected"
              element={
                <ProtectedRoute requireAuth={true} fallbackPath="/custom-login">
                  <div>Protected Content</div>
                </ProtectedRoute>
              }
            />
            <Route path="/custom-login" element={<div>Custom Login</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('Custom Login')).toBeInTheDocument();
    });
  });
});
