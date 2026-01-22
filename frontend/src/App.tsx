import { Routes, Route, Navigate, useNavigate, Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from './components/layout/AppShell';
import { BrowseView } from './views/BrowseView';
import { FlashGamesView } from './views/FlashGamesView';
import { HTML5GamesView } from './views/HTML5GamesView';
import { AnimationsView } from './views/AnimationsView';
import { GameDetailView } from './views/GameDetailView';
import { GamePlayerView } from './views/GamePlayerView';
import { PlaylistsView } from './views/PlaylistsView';
import { PlaylistDetailView } from './views/PlaylistDetailView';
import { UserPlaylistsView } from './views/UserPlaylistsView';
import { UserPlaylistDetailView } from './views/UserPlaylistDetailView';
import { FavoritesView } from './views/FavoritesView';
import { DashboardView } from './views/DashboardView';
import { SettingsView } from './views/SettingsView';
import { JobsView } from './views/JobsView';
import { LoginView } from './views/LoginView';
import { RegisterView } from './views/RegisterView';
import { UnauthorizedView } from './views/UnauthorizedView';
import { MaintenancePage } from './views/MaintenancePage';
import { NotFoundView } from './components/error/NotFoundView';
import { ServerErrorView } from './components/error/ServerErrorView';
import { NetworkErrorView } from './components/error/NetworkErrorView';
import { UsersView } from './views/UsersView';
import { RolesView } from './views/RolesView';
import { ActivitiesView } from './views/ActivitiesView';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { MaintenanceGuard } from './components/common/MaintenanceGuard';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { NetworkStatusIndicator } from './components/common/NetworkStatusIndicator';
import { MobileWarningDialog } from './components/common/MobileWarningDialog';
import { useAuthStore } from './store/auth';
import { authSettingsApi } from './lib/api';
import { usePublicSettings } from './hooks/usePublicSettings';
import { Toaster } from '@/components/ui/sonner';

function App() {
  const { isAuthenticated, isGuest, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const { data: publicSettings } = usePublicSettings();

  // Check if guest access is enabled when user is in guest mode
  const { data: authSettings } = useQuery({
    queryKey: ['authSettings'],
    queryFn: () => authSettingsApi.get(),
    enabled: isGuest,
    refetchInterval: isGuest ? 30000 : false // Refetch every 30 seconds if guest
  });

  // Update browser title from site name in public settings
  useEffect(() => {
    // When fresh API data arrives, update title and cache it
    if (publicSettings?.app?.siteName) {
      document.title = publicSettings.app.siteName;
      localStorage.setItem('flashpoint-siteName', publicSettings.app.siteName);
    }
  }, [publicSettings]);

  // Redirect guest users if guest access is disabled
  useEffect(() => {
    if (isGuest && authSettings && !authSettings.guestAccessEnabled) {
      clearAuth();
      navigate('/login', { replace: true });
    }
  }, [isGuest, authSettings, clearAuth, navigate]);

  return (
    <ErrorBoundary>
      <NetworkStatusIndicator />
      <MobileWarningDialog />
      <Toaster />
      <Routes>
      {/* Auth routes (no AppShell) */}
      <Route path="/login" element={<LoginView />} />
      <Route path="/register" element={<RegisterView />} />
      <Route path="/unauthorized" element={<UnauthorizedView />} />
      <Route path="/maintenance" element={<MaintenancePage />} />

      {/* Error pages (no AppShell) */}
      <Route path="/error/500" element={<ServerErrorView />} />
      <Route path="/error/network" element={<NetworkErrorView />} />

      {/* Dev-only test routes */}
      {import.meta.env.DEV && (
        <>
          <Route path="/_dev/404" element={<NotFoundView />} />
          <Route path="/_dev/500" element={<ServerErrorView />} />
          <Route path="/_dev/network" element={<NetworkErrorView />} />
          <Route path="/_dev/403" element={<UnauthorizedView />} />
        </>
      )}

      {/* Main app routes (with AppShell + MaintenanceGuard) */}
      <Route element={
        <MaintenanceGuard>
          <AppShell>
            <Outlet />
          </AppShell>
        </MaintenanceGuard>
      }>
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
            <FlashGamesView />
          </ProtectedRoute>
        } />
        <Route path="/html5-games" element={
          <ProtectedRoute requireAuth={false}>
            <HTML5GamesView />
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
          <ProtectedRoute requireFeature="enableStatistics">
            <DashboardView />
          </ProtectedRoute>
        } />
        <Route path="/games/:id/play" element={
          <ProtectedRoute requirePermission="games.play">
            <GamePlayerView />
          </ProtectedRoute>
        } />
        <Route path="/favorites" element={
          <ProtectedRoute requireFeature="enableFavorites">
            <FavoritesView />
          </ProtectedRoute>
        } />
        <Route path="/playlists" element={
          <ProtectedRoute requireFeature="enablePlaylists">
            <UserPlaylistsView />
          </ProtectedRoute>
        } />
        <Route path="/playlists/:id" element={
          <ProtectedRoute requireFeature="enablePlaylists">
            <UserPlaylistDetailView />
          </ProtectedRoute>
        } />
        <Route path="/flashpoint-playlists" element={
          <ProtectedRoute requireFeature="enablePlaylists">
            <PlaylistsView />
          </ProtectedRoute>
        } />
        <Route path="/flashpoint-playlists/:id" element={
          <ProtectedRoute requireFeature="enablePlaylists">
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

        {/* Jobs */}
        <Route path="/jobs" element={
          <ProtectedRoute requirePermission="settings.update">
            <JobsView />
          </ProtectedRoute>
        } />

        {/* Settings */}
        <Route path="/settings" element={
          <ProtectedRoute>
            <SettingsView />
          </ProtectedRoute>
        } />
      </Route>

      {/* 404 catch-all - MUST BE LAST, no AppShell */}
      <Route path="*" element={<NotFoundView />} />
      </Routes>
    </ErrorBoundary>
  );
}

export default App;
