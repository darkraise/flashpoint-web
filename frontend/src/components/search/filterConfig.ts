import { Gamepad2, Tv, User, Building2, Users, Globe, Tag, type LucideIcon } from 'lucide-react';
import type { GameFilters } from '@/types/game';

export interface FilterConfig {
  id: string; // 'platform', 'series', etc.
  label: string; // 'Platform', 'Series', etc.
  icon: LucideIcon;
  paramKey: keyof GameFilters; // URL param key
  optionsKey:
    | 'platforms'
    | 'series'
    | 'developers'
    | 'publishers'
    | 'playModes'
    | 'languages'
    | 'tags'; // Key in filterOptions response
  placeholder?: string;
  emptyMessage?: string;
  badgeLabel: string; // Plural form for badges ("Platforms", "Tags", etc.)
  /** Category name used in filter order tracking (must match FilterChips category) */
  categoryName: string;
}

export const FILTER_CONFIGS: FilterConfig[] = [
  {
    id: 'platform',
    label: 'Platform',
    icon: Gamepad2,
    paramKey: 'platform',
    optionsKey: 'platforms',
    emptyMessage: 'No platforms available',
    badgeLabel: 'Platforms',
    categoryName: 'Platform',
  },
  {
    id: 'series',
    label: 'Series',
    icon: Tv,
    paramKey: 'series',
    optionsKey: 'series',
    emptyMessage: 'No series available',
    badgeLabel: 'Series',
    categoryName: 'Series',
  },
  {
    id: 'developer',
    label: 'Developer',
    icon: User,
    paramKey: 'developers',
    optionsKey: 'developers',
    emptyMessage: 'No developers available',
    badgeLabel: 'Developers',
    categoryName: 'Developer',
  },
  {
    id: 'publisher',
    label: 'Publisher',
    icon: Building2,
    paramKey: 'publishers',
    optionsKey: 'publishers',
    emptyMessage: 'No publishers available',
    badgeLabel: 'Publishers',
    categoryName: 'Publisher',
  },
  {
    id: 'playMode',
    label: 'Play Mode',
    icon: Users,
    paramKey: 'playModes',
    optionsKey: 'playModes',
    emptyMessage: 'No play modes available',
    badgeLabel: 'Play Modes',
    categoryName: 'Play Mode',
  },
  {
    id: 'language',
    label: 'Language',
    icon: Globe,
    paramKey: 'languages',
    optionsKey: 'languages',
    emptyMessage: 'No languages available',
    badgeLabel: 'Languages',
    categoryName: 'Language',
  },
  {
    id: 'tag',
    label: 'Tag',
    icon: Tag,
    paramKey: 'tags',
    optionsKey: 'tags',
    emptyMessage: 'No tags available',
    badgeLabel: 'Tags',
    categoryName: 'Tag',
  },
];
