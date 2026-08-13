import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import { config } from '../config';
import communityPlaylistsSeed from '../data/community-playlists.json';
import { logger } from '../utils/logger';
import { writeFileAtomic } from '../utils/atomicFile';

import type { CommunityPlaylistsResponse } from '../types/community-playlists';

/**
 * Allowed domains for community playlist downloads (SSRF protection)
 * Consolidated list used by both service and route validation
 */
export const ALLOWED_DOWNLOAD_DOMAINS = [
  'flashpointarchive.org',
  'www.flashpointarchive.org',
  'download.flashpointarchive.org',
  'fpfss.unstable.life',
  'github.com',
  'raw.githubusercontent.com',
  'gist.githubusercontent.com',
];

export interface PlaylistData {
  id: string;
  title: string;
  description?: string;
  games: Array<{ gameId: string; [key: string]: unknown }>;
  [key: string]: unknown;
}

export interface DownloadResult {
  success: boolean;
  playlist?: PlaylistData;
  error?: string;
  conflict?: boolean;
}

export class CommunityPlaylistService {
  /**
   * The playlist index lives on a wiki page that now sits behind a Cloudflare
   * challenge, so it cannot be scraped at runtime. It is pre-seeded from a saved
   * copy of that page in data/community-playlists.json, whose `note` field
   * records where the data came from and how to refresh it.
   */
  getCommunityPlaylists(): CommunityPlaylistsResponse {
    return {
      categories: communityPlaylistsSeed.categories,
      lastUpdated: communityPlaylistsSeed.capturedOn,
    };
  }

  /** SSRF protection: validate URL is from an allowed domain */
  private isAllowedDownloadUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      const hostname = parsedUrl.hostname.toLowerCase();

      return ALLOWED_DOWNLOAD_DOMAINS.some((domain) => {
        const lowerDomain = domain.toLowerCase();
        return hostname === lowerDomain || hostname.endsWith(`.${lowerDomain}`);
      });
    } catch {
      // Invalid URL
      return false;
    }
  }

  async downloadPlaylist(downloadUrl: string): Promise<DownloadResult> {
    try {
      logger.info(`[CommunityPlaylist] Downloading playlist from: ${downloadUrl}`);

      // SSRF protection: validate URL is from allowed domain
      if (!this.isAllowedDownloadUrl(downloadUrl)) {
        logger.warn(`[CommunityPlaylist] Blocked download from untrusted domain: ${downloadUrl}`);
        return {
          success: false,
          error: 'Download URL is not from a trusted source',
        };
      }

      // maxRedirects: 0 prevents SSRF via open redirects on allowed domains
      const response = await axios.get(downloadUrl, {
        timeout: 60000,
        maxRedirects: 0,
        maxContentLength: 10 * 1024 * 1024, // 10MB limit
        headers: {
          'User-Agent': 'Flashpoint-Webapp/1.0',
        },
      });

      const playlistData = response.data;

      if (!this.validatePlaylistStructure(playlistData)) {
        logger.error('[CommunityPlaylist] Invalid playlist structure');
        return {
          success: false,
          error: 'Invalid playlist format',
        };
      }

      const playlistsPath = config.flashpointPlaylistsPath;
      const playlistFilePath = path.join(playlistsPath, `${playlistData.id}.json`);

      try {
        await fs.access(playlistFilePath);
        // File exists - conflict!
        logger.warn(`[CommunityPlaylist] Playlist already exists: ${playlistData.id}`);
        return {
          success: false,
          conflict: true,
          error: 'A playlist with this ID already exists',
        };
      } catch {
        // File doesn't exist - good to proceed
      }

      await writeFileAtomic(playlistFilePath, JSON.stringify(playlistData, null, '\t'));

      logger.info(
        `[CommunityPlaylist] Downloaded playlist: ${playlistData.title} (${playlistData.id})`
      );

      return {
        success: true,
        playlist: playlistData,
      };
    } catch (error) {
      logger.error('[CommunityPlaylist] Failed to download playlist:', error);

      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          return {
            success: false,
            error: 'Download timeout - please try again',
          };
        }
        if (error.response?.status === 404) {
          return {
            success: false,
            error: 'Playlist not found on server',
          };
        }
        if (error.response?.status && error.response.status >= 500) {
          return {
            success: false,
            error: 'Server error - please try again later',
          };
        }
      }

      return {
        success: false,
        error: 'Failed to download playlist',
      };
    }
  }

  private validatePlaylistStructure(data: unknown): boolean {
    if (!data || typeof data !== 'object') return false;
    const obj = data as Record<string, unknown>;
    // UUID validation regex for path traversal protection
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!obj.id || typeof obj.id !== 'string') {
      logger.warn('[CommunityPlaylist] Validation failed: missing or invalid id');
      return false;
    }

    // Validate ID format to prevent path traversal
    if (!UUID_REGEX.test(obj.id)) {
      logger.warn('[CommunityPlaylist] Validation failed: id is not a valid UUID format');
      return false;
    }

    if (!obj.title || typeof obj.title !== 'string') {
      logger.warn('[CommunityPlaylist] Validation failed: missing or invalid title');
      return false;
    }

    if (!Array.isArray(obj.games)) {
      logger.warn('[CommunityPlaylist] Validation failed: games is not an array');
      return false;
    }

    for (const game of obj.games) {
      if (typeof game !== 'object' || !game.gameId) {
        logger.warn('[CommunityPlaylist] Validation failed: game entry missing gameId');
        return false;
      }
    }

    return true;
  }
}
