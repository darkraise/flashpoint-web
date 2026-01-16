import { Express } from 'express';
import gamesRouter from './games';
import platformsRouter from './platforms';
import tagsRouter from './tags';
import playlistsRouter from './playlists';
import communityPlaylistsRouter from './community-playlists';
import proxyRouter from './proxy';
import gameFilesRouter from './game-files';
import updatesRouter from './updates';
import statisticsRouter from './statistics';
import downloadsRouter from './downloads';
import databaseRouter from './database';
import authRouter from './auth';
import usersRouter from './users';
import rolesRouter from './roles';
import activitiesRouter from './activities';
import authSettingsRouter from './auth-settings';
import playTrackingRouter from './play-tracking';

export function setupRoutes(app: Express): void {
  // Authentication routes
  app.use('/api/auth', authRouter);

  // Settings routes
  app.use('/api/settings/auth', authSettingsRouter);

  // User management routes
  app.use('/api/users', usersRouter);
  app.use('/api/roles', rolesRouter);
  app.use('/api/activities', activitiesRouter);

  // Play tracking routes
  app.use('/api/play', playTrackingRouter);

  // API routes
  app.use('/api/games', gamesRouter);
  app.use('/api/games', downloadsRouter);
  app.use('/api/platforms', platformsRouter);
  app.use('/api/tags', tagsRouter);
  app.use('/api/playlists', playlistsRouter);
  app.use('/api/community-playlists', communityPlaylistsRouter);
  app.use('/api/updates', updatesRouter);
  app.use('/api/statistics', statisticsRouter);
  app.use('/api/database', databaseRouter);

  // Game files proxy with automatic fallback
  app.use('/game-files', gameFilesRouter);

  app.use('/proxy', proxyRouter);

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({
      error: {
        message: 'Route not found',
        statusCode: 404
      }
    });
  });
}
