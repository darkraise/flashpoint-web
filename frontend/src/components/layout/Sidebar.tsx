import { Link, useLocation } from 'react-router-dom';
import { List as ListIcon, Settings, Heart, Gamepad2, Film, Users, Shield, Activity, BarChart3 } from 'lucide-react';
import { useUIStore } from '@/store/ui';
import { useAuthStore } from '@/store/auth';
import { RoleGuard } from '../common/RoleGuard';
import { useEffect } from 'react';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib';

interface SidebarProps {
  isOpen: boolean;
}

interface NavItem {
  path: string;
  icon?: any;
  iconImage?: string;
  label: string;
}

export function Sidebar({ isOpen }: SidebarProps) {
  const location = useLocation();
  const setSidebarOpen = useUIStore((state) => state.setSidebarOpen);
  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);
  const isGuest = useAuthStore((state) => state.isGuest);

  // Add swipe gesture support for mobile
  const sidebarRef = useSwipeGesture<HTMLElement>({
    onSwipeLeft: () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      }
    },
    minSwipeDistance: 50
  });

  const gameNavItems: NavItem[] = [
    { path: '/flash-games', iconImage: '/images/Flash.png', label: 'Flash Games' },
    { path: '/html5-games', iconImage: '/images/HTML5.png', label: 'HTML5 Games' },
    { path: '/animations', icon: Film, label: 'Animations' },
    { path: '/browse', icon: Gamepad2, label: 'Browse' },
  ];

  const libraryNavItems: NavItem[] = [
    { path: '/favorites', icon: Heart, label: 'Favorites' },
    { path: '/playlists', icon: ListIcon, label: 'Playlists' },
  ];

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

  // Check if nav item is active
  const isNavItemActive = (item: NavItem) => {
    const itemPath = item.path.split('?')[0];
    const itemQuery = item.path.split('?')[1];

    if (itemQuery) {
      const pathMatch = location.pathname === itemPath && location.search === `?${itemQuery}`;
      return pathMatch;
    }

    // Home page (/) should highlight Flash Games
    if (location.pathname === '/' && itemPath === '/flash-games') {
      return true;
    }

    return location.pathname === itemPath;
  };

  return (
    <>
      {/* Mobile overlay backdrop - only show when open on mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm"
          onClick={handleBackdropClick}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        className={cn(
          'bg-card border-r flex flex-col overflow-hidden',
          sidebarCollapsed ? 'w-16' : 'w-64',
          // Mobile: fixed positioning with slide-in animation
          'lg:relative fixed inset-y-0 left-0 z-40',
          'transition-all duration-500 ease-in-out',
          'lg:translate-x-0', // Always visible on desktop
          isOpen ? 'translate-x-0' : '-translate-x-full' // Slide in/out on mobile
        )}
      >
        {/* Main Navigation */}
        <ScrollArea className={cn("flex-1 py-4 transition-all duration-500", sidebarCollapsed ? "px-2" : "px-4")}>
          {/* Game Navigation */}
          <div className="space-y-1">
            {gameNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = isNavItemActive(item);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex items-center rounded-lg transition-all duration-300 overflow-hidden',
                    sidebarCollapsed ? 'w-10 h-10 justify-center' : 'px-3 py-2 gap-3',
                    isActive
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'
                  )}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  {item.iconImage ? (
                    <img
                      src={item.iconImage}
                      alt={item.label}
                      className="w-5 h-5 object-contain flex-shrink-0"
                    />
                  ) : Icon ? (
                    <Icon size={20} className="flex-shrink-0" />
                  ) : null}
                  {!sidebarCollapsed && (
                    <span className="transition-opacity duration-300 opacity-100 whitespace-nowrap">
                      {item.label}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Library Navigation - Hidden for guests */}
          {!isGuest && (
            <>
              <Separator className="my-3" />
              <div className="space-y-1">
                {libraryNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = isNavItemActive(item);

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={cn(
                        'flex items-center rounded-lg transition-all duration-300 overflow-hidden',
                        sidebarCollapsed ? 'w-10 h-10 justify-center' : 'px-3 py-2 gap-3',
                        isActive
                          ? 'bg-primary/10 text-primary border border-primary/20'
                          : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'
                      )}
                      title={sidebarCollapsed ? item.label : undefined}
                    >
                      {item.iconImage ? (
                        <img
                          src={item.iconImage}
                          alt={item.label}
                          className="w-5 h-5 object-contain flex-shrink-0"
                        />
                      ) : Icon ? (
                        <Icon size={20} className="flex-shrink-0" />
                      ) : null}
                      {!sidebarCollapsed && (
                        <span className="transition-opacity duration-300 opacity-100 whitespace-nowrap">
                          {item.label}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </>
          )}

          {/* Admin/Management Section */}
          <RoleGuard permissions={['users.read', 'roles.read', 'activities.read']}>
            <Separator className="my-3" />
            <div className="space-y-1">
              {!sidebarCollapsed && (
                <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Management
                </div>
              )}

              <RoleGuard permission="users.read">
                <Link
                  to="/users"
                  className={cn(
                    'flex items-center rounded-lg transition-all duration-300 overflow-hidden',
                    sidebarCollapsed ? 'w-10 h-10 justify-center' : 'px-3 py-2 gap-3',
                    location.pathname === '/users'
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'
                  )}
                  title={sidebarCollapsed ? 'Users' : undefined}
                >
                  <Users size={20} className="flex-shrink-0" />
                  {!sidebarCollapsed && (
                    <span className="transition-opacity duration-300 opacity-100 whitespace-nowrap">
                      Users
                    </span>
                  )}
                </Link>
              </RoleGuard>

              <RoleGuard permission="roles.read">
                <Link
                  to="/roles"
                  className={cn(
                    'flex items-center rounded-lg transition-all duration-300 overflow-hidden',
                    sidebarCollapsed ? 'w-10 h-10 justify-center' : 'px-3 py-2 gap-3',
                    location.pathname === '/roles'
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'
                  )}
                  title={sidebarCollapsed ? 'Roles' : undefined}
                >
                  <Shield size={20} className="flex-shrink-0" />
                  {!sidebarCollapsed && (
                    <span className="transition-opacity duration-300 opacity-100 whitespace-nowrap">
                      Roles
                    </span>
                  )}
                </Link>
              </RoleGuard>

              <RoleGuard permission="activities.read">
                <Link
                  to="/activities"
                  className={cn(
                    'flex items-center rounded-lg transition-all duration-300 overflow-hidden',
                    sidebarCollapsed ? 'w-10 h-10 justify-center' : 'px-3 py-2 gap-3',
                    location.pathname === '/activities'
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'
                  )}
                  title={sidebarCollapsed ? 'Activity Logs' : undefined}
                >
                  <Activity size={20} className="flex-shrink-0" />
                  {!sidebarCollapsed && (
                    <span className="transition-opacity duration-300 opacity-100 whitespace-nowrap">
                      Activity Logs
                    </span>
                  )}
                </Link>
              </RoleGuard>
            </div>
          </RoleGuard>
        </ScrollArea>

        {/* Dashboard & Settings at Bottom - Hidden for guests */}
        {!isGuest && (
          <div className={cn("border-t space-y-1 transition-all duration-500", sidebarCollapsed ? "p-2" : "p-4")}>
            <Link
              to="/dashboard"
              className={cn(
                'flex items-center rounded-lg transition-all duration-300 overflow-hidden',
                sidebarCollapsed ? 'w-10 h-10 justify-center' : 'px-3 py-2 gap-3',
                location.pathname === '/dashboard'
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'
              )}
              title={sidebarCollapsed ? 'Dashboard' : undefined}
            >
              <BarChart3 size={20} className="flex-shrink-0" />
              {!sidebarCollapsed && (
                <span className="transition-opacity duration-300 opacity-100 whitespace-nowrap">
                  Dashboard
                </span>
              )}
            </Link>
            <Link
              to="/settings"
              className={cn(
                'flex items-center rounded-lg transition-all duration-300 overflow-hidden',
                sidebarCollapsed ? 'w-10 h-10 justify-center' : 'px-3 py-2 gap-3',
                location.pathname === '/settings'
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'
              )}
              title={sidebarCollapsed ? 'Settings' : undefined}
            >
              <Settings size={20} className="flex-shrink-0" />
              {!sidebarCollapsed && (
                <span className="transition-opacity duration-300 opacity-100 whitespace-nowrap">
                  Settings
                </span>
              )}
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
