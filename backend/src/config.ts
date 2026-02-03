import dotenv from 'dotenv';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

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
// Docker (production): /data/flashpoint (volume mount point)
// Local dev: D:/Flashpoint or FLASHPOINT_PATH env var
const getFlashpointPath = (): string => {
  if (process.env.FLASHPOINT_PATH) {
    return process.env.FLASHPOINT_PATH;
  }
  return process.env.NODE_ENV === 'production' ? '/data/flashpoint' : 'D:/Flashpoint';
};

const flashpointPath = getFlashpointPath();

/**
 * Parse version.txt from Flashpoint installation directory.
 * Examples:
 *   "Flashpoint 14.0.3 Infinity - Kingfisher"
 *   "Flashpoint 14 Ultimate - Kingfisher"
 *
 * Returns { edition, versionString } or defaults if file is missing/unparseable.
 */
function parseVersionFile(): { edition: 'infinity' | 'ultimate'; versionString: string } {
  const defaults = { edition: 'infinity' as const, versionString: '' };

  try {
    const versionFilePath = path.join(flashpointPath, 'version.txt');
    const content = fs.readFileSync(versionFilePath, 'utf-8').trim();

    if (!content) return defaults;

    const lower = content.toLowerCase();
    let edition: 'infinity' | 'ultimate' = 'infinity';

    if (lower.includes('ultimate')) {
      edition = 'ultimate';
    } else if (lower.includes('infinity')) {
      edition = 'infinity';
    }

    return { edition, versionString: content };
  } catch {
    // File doesn't exist or can't be read - use defaults
    return defaults;
  }
}

const flashpointVersion = parseVersionFile();

export const config = {
  // Server (hardcoded - use docker-compose port mapping to expose on different ports)
  nodeEnv: process.env.NODE_ENV || 'development',
  port: 3100,
  host: '0.0.0.0',

  // Flashpoint paths (all derived from FLASHPOINT_PATH)
  flashpointPath,
  flashpointDbPath: `${flashpointPath}/Data/flashpoint.sqlite`,
  flashpointHtdocsPath: `${flashpointPath}/Legacy/htdocs`,
  flashpointImagesPath: `${flashpointPath}/Data/Images`,
  flashpointLogosPath: `${flashpointPath}/Data/Logos`,
  flashpointPlaylistsPath: `${flashpointPath}/Data/Playlists`,
  flashpointGamesPath: `${flashpointPath}/Data/Games`,

  // Game Service URLs (external service, not built-in)
  // Internal URLs: Used for backend-to-game-service communication within Docker
  // Ports hardcoded (22500/22501) - only host is configurable (localhost for dev, game-service for docker)
  gameServerUrl: `http://${process.env.GAME_SERVICE_HOST || 'localhost'}:22500`,
  gameServiceGameZipUrl: `http://${process.env.GAME_SERVICE_HOST || 'localhost'}:22501`,
  gameServerHttpPort: 22501,

  // External Game Service URL: Used for URLs returned to the browser
  // In Docker: Use relative paths through nginx proxy (/game-proxy)
  // In local dev: Use direct localhost URLs (http://localhost:22500)
  // Can be overridden with GAME_SERVICE_EXTERNAL_URL env var
  gameServiceExternalUrl: process.env.GAME_SERVICE_EXTERNAL_URL ||
    (process.env.NODE_ENV === 'production' ? '/game-proxy' : `http://localhost:22500`),

  // Frontend domain (used for CORS and share URL generation)
  domain: process.env.DOMAIN || 'http://localhost:5173',

  // Rate limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),

  // Logging
  // In Docker (production): defaults to /app/logs/backend.log
  // In local dev: no file logging unless LOG_FILE is explicitly set
  logLevel: process.env.LOG_LEVEL || 'info',
  logFile: process.env.LOG_FILE || (process.env.NODE_ENV === 'production' ? '/app/logs/backend.log' : undefined),

  // User Database
  // In Docker (production): /app/data/user.db
  // In local dev: ./user.db in the current directory
  userDbPath: process.env.NODE_ENV === 'production' ? '/app/data/user.db' : './user.db',

  // JWT Configuration
  jwtSecret: getJwtSecret(),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',

  // Security
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10),

  // Home Page Configuration
  homeRecentHours: parseInt(process.env.HOME_RECENT_HOURS || '24', 10),

  // Local Database Copy (for network storage optimization)
  // When enabled, copies flashpoint.sqlite to local storage for faster access
  // Stored in /app/data alongside user.db
  enableLocalDbCopy: process.env.ENABLE_LOCAL_DB_COPY === 'true',
  localDbPath: '/app/data/flashpoint.sqlite',  // Only used when enableLocalDbCopy is true

  // SQLite Performance Tuning
  sqliteCacheSize: parseInt(process.env.SQLITE_CACHE_SIZE || '-64000', 10), // Negative = KB, -64000 = 64MB
  sqliteMmapSize: parseInt(process.env.SQLITE_MMAP_SIZE || '268435456', 10), // 256MB default

  // Cache Pre-warming
  enableCachePrewarm: process.env.ENABLE_CACHE_PREWARM !== 'false', // Enabled by default

  // Flashpoint Edition (auto-detected from version.txt)
  // Infinity: has metadata source for sync, game table includes logoPath/screenshotPath
  // Ultimate: no metadata source, game table lacks logoPath/screenshotPath
  flashpointEdition: flashpointVersion.edition,

  // Full version string from version.txt (e.g., "Flashpoint 14.0.3 Infinity - Kingfisher")
  flashpointVersionString: flashpointVersion.versionString
};

/**
 * Get external image URLs for CDN fallback.
 * This is resolved dynamically from Flashpoint preferences.
 *
 * Priority:
 * 1. Flashpoint preferences (onDemandBaseUrl)
 * 2. Hardcoded defaults
 *
 * @returns Promise<string[]> Array of image CDN URLs
 */
export async function getExternalImageUrls(): Promise<string[]> {
  const { ImageUrlService } = await import('./services/ImageUrlService');
  return ImageUrlService.getExternalImageUrls();
}
