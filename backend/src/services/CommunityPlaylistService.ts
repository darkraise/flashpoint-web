import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { config } from '../config';
import { logger } from '../utils/logger';

const WIKI_BASE_URL = 'https://flashpointarchive.org';
const PLAYLISTS_WIKI_URL = 'https://flashpointarchive.org/datahub/Playlists';

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

export interface CommunityPlaylist {
  name: string;
  author: string;
  description: string;
  downloadUrl: string;
  category: string;
  subcategory?: string;
}

export interface CommunityPlaylistCategory {
  name: string;
  playlists: CommunityPlaylist[];
}

export interface CommunityPlaylistsResponse {
  categories: CommunityPlaylistCategory[];
  lastFetched: string;
}

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
  async fetchCommunityPlaylists(): Promise<CommunityPlaylistsResponse> {
    try {
      logger.info('[CommunityPlaylist] Fetching community playlists from wiki');

      const response = await axios.get(PLAYLISTS_WIKI_URL, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Flashpoint-Webapp/1.0',
        },
      });

      const categories = this.parsePlaylistTables(response.data);

      logger.info(
        `[CommunityPlaylist] Found ${categories.length} categories with ${categories.reduce((sum, cat) => sum + cat.playlists.length, 0)} total playlists`
      );

      return {
        categories,
        lastFetched: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('[CommunityPlaylist] Failed to fetch community playlists:', error);

      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new Error('Request timeout - please check your connection');
        }
        if (error.response?.status && error.response.status >= 500) {
          throw new Error('Server error - please try again later');
        }
      }

      throw new Error('Failed to fetch community playlists');
    }
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

      await fs.writeFile(playlistFilePath, JSON.stringify(playlistData, null, '\t'), 'utf-8');

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

  private parsePlaylistTables(html: string): CommunityPlaylistCategory[] {
    const $ = cheerio.load(html);
    const categories: CommunityPlaylistCategory[] = [];
    let mainCategory = ''; // h2 header
    let subCategory = ''; // h3 header

    $('h2, h3, table.wikitable').each((i, elem) => {
      const tagName = elem.type === 'tag' ? elem.name : null;
      if (!tagName) return;

      if (tagName === 'h2') {
        const headerText = $(elem).text().trim();
        const categoryName = headerText.replace(/\[edit.*?\]/g, '').trim();

        if (
          categoryName.toLowerCase().includes('contents') ||
          categoryName.toLowerCase().includes('navigation') ||
          categoryName.toLowerCase().includes('tutorial')
        ) {
          return;
        }

        mainCategory = categoryName;
        subCategory = '';
      } else if (tagName === 'h3') {
        const headerText = $(elem).text().trim();
        const categoryName = headerText.replace(/\[edit.*?\]/g, '').trim();

        // Skip tutorial sections
        if (categoryName.toLowerCase().includes('tutorial')) {
          subCategory = '';
          return;
        }

        subCategory = categoryName;
      } else if (tagName === 'table' && mainCategory) {
        const playlists: CommunityPlaylist[] = [];

        $(elem)
          .find('tr')
          .slice(1)
          .each((j, row) => {
            const cells = $(row).find('td');

            if (cells.length >= 4) {
              const name = $(cells[0]).text().trim();
              const author = $(cells[1]).text().trim();
              const description = $(cells[2]).text().trim();
              const downloadLink = $(cells[3]).find('a').attr('href');

              if (name && downloadLink) {
                const absoluteUrl = this.makeAbsoluteUrl(downloadLink);

                let categoryName = mainCategory;
                if (mainCategory === 'Games' && subCategory) {
                  categoryName = `Games - ${subCategory}`;
                }

                playlists.push({
                  name,
                  author: author || 'Unknown',
                  description: description || '',
                  downloadUrl: absoluteUrl,
                  category: categoryName,
                });
              }
            }
          });

        if (playlists.length > 0) {
          let categoryName = mainCategory;
          if (mainCategory === 'Games' && subCategory) {
            categoryName = `Games - ${subCategory}`;
          }

          let category = categories.find((cat) => cat.name === categoryName);
          if (!category) {
            category = {
              name: categoryName,
              playlists: [],
            };
            categories.push(category);
          }

          category.playlists.push(...playlists);
        }
      }
    });

    return categories.filter((cat) => cat.playlists.length > 0);
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

  private makeAbsoluteUrl(relativeUrl: string): string {
    if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
      return relativeUrl;
    }

    if (relativeUrl.startsWith('/')) {
      return `${WIKI_BASE_URL}${relativeUrl}`;
    }

    return `${WIKI_BASE_URL}/${relativeUrl}`;
  }
}
