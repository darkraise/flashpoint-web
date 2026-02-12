/**
 * Database Row Types
 *
 * Type definitions for database row structures.
 * These types represent the raw data structure returned from SQLite queries.
 */

/**
 * Play session database row
 */
export interface PlaySessionRow {
  id: number;
  user_id: number;
  game_id: string;
  game_title: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  session_id: string;
}

/**
 * Game statistics database row
 */
export interface GameStatsRow {
  game_id: string;
  game_title: string;
  total_plays: number;
  total_playtime_seconds: number;
  first_played_at: string;
  last_played_at: string;
}

/**
 * Playlist database row
 */
export interface PlaylistRow {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  game_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Activity log database row
 */
export interface ActivityRow {
  id: number;
  user_id: number | null;
  username: string | null;
  action: string;
  resource: string | null;
  resource_id: string | null;
  details: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

/**
 * User statistics row
 */
export interface UserStatsRow {
  user_id: number;
  username: string;
  total_playtime_seconds: number;
  total_sessions: number;
  total_games_played: number;
  first_played_at: string | null;
  last_played_at: string | null;
}

/**
 * User favorite database row
 */
export interface FavoriteRow {
  id: number;
  user_id: number;
  game_id: string;
  added_at: string;
}

/**
 * Game data row from Flashpoint database
 */
export interface GameRow {
  id: string;
  title: string;
  platform: string;
  library: string;
  developer: string | null;
  publisher: string | null;
  release_date: string | null;
  version: string | null;
  status: string | null;
  notes: string | null;
  source: string | null;
  launch_command: string | null;
  tags_str: string | null;
  extreme: number;
  play_mode: string | null;
  application_path: string | null;
}

/**
 * Playlist game entry row
 */
export interface PlaylistGameRow {
  id: number;
  playlist_id: number;
  game_id: string;
  order_index: number;
  notes: string | null;
  added_at: string;
}

/**
 * User role assignment row
 */
export interface UserRoleRow {
  user_id: number;
  role_id: number;
}

/**
 * Role database row
 */
export interface RoleRow {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Permission database row
 */
export interface PermissionRow {
  id: number;
  name: string;
  resource: string;
  action: string;
  description: string | null;
}

/**
 * Job status database row
 */
export interface JobStatusRow {
  id: string;
  name: string;
  enabled: number;
  cron_schedule: string;
  last_run_at: string | null;
  last_run_status: string | null;
  last_run_error: string | null;
  next_run_at: string | null;
  run_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Playtime activity aggregation row
 */
export interface PlaytimeActivityRow {
  date: string;
  total_playtime: number | null;
  session_count: number;
}

/**
 * Distribution data row
 */
export interface DistributionRow {
  game_title: string;
  total_playtime_seconds: number;
}

/**
 * Activity breakdown aggregation row - User breakdown
 */
export interface UserBreakdownRow {
  key: string | null;
  userId: number;
  count: number;
  lastActivity: string;
  topAction: string;
}

/**
 * Activity breakdown aggregation row - Resource breakdown
 */
export interface ResourceBreakdownRow {
  key: string | null;
  count: number;
  topAction: string;
}

/**
 * Activity breakdown aggregation row - IP breakdown
 */
export interface IpBreakdownRow {
  key: string | null;
  count: number;
  associatedUserCount: number;
  associatedUsers: string;
  failedAttempts: number;
}

/**
 * Activity breakdown aggregation row - Union of all breakdown types
 */
export type ActivityBreakdownRow = UserBreakdownRow | ResourceBreakdownRow | IpBreakdownRow;
