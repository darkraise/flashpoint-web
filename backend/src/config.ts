import dotenv from 'dotenv';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { parseOriginList } from './utils/origins';

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

function parseCookieSecure(value: string | undefined): boolean | 'auto' {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  if (normalized !== undefined && normalized !== '' && normalized !== 'auto') {
    console.warn(`⚠️  Ignoring invalid COOKIE_SECURE="${value}" (use true, false, or auto).`);
  }
  return 'auto';
}

const getFlashpointPath = (): string => {
  if (process.env.FLASHPOINT_PATH) {
    return process.env.FLASHPOINT_PATH;
  }
  return process.env.NODE_ENV === 'production' ? '/data/flashpoint' : 'D:/Flashpoint';
};

const flashpointPath = getFlashpointPath();

/**
 * When this Flashpoint package was built, taken from files the package ships but
 * neither the Launcher nor this app ever rewrites. Ultimate names only a major
 * version ("Flashpoint 14 Ultimate - Kingfisher"), so the package date is the
 * only thing that distinguishes one Ultimate snapshot from the next.
 */
function readPackagedAt(): string | null {
  const candidates = ['version.txt', '.preferences.defaults.json'];

  for (const candidate of candidates) {
    try {
      const { mtime } = fs.statSync(path.join(flashpointPath, candidate));
      if (!isNaN(mtime.getTime())) {
        return mtime.toISOString();
      }
    } catch {
      // Try the next candidate.
    }
  }

  return null;
}

function parseVersionFile(): {
  edition: 'infinity' | 'ultimate';
  versionString: string;
  packagedAt: string | null;
} {
  const packagedAt = readPackagedAt();
  const defaults = { edition: 'infinity' as const, versionString: '', packagedAt };

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

    return { edition, versionString: content, packagedAt };
  } catch {
    return defaults;
  }
}

const flashpointVersion = parseVersionFile();

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: 3100, // Hardcoded — Docker EXPOSE and healthcheck depend on this value
  host: '0.0.0.0',

  // Single-image deployment: the backend also serves the built frontend and its
  // SPA fallback. On by default in production; opt in elsewhere via SERVE_FRONTEND.
  serveFrontend: process.env.SERVE_FRONTEND
    ? process.env.SERVE_FRONTEND === 'true'
    : process.env.NODE_ENV === 'production',
  // __dirname is backend/dist at runtime, so this resolves to the frontend build
  // copied next to the backend in the image (/app/frontend/dist).
  frontendDistPath:
    process.env.FRONTEND_DIST_PATH ?? path.resolve(__dirname, '../../frontend/dist'),

  flashpointPath,
  flashpointDbPath: `${flashpointPath}/Data/flashpoint.sqlite`,
  flashpointHtdocsPath: `${flashpointPath}/Legacy/htdocs`,
  flashpointImagesPath: `${flashpointPath}/Data/Images`,
  flashpointLogosPath: `${flashpointPath}/Data/Logos`,
  flashpointPlaylistsPath: `${flashpointPath}/Data/Playlists`,
  flashpointGamesPath: `${flashpointPath}/Data/Games`,

  // Auth cookie Secure flag. 'auto' (default) marks cookies Secure only on
  // requests that actually arrived over TLS, so one deployment can serve plain
  // HTTP on a LAN and HTTPS through a proxy. Force with COOKIE_SECURE=true|false.
  cookieSecure: parseCookieSecure(process.env.COOKIE_SECURE),

  // Primary origin, used where a single value is required (e.g. share links).
  domain: process.env.DOMAIN || 'http://localhost:5173',
  // DOMAIN accepts a comma-separated list so one deployment can be reached over
  // both a LAN address and a public domain. Normalized, so an explicit :80/:443
  // still matches the origin a browser actually sends.
  allowedOrigins: parseOriginList(process.env.DOMAIN || 'http://localhost:5173'),

  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '', 10) || 60000,
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '', 10) || 100,

  logLevel: process.env.LOG_LEVEL || 'info',
  logFile:
    process.env.LOG_FILE ||
    (process.env.NODE_ENV === 'production' ? '/app/logs/backend.log' : undefined),

  userDbPath: process.env.NODE_ENV === 'production' ? '/app/data/user.db' : './user.db',

  // Staging area for in-flight game downloads. Must sit on a mounted volume:
  // packs run to hundreds of megabytes, and the container's own layer is both
  // size-constrained and unwritable when PUID moves off the image build UID.
  tempDownloadsPath:
    process.env.NODE_ENV === 'production' ? '/app/data/temp-downloads' : './temp-downloads',

  jwtSecret: getJwtSecret(),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',

  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '', 10) || 10,

  homeRecentHours: parseInt(process.env.HOME_RECENT_HOURS || '', 10) || 24,

  // When enabled, copies flashpoint.sqlite to local storage for faster network access
  enableLocalDbCopy: process.env.ENABLE_LOCAL_DB_COPY === 'true',
  localDbPath: '/app/data/flashpoint.sqlite',

  sqliteCacheSize: (() => {
    const parsed = parseInt(process.env.SQLITE_CACHE_SIZE ?? '', 10);
    return isNaN(parsed) ? -64000 : parsed; // Negative = KB (-64000 = 64MB)
  })(),
  sqliteMmapSize: (() => {
    const parsed = parseInt(process.env.SQLITE_MMAP_SIZE ?? '', 10);
    return isNaN(parsed) ? 268435456 : parsed; // 256MB
  })(),
  enableCachePrewarm: process.env.ENABLE_CACHE_PREWARM !== 'false',

  // Auto-detected from version.txt; affects metadata sync and image path availability
  flashpointEdition: flashpointVersion.edition,
  flashpointVersionString: flashpointVersion.versionString,
  flashpointPackagedAt: flashpointVersion.packagedAt,
} as const;

/** Resolves external image CDN URLs from Flashpoint preferences, with hardcoded fallbacks. */
export async function getExternalImageUrls(): Promise<string[]> {
  const { ImageUrlService } = await import('./services/ImageUrlService');
  return ImageUrlService.getExternalImageUrls();
}
