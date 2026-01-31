export interface Game {
  id: string;
  parentGameId?: string;
  title: string;
  alternateTitles?: string;
  series?: string;
  developer: string;
  publisher: string;
  platformName?: string;
  platformsStr?: string;
  platformId?: number;
  playMode?: string;
  status?: string;
  broken?: boolean;
  extreme?: boolean;
  notes?: string;
  tagsStr?: string;
  source?: string;
  applicationPath?: string;
  launchCommand?: string;
  releaseDate?: string;
  version?: string;
  originalDescription?: string;
  language?: string;
  library: string;
  orderTitle: string;
  dateAdded?: string;
  dateModified?: string;
  presentOnDisk?: number | null; // From game_data table: null = no data needed, 0 = needs download, 1 = downloaded
  lastPlayed?: string;
  playtime?: number;
  playCounter?: number;
  archiveState?: number;
  logoPath?: string;
  screenshotPath?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface GameFilters {
  search?: string;
  platform?: string;
  series?: string;        // Comma-separated series
  developers?: string;    // Comma-separated developers
  publishers?: string;    // Comma-separated publishers
  playModes?: string;     // Comma-separated play modes
  languages?: string;     // Comma-separated languages
  library?: string;
  tags?: string;
  yearFrom?: number;
  yearTo?: number;
  dateAddedSince?: string;      // ISO 8601 timestamp - filter games added after this date
  dateModifiedSince?: string;   // ISO 8601 timestamp - filter games modified after this date
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface FilterOptions {
  series: Array<{ name: string; count: number }>;
  developers: Array<{ name: string; count: number }>;
  publishers: Array<{ name: string; count: number }>;
  playModes: Array<{ name: string; count: number }>;
  languages: Array<{ name: string; count: number }>;
  tags: Array<{ name: string; count: number }>;
  platforms: Array<{ name: string; count: number }>;
  yearRange: { min: number; max: number };
}

export interface Playlist {
  id: string;
  title: string;
  description?: string;
  author?: string;
  library?: string;
  icon?: string;
  games?: Game[];
  gameIds?: string[];
}

export interface GameLaunchData {
  gameId: string;
  title: string;
  platform?: string;
  launchCommand: string;
  contentUrl: string;
  applicationPath?: string;
  playMode?: string;
  canPlayInBrowser: boolean;
}
