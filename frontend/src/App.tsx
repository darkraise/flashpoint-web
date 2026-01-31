import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from './components/layout/MainLayout';
import { PublicLayout } from './components/layout/PublicLayout';
import { SharedLayout } from './components/layout/SharedLayout';
import { ErrorLayout } from './components/layout/ErrorLayout';
import { ParticleNetworkBackground } from './components/auth/ParticleNetworkBackground';
import { UnauthorizedView } from './views/UnauthorizedView';
import { MaintenancePage } from './views/MaintenancePage';
import { NotFoundView } from './components/error/NotFoundView';
import { ServerErrorView } from './components/error/ServerErrorView';
import { NetworkErrorView } from './components/error/NetworkErrorView';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { NetworkStatusIndicator } from './components/common/NetworkStatusIndicator';
import { MobileWarningDialog } from './components/common/MobileWarningDialog';
import { RouteLoadingFallback } from './components/common/RouteLoadingFallback';
import { useAuthStore } from './store/auth';
import { authSettingsApi, authApi } from './lib/api';
import { usePublicSettings } from './hooks/usePublicSettings';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';

// Lazy load views for optimal bundle splitting
// Auth views
const LoginView = lazy(() => import('./views/LoginView').then(m => ({ default: m.LoginView })));
const RegisterView = lazy(() => import('./views/RegisterView').then(m => ({ default: m.RegisterView })));
const InitialSetupView = lazy(() => import('./views/InitialSetupView').then(m => ({ default: m.InitialSetupView })));

// Game browsing views
const HomeView = lazy(() => import('./views/HomeView').then(m => ({ default: m.HomeView })));
const BrowseView = lazy(() => import('./views/BrowseView').then(m => ({ default: m.BrowseView })));
const FlashGamesView = lazy(() => import('./views/FlashGamesView').then(m => ({ default: m.FlashGamesView })));
const HTML5GamesView = lazy(() => import('./views/HTML5GamesView').then(m => ({ default: m.HTML5GamesView })));
const AnimationsView = lazy(() => import('./views/AnimationsView').then(m => ({ default: m.AnimationsView })));
const GameDetailView = lazy(() => import('./views/GameDetailView').then(m => ({ default: m.GameDetailView })));
const GamePlayerView = lazy(() => import('./views/GamePlayerView').then(m => ({ default: m.GamePlayerView })));

// User feature views
const FavoritesView = lazy(() => import('./views/FavoritesView').then(m => ({ default: m.FavoritesView })));
const DashboardView = lazy(() => import('./views/DashboardView').then(m => ({ default: m.DashboardView })));
const PlaylistsView = lazy(() => import('./views/PlaylistsView').then(m => ({ default: m.PlaylistsView })));
const PlaylistDetailView = lazy(() => import('./views/PlaylistDetailView').then(m => ({ default: m.PlaylistDetailView })));
const UserPlaylistsView = lazy(() => import('./views/UserPlaylistsView').then(m => ({ default: m.UserPlaylistsView })));
const UserPlaylistDetailView = lazy(() => import('./views/UserPlaylistDetailView').then(m => ({ default: m.UserPlaylistDetailView })));
const SharedPlaylistView = lazy(() => import('./views/SharedPlaylistView').then(m => ({ default: m.SharedPlaylistView })));

// Admin views
const SettingsView = lazy(() => import('./views/SettingsView').then(m => ({ default: m.SettingsView })));
const JobsView = lazy(() => import('./views/JobsView').then(m => ({ default: m.JobsView })));
const UsersView = lazy(() => import('./views/UsersView').then(m => ({ default: m.UsersView })));
const RolesView = lazy(() => import('./views/RolesView').then(m => ({ default: m.RolesView })));
const ActivitiesView = lazy(() => import('./views/ActivitiesView').then(m => ({ default: m.ActivitiesView })));

