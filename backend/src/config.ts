import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3100', 10),
  host: process.env.HOST || '0.0.0.0',

  // Flashpoint paths
  flashpointPath: process.env.FLASHPOINT_PATH || 'D:/Flashpoint',
  flashpointDbPath: process.env.FLASHPOINT_DB_PATH || 'D:/Flashpoint/Data/flashpoint.sqlite',
  flashpointHtdocsPath: process.env.FLASHPOINT_HTDOCS_PATH || 'D:/Flashpoint/Legacy/htdocs',
  flashpointImagesPath: process.env.FLASHPOINT_IMAGES_PATH || 'D:/Flashpoint/Data/Images',
  flashpointLogosPath: process.env.FLASHPOINT_LOGOS_PATH || 'D:/Flashpoint/Data/Logos',
  flashpointPlaylistsPath: process.env.FLASHPOINT_PLAYLISTS_PATH || 'D:/Flashpoint/Data/Playlists',

  // Game Service URLs (external service, not built-in)
  gameServerUrl: process.env.GAME_SERVICE_PROXY_URL || process.env.GAME_SERVER_URL || 'http://localhost:22500',
  gameServiceGameZipUrl: process.env.GAME_SERVICE_GAMEZIP_URL || 'http://localhost:22501',
  gameServerHttpPort: parseInt(process.env.GAME_SERVICE_GAMEZIP_URL?.split(':')[2] || process.env.GAME_SERVER_HTTP_PORT || '22501', 10),

  // Flashpoint paths for game service
  flashpointGamesPath: process.env.FLASHPOINT_GAMES_PATH || 'D:/Flashpoint/Data/Games',

  // External image CDN URLs (for image fallback)
  externalImageUrls: (process.env.EXTERNAL_IMAGE_URLS ||
    'https://infinity.flashpointarchive.org/Flashpoint/Data/Images,' +
    'https://infinity.unstable.life/Flashpoint/Data/Images'
  ).split(','),

  // Redis
  redisEnabled: process.env.REDIS_ENABLED === 'true',
  redisHost: process.env.REDIS_HOST || 'localhost',
  redisPort: parseInt(process.env.REDIS_PORT || '6379', 10),

  // CORS
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',

  // Rate limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',

  // User Database
  userDbPath: process.env.USER_DB_PATH || './user.db',

  // JWT Configuration
  jwtSecret: process.env.JWT_SECRET || 'change-in-production-use-long-random-string',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',

  // Security
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10)
};
