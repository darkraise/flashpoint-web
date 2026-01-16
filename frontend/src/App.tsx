import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { BrowseView } from './views/BrowseView';
import { AnimationsView } from './views/AnimationsView';
import { GameDetailView } from './views/GameDetailView';
import { GamePlayerView } from './views/GamePlayerView';
import { PlaylistsView } from './views/PlaylistsView';
import { PlaylistDetailView } from './views/PlaylistDetailView';
import { FavoritesView } from './views/FavoritesView';
import { DashboardView } from './views/DashboardView';
import { SettingsView } from './views/SettingsView';
import { LoginView } from './views/LoginView';
import { RegisterView } from './views/RegisterView';
import { UnauthorizedView } from './views/UnauthorizedView';
import { UsersView } from './views/UsersView';
import { RolesView } from './views/RolesView';
import { ActivitiesView } from './views/ActivitiesView';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { NetworkStatusIndicator } from './components/common/NetworkStatusIndicator';
import { useAuthStore } from './store/auth';
import { Toaster } from '@/components/ui/sonner';

function App() {
  const { isAuthenticated, isGuest } = useAuthStore();

  return (
    <ErrorBoundary>
      <NetworkStatusIndicator />
      <Toaster />
      <Routes>
      {/* Auth routes (no AppShell) */}
      <Route path="/login" element={<LoginView />} />
      <Route path="/register" element={<RegisterView />} />
      <Route path="/unauthorized" element={<UnauthorizedView />} />

      {/* Main app routes (with AppShell) */}
      <Route path="/*" element={
        <AppShell>
          <Routes>
            <Route path="/" element={
              isAuthenticated || isGuest ? (
                <Navigate to="/flash-games" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            } />

            {/* Public/guest accessible routes */}
            <Route path="/flash-games" element={
              <ProtectedRoute requireAuth={false}>
                <BrowseView />
              </ProtectedRoute>
            } />
            <Route path="/html5-games" element={
              <ProtectedRoute requireAuth={false}>
                <BrowseView />
              </ProtectedRoute>
            } />
            <Route path="/browse" element={
              <ProtectedRoute requireAuth={false}>
                <BrowseView />
              </ProtectedRoute>
            } />
            <Route path="/animations" element={
              <ProtectedRoute requireAuth={false}>
                <AnimationsView />
              </ProtectedRoute>
            } />
            <Route path="/games/:id" element={
              <ProtectedRoute requireAuth={false}>
                <GameDetailView />
              </ProtectedRoute>
            } />

            {/* Protected routes - require authentication */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <DashboardView />
              </ProtectedRoute>
            } />
            <Route path="/games/:id/play" element={
              <ProtectedRoute requirePermission="games.play">
                <GamePlayerView />
              </ProtectedRoute>
            } />
            <Route path="/favorites" element={
              <ProtectedRoute>
                <FavoritesView />
              </ProtectedRoute>
            } />
            <Route path="/playlists" element={
              <ProtectedRoute>
                <PlaylistsView />
              </ProtectedRoute>
            } />
            <Route path="/playlists/:id" element={
              <ProtectedRoute>
                <PlaylistDetailView />
              </ProtectedRoute>
            } />

            {/* User management routes */}
            <Route path="/users" element={
              <ProtectedRoute requirePermission="users.read">
                <UsersView />
              </ProtectedRoute>
            } />
            <Route path="/roles" element={
              <ProtectedRoute requirePermission="roles.read">
                <RolesView />
              </ProtectedRoute>
            } />
            <Route path="/activities" element={
              <ProtectedRoute requirePermission="activities.read">
                <ActivitiesView />
              </ProtectedRoute>
            } />

            {/* Settings */}
            <Route path="/settings" element={
              <ProtectedRoute>
                <SettingsView />
              </ProtectedRoute>
            } />
          </Routes>
        </AppShell>
      } />
      </Routes>
    </ErrorBoundary>
  );
}

export default App;
