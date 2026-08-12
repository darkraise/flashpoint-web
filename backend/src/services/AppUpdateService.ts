import axios from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';
import { compareVersions, isReleaseVersion, normalizeVersion } from '../utils/version';

const LATEST_RELEASE_URL = 'https://api.github.com/repos/darkraise/flashpoint-web/releases/latest';
const CACHE_TTL_MS = 60 * 60 * 1000;
const FORCED_REFRESH_FLOOR_MS = 60 * 1000;
const REQUEST_TIMEOUT_MS = 10000;

export interface AppUpdateInfo {
  currentVersion: string | null;
  latestVersion: string | null;
  updateAvailable: boolean;
  isUnreleasedBuild: boolean;
  publishedAt: string | null;
  releaseUrl: string | null;
  changelog: string | null;
  checkedAt: string | null;
  lastCheckFailed: boolean;
}

interface CachedRelease {
  version: string;
  publishedAt: string | null;
  releaseUrl: string | null;
  changelog: string | null;
  fetchedAt: number;
}

interface GitHubRelease {
  tag_name?: unknown;
  published_at?: unknown;
  html_url?: unknown;
  body?: unknown;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/**
 * Reports whether a newer release of this app exists. Notify-only: nothing here
 * downloads, installs, or restarts anything.
 */
export class AppUpdateService {
  private static cached: CachedRelease | null = null;
  private static inFlight: Promise<CachedRelease> | null = null;
  private static lastCheckFailed = false;

  static async getUpdateInfo(force = false): Promise<AppUpdateInfo> {
    // A forced check still respects a 60s floor. Express rate limiting allows
    // 100 requests a minute, which is no protection for a GitHub quota of 60 an
    // hour that this shares with the star count and the Ruffle update check.
    const maxAge = force ? FORCED_REFRESH_FLOOR_MS : CACHE_TTL_MS;
    const age = this.cached === null ? Infinity : Date.now() - this.cached.fetchedAt;

    if (age >= maxAge) {
      try {
        await this.fetchLatestRelease();
        this.lastCheckFailed = false;
      } catch (error: unknown) {
        this.lastCheckFailed = true;
        logger.warn('[AppUpdate] Could not reach GitHub for the latest release', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return this.buildInfo();
  }

  /** Concurrent callers on a cold cache share one request. */
  private static async fetchLatestRelease(): Promise<CachedRelease> {
    if (this.inFlight !== null) {
      return this.inFlight;
    }

    this.inFlight = this.requestLatestRelease();

    try {
      const release = await this.inFlight;
      this.cached = release;
      return release;
    } finally {
      this.inFlight = null;
    }
  }

  private static async requestLatestRelease(): Promise<CachedRelease> {
    const response = await axios.get(LATEST_RELEASE_URL, {
      timeout: REQUEST_TIMEOUT_MS,
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Flashpoint-Web',
      },
    });

    const release = (response.data ?? {}) as GitHubRelease;
    const tagName = asString(release.tag_name);

    if (tagName === null) {
      throw new Error('GitHub release response carried no tag_name');
    }

    return {
      version: normalizeVersion(tagName),
      publishedAt: asString(release.published_at),
      releaseUrl: asString(release.html_url),
      changelog: asString(release.body),
      fetchedAt: Date.now(),
    };
  }

  private static buildInfo(): AppUpdateInfo {
    const currentVersion = config.appVersion;
    const isUnreleasedBuild = !isReleaseVersion(currentVersion);
    const latest = this.cached;

    const comparison =
      latest !== null && currentVersion !== null && !isUnreleasedBuild
        ? compareVersions(currentVersion, latest.version)
        : null;

    return {
      currentVersion,
      latestVersion: latest?.version ?? null,
      updateAvailable: comparison !== null && comparison < 0,
      isUnreleasedBuild,
      publishedAt: latest?.publishedAt ?? null,
      releaseUrl: latest?.releaseUrl ?? null,
      changelog: latest?.changelog ?? null,
      checkedAt: latest === null ? null : new Date(latest.fetchedAt).toISOString(),
      lastCheckFailed: this.lastCheckFailed,
    };
  }

  /** Drops the held release. Used by tests. */
  static clearCache(): void {
    this.cached = null;
    this.inFlight = null;
    this.lastCheckFailed = false;
  }
}
