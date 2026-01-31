import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

/**
 * Generate a secure JWT secret for development environments
 * In production, JWT_SECRET MUST be provided as an environment variable
 */
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (secret) {
    return secret;
  }

  // In production, fail fast if JWT_SECRET is not set
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'FATAL: JWT_SECRET environment variable is required in production.\n' +
      'Generate a secure secret: openssl rand -base64 64\n' +
      'Set it in your .env file or environment variables.'
    );
  }

  // In development, generate a random secret and warn
  const devSecret = `INSECURE-DEV-ONLY-${crypto.randomBytes(32).toString('hex')}`;
  console.warn('\n⚠️  WARNING: Using auto-generated JWT secret for development.');
  console.warn('   In production, set JWT_SECRET environment variable.\n');

  return devSecret;
}

// Get base Flashpoint path and derive all other paths from it
const getFlashpointPath = (): string => {
  return process.env.FLASHPOINT_PATH || 'D:/Flashpoint';
};

const flashpointPath = getFlashpointPath();

export const config = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3100', 10),
  host: process.env.HOST || '0.0.0.0',

  // Flashpoint paths (all derived from FLASHPOINT_PATH)
  flashpointPath,
  flashpointDbPath: `${flashpointPath}/Data/flashpoint.sqlite`,
  flashpointHtdocsPath: `${flashpointPath}/Legacy/htdocs`,
  flashpointImagesPath: `${flashpointPath}/Data/Images`,
  flashpointLogosPath: `${flashpointPath}/Data/Logos`,
  flashpointPlaylistsPath: `${flashpointPath}/Data/Playlists`,
  flashpointGamesPath: `${flashpointPath}/Data/Games`,

  // Game Service URLs (external service, not built-in)
  gameServerUrl: process.env.GAME_SERVICE_PROXY_URL || process.env.GAME_SERVER_URL || 'http://localhost:22500',
  gameServiceGameZipUrl: process.env.GAME_SERVICE_GAMEZIP_URL || 'http://localhost:22501',
  gameServerHttpPort: parseInt(process.env.GAME_SERVICE_GAMEZIP_URL?.split(':')[2] || process.env.GAME_SERVER_HTTP_PORT || '22501', 10),

  // Redis
  redisEnabled: process.env.REDIS_ENABLED === 'true',
  redisHost: process.env.REDIS_HOST || 'localhost',
  redisPort: parseInt(process.env.REDIS_PORT || '6379', 10),

  // Frontend domain (used for CORS and share URL generation)
  domain: process.env.DOMAIN || 'http://localhost:5173',

  // Rate limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',

  // User Database
  userDbPath: process.env.USER_DB_PATH || './user.db',

  // JWT Configuration
  jwtSecret: getJwtSecret(),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',

  // Security
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10),

  // Home Page Configuration
  homeRecentHours: parseInt(process.env.HOME_RECENT_HOURS || '24', 10)
};

/**
 * Get external image URLs for CDN fallback.
 * This is resolved dynamically from Flashpoint preferences or environment variable.
 *
 * Priority:
 * 1. EXTERNAL_IMAGE_URLS environment variable
 * 2. Flashpoint preferences (onDemandBaseUrl)
 * 3. Hardcoded defaults
 *
 * @returns Promise<string[]> Array of image CDN URLs
 */
export async function getExternalImageUrls(): Promise<string[]> {
  const { ImageUrlService } = await import('./services/ImageUrlService');
  return ImageUrlService.getExternalImageUrls();
}
