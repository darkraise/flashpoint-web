import dotenv from 'dotenv';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

dotenv.config();

/** In production, JWT_SECRET MUST be set. In dev, generates an ephemeral random secret. */
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'FATAL: JWT_SECRET environment variable is required in production.\n' +
        'Generate a secure secret: openssl rand -base64 64\n' +
        'Set it in your .env file or environment variables.'
    );
  }

  const devSecret = `INSECURE-DEV-ONLY-${crypto.randomBytes(32).toString('hex')}`;
  // NOTE: console.warn used intentionally - logger not yet initialized at config load time
  console.warn('\n⚠️  WARNING: Using auto-generated JWT secret for development.');
  console.warn('   In production, set JWT_SECRET environment variable.\n');

  return devSecret;
}

const getFlashpointPath = (): string => {
  if (process.env.FLASHPOINT_PATH) {
    return process.env.FLASHPOINT_PATH;
  }
  return process.env.NODE_ENV === 'production' ? '/data/flashpoint' : 'D:/Flashpoint';
};

const flashpointPath = getFlashpointPath();

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
    return defaults;
  }
}

const flashpointVersion = parseVersionFile();

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: 3100,
  host: '0.0.0.0',

  flashpointPath,
  flashpointDbPath: `${flashpointPath}/Data/flashpoint.sqlite`,
  flashpointHtdocsPath: `${flashpointPath}/Legacy/htdocs`,
  flashpointImagesPath: `${flashpointPath}/Data/Images`,
  flashpointLogosPath: `${flashpointPath}/Data/Logos`,
  flashpointPlaylistsPath: `${flashpointPath}/Data/Playlists`,
  flashpointGamesPath: `${flashpointPath}/Data/Games`,

  domain: process.env.DOMAIN || 'http://localhost:5173',

  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '', 10) || 60000,
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '', 10) || 100,

  logLevel: process.env.LOG_LEVEL || 'info',
  logFile:
    process.env.LOG_FILE ||
    (process.env.NODE_ENV === 'production' ? '/app/logs/backend.log' : undefined),

  userDbPath: process.env.NODE_ENV === 'production' ? '/app/data/user.db' : './user.db',

  jwtSecret: getJwtSecret(),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',

  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '', 10) || 10,

  homeRecentHours: parseInt(process.env.HOME_RECENT_HOURS || '', 10) || 24,

  // When enabled, copies flashpoint.sqlite to local storage for faster network access
  enableLocalDbCopy: process.env.ENABLE_LOCAL_DB_COPY === 'true',
  localDbPath: '/app/data/flashpoint.sqlite',

  sqliteCacheSize: parseInt(process.env.SQLITE_CACHE_SIZE || '', 10) || -64000, // Negative = KB (-64000 = 64MB)
  sqliteMmapSize: parseInt(process.env.SQLITE_MMAP_SIZE || '', 10) || 268435456, // 256MB
  enableCachePrewarm: process.env.ENABLE_CACHE_PREWARM !== 'false',

  // Auto-detected from version.txt; affects metadata sync and image path availability
  flashpointEdition: flashpointVersion.edition,
  flashpointVersionString: flashpointVersion.versionString,
};

/** Resolves external image CDN URLs from Flashpoint preferences, with hardcoded fallbacks. */
export async function getExternalImageUrls(): Promise<string[]> {
  const { ImageUrlService } = await import('./services/ImageUrlService');
  return ImageUrlService.getExternalImageUrls();
}