function App() {
  const { isAuthenticated, isGuest, clearAuth, setGuestMode } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: publicSettings } = usePublicSettings();

  // Check if system needs initial setup (no users exist)
  const { data: setupStatus } = useQuery({
    queryKey: ['setupStatus'],
    queryFn: () => authApi.getSetupStatus(),
    refetchOnWindowFocus: false,
    staleTime: 60000 // Cache for 1 minute
  });

  // Check if guest access is enabled when user is in guest mode
  const { data: authSettings } = useQuery({
    queryKey: ['authSettings'],
    queryFn: () => authSettingsApi.get(),
    enabled: isGuest,
    refetchInterval: isGuest ? 30000 : false // Refetch every 30 seconds if guest
  });

  // Handle initial setup redirects
  useEffect(() => {
    const isSetupPage = location.pathname === '/setup';

    if (setupStatus?.needsSetup && !isSetupPage) {
      // System needs setup and user is not on setup page - redirect to setup
      navigate('/setup', { replace: true });
    } else if (!setupStatus?.needsSetup && isSetupPage) {
      // System doesn't need setup but user is on setup page - redirect to home
      navigate('/', { replace: true });
    }
  }, [setupStatus, location.pathname, navigate]);

  // Initialize guest mode for anonymous users
  // This allows them to view/play games from shared playlists even if guest access is OFF
  // Exclude auth pages (login, register, setup) from automatic guest initialization
  useEffect(() => {
    const isAuthPage = location.pathname === '/login' || location.pathname === '/register' || location.pathname === '/setup';

    if (isAuthPage && isGuest && !isAuthenticated) {
      // Clear guest mode when navigating to auth pages
      clearAuth();
    } else if (!isAuthenticated && !isGuest && !isAuthPage) {
      // Initialize guest mode for non-auth pages
      setGuestMode();
    }
  }, [isAuthenticated, isGuest, location.pathname, setGuestMode, clearAuth]);

  // Update browser title from site name in public settings
  useEffect(() => {
    // When fresh API data arrives, update title and cache it
    if (publicSettings?.app?.siteName) {
      document.title = publicSettings.app.siteName;
      localStorage.setItem('flashpoint-siteName', publicSettings.app.siteName);
    }
  }, [publicSettings]);

  // Redirect guest users if guest access is disabled
  // Shared playlist and game access (from shared playlists) is handled by ProtectedRoute with allowSharedAccess prop
  useEffect(() => {
    const pathname = location.pathname;
    const searchParams = new URLSearchParams(location.search);
    const hasShareToken = searchParams.has('shareToken');

    // Always allow shared playlist route (anonymous access)
    const isSharedPlaylistPath = pathname.startsWith('/playlists/shared/');

    // Allow game pages with shareToken (coming from shared playlists)
    const isGamePageWithShareToken = pathname.startsWith('/games/') && hasShareToken;

    if (isGuest && authSettings && !authSettings.guestAccessEnabled && !isSharedPlaylistPath && !isGamePageWithShareToken) {
      clearAuth();
      navigate('/login', { replace: true });
    }
  }, [isGuest, authSettings, location.pathname, location.search, clearAuth, navigate]);

  return (
    <ErrorBoundary>
      <TooltipProvider delayDuration={300}>
        <NetworkStatusIndicator />
        <MobileWarningDialog />
        <Toaster />
        <Routes>
          {/* ==================== PUBLIC LAYOUT ==================== */}
          <Route element={<PublicLayout background={<ParticleNetworkBackground />} />}>
            <Route path="/login" element={
              <Suspense fallback={<RouteLoadingFallback />}>
                <LoginView />
              </Suspense>
            } />
            <Route path="/setup" element={
              <Suspense fallback={<RouteLoadingFallback />}>
                <InitialSetupView />
              </Suspense>
            } />
          </Route>

          <Route element={<PublicLayout background={<ParticleNetworkBackground />} />}>
            <Route path="/register" element={
              <Suspense fallback={<RouteLoadingFallback />}>
                <RegisterView />
              </Suspense>
            } />
          </Route>

          {/* ==================== SHARED LAYOUT ==================== */}
          <Route element={<SharedLayout />}>
            <Route path="/playlists/shared/:shareToken" element={
              <Suspense fallback={<RouteLoadingFallback />}>
                <SharedPlaylistView />
              </Suspense>
            } />
            <Route path="/games/:id/shared" element={
              <ProtectedRoute requireAuth={false} allowSharedAccess={true}>
                <Suspense fallback={<RouteLoadingFallback />}>
                  <GameDetailView />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/games/:id/play-shared" element={
              <ProtectedRoute requirePermission="games.play" allowSharedAccess={true}>
                <Suspense fallback={<RouteLoadingFallback />}>
                  <GamePlayerView />
                </Suspense>
              </ProtectedRoute>
            } />
          </Route>

          {/* ==================== ERROR LAYOUT ==================== */}
          <Route element={<ErrorLayout />}>
            <Route path="/unauthorized" element={<UnauthorizedView />} />
            <Route path="/error/500" element={<ServerErrorView />} />
            <Route path="/error/network" element={<NetworkErrorView />} />
            <Route path="*" element={<NotFoundView />} />
            {import.meta.env.DEV && (
              <>
                <Route path="/_dev/404" element={<NotFoundView />} />
                <Route path="/_dev/500" element={<ServerErrorView />} />
                <Route path="/_dev/network" element={<NetworkErrorView />} />
                <Route path="/_dev/403" element={<UnauthorizedView />} />
              </>
            )}
          </Route>

          {/* ==================== STANDALONE ==================== */}
          <Route path="/maintenance" element={<MaintenancePage />} />

          {/* ==================== MAIN LAYOUT ==================== */}
          <Route element={<MainLayout />}>
            <Route path="/" element={
              <ProtectedRoute requireAuth={false}>
                <Suspense fallback={<RouteLoadingFallback />}>
                  <HomeView />
                </Suspense>
              </ProtectedRoute>
            } />

            {/* Public/guest accessible routes */}
            <Route path="/flash-games" element={
              <ProtectedRoute requireAuth={false}>
                <Suspense fallback={<RouteLoadingFallback />}>
                  <FlashGamesView />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/html5-games" element={
              <ProtectedRoute requireAuth={false}>
                <Suspense fallback={<RouteLoadingFallback />}>
                  <HTML5GamesView />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/browse" element={
              <ProtectedRoute requireAuth={false}>
                <Suspense fallback={<RouteLoadingFallback />}>
                  <BrowseView />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/animations" element={
              <ProtectedRoute requireAuth={false}>
                <Suspense fallback={<RouteLoadingFallback />}>
                  <AnimationsView />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/games/:id" element={
              <ProtectedRoute requireAuth={false} allowSharedAccess={true}>
                <Suspense fallback={<RouteLoadingFallback />}>
                  <GameDetailView />
                </Suspense>
              </ProtectedRoute>
            } />

            {/* Game player - normal authenticated access */}
            <Route path="/games/:id/play" element={
              <ProtectedRoute requirePermission="games.play">
                <Suspense fallback={<RouteLoadingFallback />}>
                  <GamePlayerView />
                </Suspense>
              </ProtectedRoute>
            } />

            {/* Protected routes - require authentication */}
            <Route path="/dashboard" element={
              <ProtectedRoute requireFeature="enableStatistics">
                <Suspense fallback={<RouteLoadingFallback />}>
                  <DashboardView />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/favorites" element={
              <ProtectedRoute requireFeature="enableFavorites">
                <Suspense fallback={<RouteLoadingFallback />}>
                  <FavoritesView />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/playlists" element={
              <ProtectedRoute requireFeature="enablePlaylists">
                <Suspense fallback={<RouteLoadingFallback />}>
                  <UserPlaylistsView />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/playlists/:id" element={
              <ProtectedRoute requireFeature="enablePlaylists">
                <Suspense fallback={<RouteLoadingFallback />}>
                  <UserPlaylistDetailView />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/flashpoint-playlists" element={
              <ProtectedRoute requireFeature="enablePlaylists">
                <Suspense fallback={<RouteLoadingFallback />}>
                  <PlaylistsView />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/flashpoint-playlists/:id" element={
              <ProtectedRoute requireFeature="enablePlaylists">
                <Suspense fallback={<RouteLoadingFallback />}>
                  <PlaylistDetailView />
                </Suspense>
              </ProtectedRoute>
            } />

            {/* User management routes */}
            <Route path="/users" element={
              <ProtectedRoute requirePermission="users.read">
                <Suspense fallback={<RouteLoadingFallback />}>
                  <UsersView />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/roles" element={
              <ProtectedRoute requirePermission="roles.read">
                <Suspense fallback={<RouteLoadingFallback />}>
                  <RolesView />
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/activities" element={
              <ProtectedRoute requirePermission="activities.read" requireFeature="enableStatistics">
                <Suspense fallback={<RouteLoadingFallback />}>
                  <ActivitiesView />
                </Suspense>
              </ProtectedRoute>
            } />

            {/* Jobs */}
            <Route path="/jobs" element={
              <ProtectedRoute requirePermission="settings.update">
                <Suspense fallback={<RouteLoadingFallback />}>
                  <JobsView />
                </Suspense>
              </ProtectedRoute>
            } />

            {/* Settings */}
            <Route path="/settings" element={
              <ProtectedRoute>
                <Suspense fallback={<RouteLoadingFallback />}>
                  <SettingsView />
                </Suspense>
              </ProtectedRoute>
            } />
          </Route>
        </Routes>
      </TooltipProvider>
    </ErrorBoundary>
  );
}

export default App;
