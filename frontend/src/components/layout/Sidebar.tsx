import { useLocation } from 'react-router-dom';
import {
  List as ListIcon,
  ListVideo,
  Settings,
  Heart,
  Gamepad2,
  Film,
  Users,
  Shield,
  Activity,
  BarChart3,
  Clock,
  Home,
  LucideIcon,
} from 'lucide-react';
import { useUIStore } from '@/store/ui';
import { useAuthStore } from '@/store/auth';
import { RoleGuard } from '../common/RoleGuard';
import { useEffect } from 'react';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib';
import { SidebarItem } from './SidebarItem';
import { SidebarSection } from './SidebarSection';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { usePublicSettings } from '@/hooks/usePublicSettings';

interface SidebarProps {
  isOpen: boolean;
}

interface NavItem {
  path: string;
  icon?: LucideIcon;
  iconImage?: string;
  label: string;
  permission?: string;
}

export function Sidebar({ isOpen }: SidebarProps) {
  const location = useLocation();
  const setSidebarOpen = useUIStore((state) => state.setSidebarOpen);
  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);
  const isGuest = useAuthStore((state) => state.isGuest);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { enablePlaylists, enableFavorites, enableStatistics } = useFeatureFlags();
  const { data: publicSettings } = usePublicSettings();

  // Check if viewing a shared playlist as an anonymous user with guest access OFF
  const isViewingSharedPlaylistWithoutGuestAccess =
    !isAuthenticated &&
    location.pathname.startsWith('/playlists/shared/') &&
    publicSettings?.auth?.guestAccessEnabled === false;

  // On mobile, always show labels (never collapse). On desktop, respect sidebarCollapsed state.
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
  const effectiveCollapsed = isMobile ? false : sidebarCollapsed;

  // Add swipe gesture support for mobile
  const sidebarRef = useSwipeGesture<HTMLElement>({
    onSwipeLeft: () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      }
    },
    minSwipeDistance: 50,
  });

  const gameNavItems: NavItem[] = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/flash-games', iconImage: '/images/Flash.png', label: 'Flash Games' },
    { path: '/html5-games', iconImage: '/images/HTML5.png', label: 'HTML5 Games' },
    { path: '/animations', icon: Film, label: 'Animations' },
    { path: '/browse', icon: Gamepad2, label: 'Browse' },
  ];

  const libraryNavItems: NavItem[] = [
    enableFavorites && { path: '/favorites', icon: Heart, label: 'Favorites' },
    enablePlaylists && { path: '/playlists', icon: ListVideo, label: 'My Playlists' },
    enablePlaylists && {
      path: '/flashpoint-playlists',
      icon: ListIcon,
      label: 'Flashpoint Playlists',
    },
  ].filter(Boolean) as NavItem[];

  const managementNavItems: NavItem[] = [
    { path: '/users', icon: Users, label: 'Users', permission: 'users.read' },
    { path: '/roles', icon: Shield, label: 'Roles', permission: 'roles.read' },
    enableStatistics && {
      path: '/activities',
      icon: Activity,
      label: 'Activity Logs',
      permission: 'activities.read',
    },
  ].filter(Boolean) as NavItem[];

  const bottomNavItems: NavItem[] = [
    enableStatistics && { path: '/dashboard', icon: BarChart3, label: 'Dashboard' },
    { path: '/jobs', icon: Clock, label: 'Jobs', permission: 'settings.update' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ].filter(Boolean) as NavItem[];

  // Close sidebar on mobile when route changes
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, [location.pathname, setSidebarOpen]);

  // Close sidebar when clicking outside on mobile
  const handleBackdropClick = () => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  // Close sidebar on mobile after clicking a link
  const handleNavItemClick = () => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  return (
    <>
      {/* Mobile overlay backdrop - only show when open on mobile */}
      <div
        className={cn(
          'fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm transition-opacity duration-300 ease-out',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside
        id="navigation"
        ref={sidebarRef}
        className={cn(
          'bg-card border-r flex flex-col overflow-hidden',
          // Mobile: fixed positioning with slide-in animation
          'lg:relative fixed inset-y-0 left-0 z-40',
          'lg:translate-x-0', // Always visible on desktop
          isOpen ? 'translate-x-0' : '-translate-x-full' // Slide in/out on mobile
        )}
        style={{
          width: effectiveCollapsed ? '4rem' : '16rem',
          transition: isMobile ? 'transform 300ms ease-out' : 'width 500ms ease-out',
        }}
        aria-label="Main navigation"
      >
        {/* Main Navigation */}
        <ScrollArea
          className="flex-1 py-4"
          style={{
            paddingLeft: effectiveCollapsed ? '0.5rem' : '1rem',
            paddingRight: effectiveCollapsed ? '0.5rem' : '1rem',
            transition: isMobile ? undefined : 'padding 500ms ease-out',
          }}
        >
          {/* Game Navigation - Hidden when viewing shared playlist without guest access */}
          {!isViewingSharedPlaylistWithoutGuestAccess ? (
            <div className="space-y-1">
              {gameNavItems.map((item) => (
                <SidebarItem
                  key={item.path}
                  {...item}
                  collapsed={effectiveCollapsed}
                  onClick={handleNavItemClick}
                />
              ))}
            </div>
          ) : null}

          {/* Library Navigation - Hidden for guests and when no library features are enabled */}
          {!isGuest && libraryNavItems.length > 0 ? (
            <SidebarSection collapsed={effectiveCollapsed}>
              {libraryNavItems.map((item) => (
                <SidebarItem
                  key={item.path}
                  {...item}
                  collapsed={effectiveCollapsed}
                  onClick={handleNavItemClick}
                />
              ))}
            </SidebarSection>
          ) : null}

          {/* Admin/Management Section */}
          <RoleGuard permissions={['users.read', 'roles.read', 'activities.read']}>
            <SidebarSection title="Management" collapsed={effectiveCollapsed}>
              {managementNavItems.map((item) => (
                <RoleGuard key={item.path} permission={item.permission}>
                  <SidebarItem
                    {...item}
                    collapsed={effectiveCollapsed}
                    onClick={handleNavItemClick}
                  />
                </RoleGuard>
              ))}
            </SidebarSection>
          </RoleGuard>
        </ScrollArea>

        {/* Dashboard & Settings at Bottom - Hidden for guests */}
        {!isGuest ? (
          <div
            className="border-t space-y-1"
            style={{
              padding: effectiveCollapsed ? '0.5rem' : '1rem',
              transition: isMobile ? undefined : 'padding 500ms ease-out',
            }}
          >
            {bottomNavItems.map((item) =>
              item.permission ? (
                <RoleGuard key={item.path} permission={item.permission}>
                  <SidebarItem
                    {...item}
                    collapsed={effectiveCollapsed}
                    onClick={handleNavItemClick}
                  />
                </RoleGuard>
              ) : (
                <SidebarItem
                  key={item.path}
                  {...item}
                  collapsed={effectiveCollapsed}
                  onClick={handleNavItemClick}
                />
              )
            )}
          </div>
        ) : null}
      </aside>
    </>
  );
}
