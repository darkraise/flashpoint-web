import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { config } from '../config';
import { logger } from '../utils/logger';
import { GameService, Game } from './GameService';

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

export class PlaylistService {
  private gameService = new GameService();

  async getAllPlaylists(): Promise<Playlist[]> {
    try {
      const playlistsPath = config.flashpointPlaylistsPath;
      const files = await fs.readdir(playlistsPath);

      const playlists: Playlist[] = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const filePath = path.join(playlistsPath, file);
            const content = await fs.readFile(filePath, 'utf-8');
            const playlist = JSON.parse(content);

            // Extract game IDs from playlist (they're objects with gameId property)
            const gameIds = Array.isArray(playlist.games)
              ? playlist.games
                  .map((g: unknown) =>
                    typeof g === 'string' ? g : (g as { gameId?: string }).gameId
                  )
                  .filter(Boolean)
              : [];

            playlists.push({
              id: playlist.id || path.basename(file, '.json'),
              title: playlist.title,
              description: playlist.description,
              author: playlist.author,
              library: playlist.library,
              icon: playlist.icon,
              gameIds,
            });
          } catch (error) {
            logger.warn(`Failed to parse playlist file: ${file}`, error);
          }
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
      const files = await fs.readdir(playlistsPath);

      // Try to find playlist file by ID
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(playlistsPath, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const playlist = JSON.parse(content);

          const playlistId = playlist.id || path.basename(file, '.json');

          if (playlistId === id) {
            // Extract game IDs from playlist
            const gameIds: string[] = [];

            if (playlist.games && Array.isArray(playlist.games)) {
              for (const playlistGame of playlist.games) {
                // Playlist games are objects with gameId property, not just strings
                const gameId =
                  typeof playlistGame === 'string' ? playlistGame : playlistGame.gameId;

                if (gameId) {
                  gameIds.push(gameId);
                }
              }
            }

            // Batch fetch all games at once (avoid N+1 query pattern)
            // getGamesByIds returns games in the same order as input IDs
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
          }
        }
      }

      return null;
    } catch (error) {
      logger.error('Error getting playlist by ID:', error);
      throw error;
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
      const playlistsPath = config.flashpointPlaylistsPath;
      const files = await fs.readdir(playlistsPath);

      // Find playlist file
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(playlistsPath, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const playlist = JSON.parse(content);

          const id = playlist.id || path.basename(file, '.json');

          if (id === playlistId) {
            // Get existing game IDs
            const existingGameIds = Array.isArray(playlist.games)
              ? playlist.games.map((g: any) => (typeof g === 'string' ? g : g.gameId))
              : [];

            // Add new game IDs (avoid duplicates)
            const newGameIds = data.gameIds.filter((gameId) => !existingGameIds.includes(gameId));

            // Convert to playlist game format
            const newGames = newGameIds.map((gameId) => ({ gameId }));

            playlist.games = [...(playlist.games || []), ...newGames];

            // Write updated playlist
            await fs.writeFile(filePath, JSON.stringify(playlist, null, '\t'), 'utf-8');

            logger.info(`Added ${newGameIds.length} games to playlist: ${playlist.title}`);

            // Return updated playlist with full game data
            return await this.getPlaylistById(playlistId);
          }
        }
      }

      return null;
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
      const playlistsPath = config.flashpointPlaylistsPath;
      const files = await fs.readdir(playlistsPath);

      // Find playlist file
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(playlistsPath, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const playlist = JSON.parse(content);

          const id = playlist.id || path.basename(file, '.json');

          if (id === playlistId) {
            // Remove games
            playlist.games = (playlist.games || []).filter((g: any) => {
              const gameId = typeof g === 'string' ? g : g.gameId;
              return !data.gameIds.includes(gameId);
            });

            // Write updated playlist
            await fs.writeFile(filePath, JSON.stringify(playlist, null, '\t'), 'utf-8');

            logger.info(`Removed ${data.gameIds.length} games from playlist: ${playlist.title}`);

            return await this.getPlaylistById(playlistId);
          }
        }
      }

      return null;
    } catch (error) {
      logger.error('Error removing games from playlist:', error);
      throw error;
    }
  }

  async deletePlaylist(playlistId: string): Promise<boolean> {
    try {
      const playlistsPath = config.flashpointPlaylistsPath;
      const files = await fs.readdir(playlistsPath);

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(playlistsPath, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const playlist = JSON.parse(content);

          const id = playlist.id || path.basename(file, '.json');

          if (id === playlistId) {
            await fs.unlink(filePath);
            logger.info(`Deleted playlist: ${playlist.title} (${id})`);
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      logger.error('Error deleting playlist:', error);
      throw error;
    }
  }

  private generateUUID(): string {
    return crypto.randomUUID();
  }
}
