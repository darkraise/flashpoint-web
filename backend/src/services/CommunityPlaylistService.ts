import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { config } from '../config';
import { logger } from '../utils/logger';

const WIKI_BASE_URL = 'https://flashpointarchive.org';
const PLAYLISTS_WIKI_URL = 'https://flashpointarchive.org/datahub/Playlists';

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

export interface DownloadResult {
  success: boolean;
  playlist?: any;
  error?: string;
  conflict?: boolean;
}

export class CommunityPlaylistService {
  /**
   * Fetch and parse community playlists from the Flashpoint Archive wiki
   */
  async fetchCommunityPlaylists(): Promise<CommunityPlaylistsResponse> {
    try {
      logger.info('[CommunityPlaylist] Fetching community playlists from wiki');

      // Fetch HTML from wiki page
      const response = await axios.get(PLAYLISTS_WIKI_URL, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Flashpoint-Webapp/1.0',
        },
      });

      // Parse HTML and extract playlists
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

  /**
   * Download a specific playlist from the given URL and save it to disk
   */
  async downloadPlaylist(downloadUrl: string): Promise<DownloadResult> {
    try {
      logger.info(`[CommunityPlaylist] Downloading playlist from: ${downloadUrl}`);

      // Fetch playlist JSON
      const response = await axios.get(downloadUrl, {
        timeout: 60000,
        headers: {
          'User-Agent': 'Flashpoint-Webapp/1.0',
        },
      });

      const playlistData = response.data;

      // Validate playlist structure
      if (!this.validatePlaylistStructure(playlistData)) {
        logger.error('[CommunityPlaylist] Invalid playlist structure');
        return {
          success: false,
          error: 'Invalid playlist format',
        };
      }

      // Check if playlist already exists (conflict detection)
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

      // Save playlist to disk
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

  /**
   * Parse HTML tables from wiki page to extract playlists
   */
  private parsePlaylistTables(html: string): CommunityPlaylistCategory[] {
    const $ = cheerio.load(html);
    const categories: CommunityPlaylistCategory[] = [];
    let mainCategory = ''; // h2 header
    let subCategory = ''; // h3 header

    // Process all headers and tables in sequence
    $('h2, h3, table.wikitable').each((i, elem) => {
      const tagName = (elem as any).name;

      if (tagName === 'h2') {
        // This is a main category header
        const headerText = $(elem).text().trim();
        const categoryName = headerText.replace(/\[edit.*?\]/g, '').trim();

        // Skip certain headers
        if (
          categoryName.toLowerCase().includes('contents') ||
          categoryName.toLowerCase().includes('navigation') ||
          categoryName.toLowerCase().includes('tutorial')
        ) {
          return;
        }

        mainCategory = categoryName;
        subCategory = ''; // Reset subcategory when entering new main category
      } else if (tagName === 'h3') {
        // This is a subcategory header
        const headerText = $(elem).text().trim();
        const categoryName = headerText.replace(/\[edit.*?\]/g, '').trim();

        // Skip tutorial sections
        if (categoryName.toLowerCase().includes('tutorial')) {
          subCategory = '';
          return;
        }

        subCategory = categoryName;
      } else if (tagName === 'table' && mainCategory) {
        // This is a playlist table
        const playlists: CommunityPlaylist[] = [];

        // Parse table rows (skip header row)
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
                // Make URL absolute
                const absoluteUrl = this.makeAbsoluteUrl(downloadLink);

                // Determine category name
                let categoryName = mainCategory;
                if (mainCategory === 'Games' && subCategory) {
                  // For Games category, create separate categories for each subcategory
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

        // Only add category if it has playlists (non-empty)
        if (playlists.length > 0) {
          // Determine final category name
          let categoryName = mainCategory;
          if (mainCategory === 'Games' && subCategory) {
            categoryName = `Games - ${subCategory}`;
          }

          // Find or create category
          let category = categories.find((cat) => cat.name === categoryName);
          if (!category) {
            category = {
              name: categoryName,
              playlists: [],
            };
            categories.push(category);
          }

          // Add playlists to category
          category.playlists.push(...playlists);
        }
      }
    });

    // Filter out empty categories
    return categories.filter((cat) => cat.playlists.length > 0);
  }

  /**
   * Validate that the downloaded playlist has the required structure
   */
  private validatePlaylistStructure(data: any): boolean {
    // Must have required fields
    if (!data.id || typeof data.id !== 'string') {
      logger.warn('[CommunityPlaylist] Validation failed: missing or invalid id');
      return false;
    }

    if (!data.title || typeof data.title !== 'string') {
      logger.warn('[CommunityPlaylist] Validation failed: missing or invalid title');
      return false;
    }

    // Games array must exist and be valid
    if (!Array.isArray(data.games)) {
      logger.warn('[CommunityPlaylist] Validation failed: games is not an array');
      return false;
    }

    // Each game entry must have gameId
    for (const game of data.games) {
      if (typeof game !== 'object' || !game.gameId) {
        logger.warn('[CommunityPlaylist] Validation failed: game entry missing gameId');
        return false;
      }
    }

    return true;
  }

  /**
   * Convert relative URLs to absolute URLs
   */
  private makeAbsoluteUrl(relativeUrl: string): string {
    if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
      return relativeUrl;
    }

    // Handle different types of relative URLs
    if (relativeUrl.startsWith('/')) {
      return `${WIKI_BASE_URL}${relativeUrl}`;
    }

    return `${WIKI_BASE_URL}/${relativeUrl}`;
  }
}
