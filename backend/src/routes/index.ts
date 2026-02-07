import { Express } from 'express';
import gamesRouter from './games';
import platformsRouter from './platforms';
import tagsRouter from './tags';
import playlistsRouter from './playlists';
import communityPlaylistsRouter from './community-playlists';
import proxyRouter from './proxy';
import updatesRouter from './updates';
import statisticsRouter from './statistics';
import downloadsRouter from './downloads';
import databaseRouter from './database';
import authRouter from './auth';
import errorsRouter from './errors';
import usersRouter from './users';
import rolesRouter from './roles';
import activitiesRouter from './activities';
import authSettingsRouter from './auth-settings';
import systemSettingsRouter from './system-settings';
import jobsRouter from './jobs';
import playTrackingRouter from './play-tracking';
import userPlaylistsRouter from './user-playlists';
import sharedPlaylistsRouter from './shared-playlists';
import favoritesRouter from './favorites';
import ruffleRouter from './ruffle';
import githubRouter from './github';
import domainsRouter from './domains';
import healthRouter from './health';
import cacheRouter from './cache';
import metricsRouter from './metrics';

export function setupRoutes(app: Express): void {
  // Health check routes
  app.use('/api/health', healthRouter);

  // Cache management routes
  app.use('/api/cache', cacheRouter);

  // Performance metrics routes
  app.use('/api/metrics', metricsRouter);

  // Authentication routes
  app.use('/api/auth', authRouter);

  // Error reporting routes
  app.use('/api/errors', errorsRouter);

  // Settings routes
  app.use('/api/settings/auth', authSettingsRouter);
  app.use('/api/settings', systemSettingsRouter);

  // Ruffle management routes
  app.use('/api/ruffle', ruffleRouter);

  // GitHub integration routes
  app.use('/api/github', githubRouter);

  // Domain settings routes
  app.use('/api/domains', domainsRouter);

  // Jobs routes
  app.use('/api/jobs', jobsRouter);

  // User management routes
  app.use('/api/users', usersRouter);
  app.use('/api/roles', rolesRouter);
  app.use('/api/activities', activitiesRouter);

  // Play tracking routes
  app.use('/api/play', playTrackingRouter);

  // User playlists and favorites
  app.use('/api/user-playlists', userPlaylistsRouter);
  app.use('/api/playlists/shared', sharedPlaylistsRouter);
  app.use('/api/favorites', favoritesRouter);

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

  app.use('/proxy', proxyRouter);

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({
      error: {
        message: 'Route not found',
        statusCode: 404,
      },
    });
  });
}
