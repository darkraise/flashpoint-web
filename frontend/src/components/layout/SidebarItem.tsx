import { Link, useLocation } from "react-router-dom";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib";

interface SidebarItemProps {
  path: string;
  icon?: LucideIcon;
  iconImage?: string;
  label: string;
  collapsed?: boolean;
  onClick?: () => void;
}

export function SidebarItem({
  path,
  icon: Icon,
  iconImage,
  label,
  collapsed = false,
  onClick,
}: SidebarItemProps) {
  const location = useLocation();

  // Detect mobile for conditional animations
  const isMobile = typeof window !== "undefined" && window.innerWidth < 1024;

  // Check if this item is active
  const isActive = (() => {
    const itemPath = path.split("?")[0];
    const itemQuery = path.split("?")[1];

    if (itemQuery) {
      return (
        location.pathname === itemPath && location.search === `?${itemQuery}`
      );
    }

    // Home page (/) should highlight Flash Games
    if (location.pathname === "/" && itemPath === "/flash-games") {
      return true;
    }

    return location.pathname === itemPath;
  })();

  return (
    <Link
      to={path}
      onClick={onClick}
      className={cn(
        "flex items-center rounded-lg overflow-hidden border",
        collapsed ? "justify-center" : "",
        isActive
          ? "bg-primary/10 text-primary border-primary/20"
          : "hover:bg-accent hover:text-primary/80 text-foreground border-transparent",
      )}
      title={collapsed ? label : undefined}
      style={{
        width: collapsed ? "2.5rem" : "auto",
        height: collapsed ? "2.5rem" : "auto",
        padding: collapsed ? "0" : "0.5rem 0.75rem",
        gap: collapsed ? "0" : "0.75rem",
        transition: isMobile
          ? undefined
          : "width 500ms ease-out, height 500ms ease-out, padding 500ms ease-out, gap 500ms ease-out",
      }}
    >
      {iconImage ? (
        <img
          src={iconImage}
          alt={label}
          className="w-5 h-5 object-contain flex-shrink-0"
        />
      ) : Icon ? (
        <Icon size={20} className="flex-shrink-0" />
      ) : null}
      <span
        className="whitespace-nowrap"
        style={{
          opacity: collapsed ? 0 : 1,
          width: collapsed ? 0 : "auto",
          overflow: "hidden",
          pointerEvents: collapsed ? "none" : "auto",
          transition: isMobile
            ? undefined
            : "opacity 500ms ease-out, width 500ms ease-out",
        }}
      >
        {label}
      </span>
    </Link>
  );
}
