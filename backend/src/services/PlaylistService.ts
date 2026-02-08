import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { config } from '../config';
import { logger } from '../utils/logger';
import { GameService, Game } from './GameService';

type PlaylistGameEntry = string | { gameId?: string; [key: string]: unknown };

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

export interface CreatePlaylistDto {
  title: string;
  description?: string;
  author?: string;
  library?: string;
}

export interface AddGamesToPlaylistDto {
  gameIds: string[];
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class PlaylistService {
  private gameService = new GameService();

  /**
   * Validate playlist ID format and resolved path to prevent path traversal.
   * Returns the safe file path, or null if validation fails.
   */
  private validatePlaylistPath(id: string, playlistsPath: string): string | null {
    // Must be a valid UUID to prevent path traversal via crafted IDs
    if (!UUID_REGEX.test(id)) {
      logger.warn(`[PlaylistService] Rejected invalid playlist ID format: ${id}`);
      return null;
    }

    const filePath = path.join(playlistsPath, `${id}.json`);
    const resolved = path.resolve(filePath);

    // Verify resolved path stays within the playlists directory
    if (!resolved.startsWith(path.resolve(playlistsPath))) {
      logger.warn(`[PlaylistService] Path traversal attempt blocked: ${id}`);
      return null;
    }

    return filePath;
  }

  async getAllPlaylists(): Promise<Playlist[]> {
    try {
      const playlistsPath = config.flashpointPlaylistsPath;
      const files = await fs.readdir(playlistsPath);

      const jsonFiles = files.filter((f) => f.endsWith('.json'));

      // Parallel file reads (was sequential for-of loop)
      const results = await Promise.allSettled(
        jsonFiles.map(async (file) => {
          const filePath = path.join(playlistsPath, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const playlist = JSON.parse(content);

          const gameIds = Array.isArray(playlist.games)
            ? playlist.games
                .map((g: unknown) =>
                  typeof g === 'string' ? g : (g as { gameId?: string }).gameId
                )
                .filter(Boolean)
            : [];

          return {
            id: playlist.id || path.basename(file, '.json'),
            title: playlist.title,
            description: playlist.description,
            author: playlist.author,
            library: playlist.library,
            icon: playlist.icon,
            gameIds,
          } as Playlist;
        })
      );

      const playlists: Playlist[] = [];
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (result.status === 'fulfilled') {
          playlists.push(result.value);
        } else {
          logger.warn(`Failed to parse playlist file: ${jsonFiles[i]}`, result.reason);
        }
      }

      return playlists.sort((a, b) => a.title.localeCompare(b.title));
    } catch (error) {
      logger.error('Error getting playlists:', error);
      throw error;
    }
  }

  async getPlaylistById(id: string): Promise<Playlist | null> {
    try {
      const playlistsPath = config.flashpointPlaylistsPath;

      // Validate ID format to prevent path traversal
      const validatedPath = this.validatePlaylistPath(id, playlistsPath);
      if (!validatedPath) return null;

      // Try direct file access first (O(1) instead of scanning all files)
      const directPath = validatedPath;
      const playlist = await this.tryReadPlaylist(directPath, id);
      if (playlist) return playlist;

      // Fallback: scan all files (some playlists may have filename != id)
      const files = await fs.readdir(playlistsPath);
      for (const file of files) {
        if (!file.endsWith('.json') || file === `${id}.json`) continue; // Already tried direct
        const filePath = path.join(playlistsPath, file);
        const result = await this.tryReadPlaylist(filePath, id);
        if (result) return result;
      }

      return null;
    } catch (error) {
      logger.error('Error getting playlist by ID:', error);
      throw error;
    }
  }

  /**
   * Try to read a playlist file and return it if its ID matches
   */
  private async tryReadPlaylist(filePath: string, targetId: string): Promise<Playlist | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const playlist = JSON.parse(content);

      const playlistId = playlist.id || path.basename(filePath, '.json');
      if (playlistId !== targetId) return null;

      // Extract game IDs from playlist
      const gameIds: string[] = [];
      if (playlist.games && Array.isArray(playlist.games)) {
        for (const playlistGame of playlist.games) {
          const gameId = typeof playlistGame === 'string' ? playlistGame : playlistGame.gameId;
          if (gameId) gameIds.push(gameId);
        }
      }

      // Batch fetch all games at once (avoid N+1 query pattern)
      const games = await this.gameService.getGamesByIds(gameIds);

      return {
        id: playlistId,
        title: playlist.title,
        description: playlist.description,
        author: playlist.author,
        library: playlist.library,
        icon: playlist.icon,
        games,
      };
    } catch {
      // File doesn't exist or invalid JSON - return null
      return null;
    }
  }

  async createPlaylist(data: CreatePlaylistDto): Promise<Playlist> {
    try {
      const playlistsPath = config.flashpointPlaylistsPath;

      // Generate UUID for playlist
      const id = this.generateUUID();

      const playlist: Playlist = {
        id,
        title: data.title,
        description: data.description || '',
        author: data.author || 'Unknown',
        library: data.library || 'arcade',
        games: [],
      };

      // Write playlist file
      const filePath = path.join(playlistsPath, `${id}.json`);
      await fs.writeFile(filePath, JSON.stringify(playlist, null, '\t'), 'utf-8');

      logger.info(`Created playlist: ${playlist.title} (${id})`);

      return playlist;
    } catch (error) {
      logger.error('Error creating playlist:', error);
      throw error;
    }
  }

  async addGamesToPlaylist(
    playlistId: string,
    data: AddGamesToPlaylistDto
  ): Promise<Playlist | null> {
    try {
      const found = await this.findPlaylistFile(playlistId);
      if (!found) return null;

      const { filePath, data: playlist } = found;

      // Get existing game IDs
      const existingGameIds = Array.isArray(playlist.games)
        ? playlist.games.map((g: PlaylistGameEntry) => (typeof g === 'string' ? g : g.gameId))
        : [];

      // Add new game IDs (avoid duplicates)
      const newGameIds = data.gameIds.filter((gameId) => !existingGameIds.includes(gameId));
      const newGames = newGameIds.map((gameId) => ({ gameId }));
      playlist.games = [...(playlist.games || []), ...newGames];

      await fs.writeFile(filePath, JSON.stringify(playlist, null, '\t'), 'utf-8');
      logger.info(`Added ${newGameIds.length} games to playlist: ${playlist.title}`);

      return await this.getPlaylistById(playlistId);
    } catch (error) {
      logger.error('Error adding games to playlist:', error);
      throw error;
    }
  }

  async removeGamesFromPlaylist(
    playlistId: string,
    data: AddGamesToPlaylistDto
  ): Promise<Playlist | null> {
    try {
      const found = await this.findPlaylistFile(playlistId);
      if (!found) return null;

      const { filePath, data: playlist } = found;

      playlist.games = (playlist.games || []).filter((g: PlaylistGameEntry) => {
        const gameId = typeof g === 'string' ? g : g.gameId;
        return gameId && !data.gameIds.includes(gameId);
      });

      await fs.writeFile(filePath, JSON.stringify(playlist, null, '\t'), 'utf-8');
      logger.info(`Removed ${data.gameIds.length} games from playlist: ${playlist.title}`);

      return await this.getPlaylistById(playlistId);
    } catch (error) {
      logger.error('Error removing games from playlist:', error);
      throw error;
    }
  }

  async deletePlaylist(playlistId: string): Promise<boolean> {
    try {
      // Validate ID format before file operations
      if (!UUID_REGEX.test(playlistId)) {
        logger.warn(`[PlaylistService] Rejected invalid playlist ID for delete: ${playlistId}`);
        return false;
      }

      const found = await this.findPlaylistFile(playlistId);
      if (!found) return false;

      await fs.unlink(found.filePath);
      logger.info(`Deleted playlist: ${found.data.title} (${playlistId})`);
      return true;
    } catch (error) {
      logger.error('Error deleting playlist:', error);
      throw error;
    }
  }

  /**
   * Find a playlist file by ID. Tries direct {id}.json first, then scans all files.
   * Returns file path and parsed data, or null if not found.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async findPlaylistFile(id: string): Promise<{ filePath: string; data: any } | null> {
    const playlistsPath = config.flashpointPlaylistsPath;

    // Validate ID format to prevent path traversal
    if (!UUID_REGEX.test(id)) {
      logger.warn(`[PlaylistService] Rejected invalid playlist ID in findPlaylistFile: ${id}`);
      return null;
    }

    // Try direct path first (O(1))
    const directPath = path.join(playlistsPath, `${id}.json`);
    try {
      const content = await fs.readFile(directPath, 'utf-8');
      const data = JSON.parse(content);
      const playlistId = data.id || path.basename(directPath, '.json');
      if (playlistId === id) return { filePath: directPath, data };
    } catch {
      // Not found at direct path
    }

    // Fallback: scan all files
    const files = await fs.readdir(playlistsPath);
    for (const file of files) {
      if (!file.endsWith('.json') || file === `${id}.json`) continue;
      const filePath = path.join(playlistsPath, file);
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);
        const playlistId = data.id || path.basename(file, '.json');
        if (playlistId === id) return { filePath, data };
      } catch {
        // Skip unreadable files
      }
    }

    return null;
  }

  private generateUUID(): string {
    return crypto.randomUUID();
  }
}
