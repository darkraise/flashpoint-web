import { Link } from "react-router-dom";
import { logger } from '@/lib/logger';
import { Menu, User, LogOut } from "lucide-react";
import { useUIStore } from "@/store/ui";
import { useAuthStore } from "@/store/auth";
import { useAuth } from "@/contexts/AuthContext";
import { usePublicSettings } from "@/hooks/usePublicSettings";
import { SearchBar } from "../search/SearchBar";
import { ThemePicker } from "../theme/ThemePicker";
import { GitHubButton } from "../github/GitHubButton";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export function Header() {
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const toggleSidebarCollapsed = useUIStore(
    (state) => state.toggleSidebarCollapsed,
  );
  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);
  const { isAuthenticated, isGuest, user } = useAuthStore();
  const { logout } = useAuth();
  const { data: publicSettings } = usePublicSettings();

  // Get site name from settings or use default
  // Public settings are grouped by category: { app: { siteName: "..." }, auth: { ... } }
  const siteName = publicSettings?.app?.siteName || "Flashpoint Archive";

  // On mobile, always show site name. On desktop, hide when sidebar is collapsed.
  const isMobile = typeof window !== "undefined" && window.innerWidth < 1024;
  const effectiveCollapsed = isMobile ? false : sidebarCollapsed;

  // Handle menu button click - different behavior for mobile vs desktop
  const handleMenuClick = () => {
    // On mobile (<1024px): toggle sidebar open/closed
    // On desktop (>=1024px): toggle sidebar collapsed (icon-only vs icon+label)
    if (window.innerWidth < 1024) {
      toggleSidebar();
    } else {
      toggleSidebarCollapsed();
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      logger.error("Logout error:", error);
    }
  };

  const getUserInitials = (username: string) => {
    return username.slice(0, 2).toUpperCase();
  };

  const getRoleBadgeVariant = (role: string) => {
    if (role === "admin") return "default";
    if (role === "user") return "secondary";
    return "outline";
  };

  return (
    <header className="border-b bg-card">
      <div className="pr-4 py-3">
        <div className="flex items-center justify-between gap-4 w-full">
          {/* Left: Logo, Title, then Hamburger */}
          <div className="flex items-center gap-3 flex-shrink-0 min-w-0">
            <Link
              to="/"
              className="flex items-center hover:opacity-80 transition-opacity min-w-0 ml-4"
              title={`${siteName} - Home`}
            >
              <img
                src="/images/logo.png"
                alt={siteName}
                className="h-8 w-auto object-contain flex-shrink-0"
              />
              <div
                className="overflow-hidden hidden sm:block"
                style={{
                  maxWidth: effectiveCollapsed ? 0 : "24rem",
                  opacity: effectiveCollapsed ? 0 : 1,
                  transition: isMobile
                    ? undefined
                    : "max-width 500ms ease-out, opacity 500ms ease-out",
                }}
              >
                <span className="text-xl font-bold whitespace-nowrap ml-2">
                  {siteName}
                </span>
              </div>
            </Link>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleMenuClick}
              aria-label="Toggle sidebar"
              title={
                window.innerWidth < 1024
                  ? "Toggle sidebar"
                  : "Toggle sidebar width"
              }
            >
              <Menu size={20} />
            </Button>
          </div>

          {/* Center: Search Bar (Desktop only) */}
          <div className="flex-1 max-w-2xl mx-auto hidden md:block">
            <SearchBar />
          </div>

          {/* Right: GitHub, Theme Settings & User Menu */}
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            {/* GitHub Star Button */}
            <GitHubButton />

            {/* Theme Settings (mode + color) - For all users */}
            <ThemePicker />

            {(isAuthenticated || isGuest) && user ? (
              <div className="relative bg-primary/10 rounded-lg">
                {/* Guest Mode - Show guest badge + Login button */}
                {isGuest ? (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted">
                      <User size={16} className="text-muted-foreground" />
                      <span className="text-sm hidden sm:block">
                        {user.username}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {user.role}
                      </Badge>
                    </div>
                    <Button asChild size="sm">
                      <Link to="/login">Login</Link>
                    </Button>
                  </div>
                ) : (
                  /* Authenticated User - Full menu with logout */
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="flex items-center gap-2"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {getUserInitials(user.username)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm hidden sm:block">
                          {user.username}
                        </span>
                        <Badge
                          variant={getRoleBadgeVariant(user.role)}
                          className="text-xs"
                        >
                          {user.role}
                        </Badge>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>
                        <div>
                          <p className="text-sm font-medium">{user.username}</p>
                          <p className="text-xs text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/login">Login</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link to="/register">Register</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Search Bar (below main header) */}
      <div className="md:hidden px-4 pb-3">
        <SearchBar />
      </div>
    </header>
  );
}
