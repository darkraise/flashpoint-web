import type { BreadcrumbContext } from '@/components/common/Breadcrumbs';

/**
 * Icon configuration - either an image path or a Lucide icon name
 */
export interface SectionIcon {
  type: 'image' | 'lucide';
  value: string; // Image path or Lucide icon name
}

/**
 * Section configuration for game routes
 */
export interface SectionConfig {
  /** URL prefix for game routes (e.g., '/flash') */
  prefix: string;
  /** Sidebar item path (e.g., '/flash') */
  sidebarPath: string;
  /** Label for breadcrumbs */
  breadcrumbLabel: string;
  /** Href for breadcrumb link back to section */
  breadcrumbHref: string;
  /** Icon for the section */
  icon: SectionIcon;
}

/**
 * Section configurations keyed by section identifier
 */
export const SECTION_CONFIGS: Record<string, SectionConfig> = {
  flash: {
    prefix: '/flash',
    sidebarPath: '/flash',
    breadcrumbLabel: 'Flash Games',
    breadcrumbHref: '/flash',
    icon: { type: 'image', value: '/images/Flash.png' },
  },
  html5: {
    prefix: '/html5',
    sidebarPath: '/html5',
    breadcrumbLabel: 'HTML5 Games',
    breadcrumbHref: '/html5',
    icon: { type: 'image', value: '/images/HTML5.png' },
  },
  animations: {
    prefix: '/animations',
    sidebarPath: '/animations',
    breadcrumbLabel: 'Animations',
    breadcrumbHref: '/animations',
    icon: { type: 'lucide', value: 'Film' },
  },
  browse: {
    prefix: '/browse',
    sidebarPath: '/browse',
    breadcrumbLabel: 'Browse',
    breadcrumbHref: '/browse',
    icon: { type: 'lucide', value: 'Gamepad2' },
  },
};

/**
 * Map of sidebar paths to URL prefixes for active state detection
 * Used by SidebarItem to determine if a section-based game route
 * should highlight the corresponding sidebar item
 */
export const SIDEBAR_PREFIX_MAP: Record<string, readonly string[]> = {
  '/flash': ['/flash/'],
  '/html5': ['/html5/'],
  '/animations': ['/animations/'],
  '/browse': ['/browse/', '/games/'], // /games/ falls back to browse section
};

/**
 * Get section configuration from a URL pathname
 * @param pathname - Current URL pathname (e.g., '/flash/abc-123')
 * @returns Section config if pathname matches a section route, null otherwise
 */
export function getSectionFromPath(pathname: string): SectionConfig | null {
  for (const config of Object.values(SECTION_CONFIGS)) {
    if (pathname.startsWith(`${config.prefix}/`)) {
      return config;
    }
  }
  return null;
}

/**
 * Get section key from a URL pathname
 * @param pathname - Current URL pathname (e.g., '/flash/abc-123')
 * @returns Section key ('flash', 'html5', etc.) or null
 */
export function getSectionKeyFromPath(pathname: string): string | null {
  for (const [key, config] of Object.entries(SECTION_CONFIGS)) {
    if (pathname.startsWith(`${config.prefix}/`)) {
      return key;
    }
  }
  return null;
}

/**
 * Build a section-based game URL
 * @param gameId - Game UUID
 * @param sectionKey - Section key ('flash', 'html5', 'animations', 'browse') or null
 * @param isPlay - Whether this is a play URL (adds '/play' suffix)
 * @returns URL string (e.g., '/flash/abc-123' or '/flash/abc-123/play')
 */
export function buildSectionGameUrl(
  gameId: string,
  sectionKey: string | null | undefined,
  isPlay: boolean = false
): string {
  const suffix = isPlay ? '/play' : '';
  const config = sectionKey ? SECTION_CONFIGS[sectionKey] : null;

  if (config) {
    return `${config.prefix}/${gameId}${suffix}`;
  }

  // Fallback to legacy route
  return `/games/${gameId}${suffix}`;
}

/**
 * Derive breadcrumb context from a URL pathname
 * @param pathname - Current URL pathname (e.g., '/flash/abc-123')
 * @returns BreadcrumbContext if pathname matches a section route, null otherwise
 */
export function getBreadcrumbContextFromPath(pathname: string): BreadcrumbContext | null {
  const section = getSectionFromPath(pathname);
  if (section) {
    return {
      label: section.breadcrumbLabel,
      href: section.breadcrumbHref,
      icon: section.icon,
    };
  }
  return null;
}

/**
 * Default breadcrumb context when no section can be determined
 */
export const DEFAULT_BREADCRUMB_CONTEXT: BreadcrumbContext = {
  label: 'Browse',
  href: '/browse',
  icon: SECTION_CONFIGS.browse.icon,
};
