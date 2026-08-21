import axios from 'axios';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import AdmZip from 'adm-zip';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { config } from '../config';
import { CachedSystemSettingsService } from './CachedSystemSettingsService';

/**
 * Ruffle publishes both channels into a single releases feed, distinguished by
 * the GitHub prerelease flag: `nightly-YYYY-MM-DD` builds are prereleases,
 * `vX.Y.Z` releases are not.
 */
export const RUFFLE_CHANNELS = ['stable', 'nightly'] as const;
export type RuffleChannel = (typeof RUFFLE_CHANNELS)[number];
export const DEFAULT_RUFFLE_CHANNEL: RuffleChannel = 'stable';
export const RUFFLE_CHANNEL_SETTING_KEY = 'ruffle.channel';

export function isRuffleChannel(value: unknown): value is RuffleChannel {
  return RUFFLE_CHANNELS.includes(value as RuffleChannel);
}

interface GitHubAsset {
  name: string;
  browser_download_url: string;
}

interface GitHubRelease {
  tag_name: string;
  body: string | null;
  published_at: string;
  prerelease: boolean;
  draft: boolean;
  assets: GitHubAsset[];
}

export interface RuffleReleaseInfo {
  channel: RuffleChannel;
  version: string;
  downloadUrl: string;
  checksumUrl: string | null;
  publishedAt: string;
  changelog: string;
}

export interface RuffleUpdateCheck {
  currentVersion: string | null;
  installedChannel: RuffleChannel | null;
  channel: RuffleChannel;
  latestVersion: string;
  updateAvailable: boolean;
  channelSwitch: boolean;
  changelog?: string;
  publishedAt?: string;
}

/**
 * Errors meaning "this rename or unlink can never succeed at this path", as
 * opposed to a transient I/O failure:
 *   EXDEV      - overlay2 refuses to rename a directory that still lives in a
 *                read-only image layer, even within the same parent directory.
 *   EBUSY      - the path is a mount point (bind-mounted volume): it can be
 *                emptied but neither renamed nor unlinked.
 *   EPERM      - the same conditions as reported by Windows and some overlays.
 *   ENOTEMPTY  - rename onto a non-empty directory.
 */
const DIRECTORY_SWAP_FALLBACK_CODES: ReadonlySet<string> = new Set([
  'EXDEV',
  'EBUSY',
  'EPERM',
  'ENOTEMPTY',
]);

function swapFallbackCode(error: unknown): string | null {
  if (!(error instanceof Error) || !('code' in error)) {
    return null;
  }
  const code = (error as NodeJS.ErrnoException).code;
  return typeof code === 'string' && DIRECTORY_SWAP_FALLBACK_CODES.has(code) ? code : null;
}

export class RuffleService {
  private readonly installPath: string;
  private readonly bundledPath: string;
  private readonly githubApiUrl = 'https://api.github.com/repos/ruffle-rs/ruffle/releases';
  private readonly settings = CachedSystemSettingsService.getInstance();

  constructor() {
    // A built deployment installs onto the mounted data volume and serves it
    // from there: the frontend build is part of the image, so anything written
    // into it is discarded when the container is recreated. In development Vite
    // serves public/, which is the only directory reachable there.
    this.installPath = config.serveFrontend
      ? config.ruffleDataPath
      : path.resolve(__dirname, '../../../frontend/public/ruffle');
    this.bundledPath = path.join(config.frontendDistPath, 'ruffle');
  }

  /**
   * Normalize version string to YYYY-MM-DD format for comparison
   * Examples:
   *   "0.2.0-nightly.2026.1.22" -> "2026-01-22"
   *   "nightly-2026-01-22" -> "2026-01-22"
   *   "2026-01-22" -> "2026-01-22"
   */
  private normalizeVersion(version: string): string {
    // Handle npm package format: "0.2.0-nightly.2026.1.22"
    const npmMatch = version.match(/nightly\.(\d{4})\.(\d{1,2})\.(\d{1,2})/);
    if (npmMatch) {
      const [, year, month, day] = npmMatch;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // Handle GitHub tag format: "nightly-2026-01-22" or already normalized "2026-01-22"
    const githubMatch = version.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (githubMatch) {
      return githubMatch[0]; // Already in correct format
    }

    // Return as-is if no pattern matches
    return version;
  }

  getCurrentVersion(): string | null {
    try {
      const packageJsonPath = path.join(this.installPath, 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        return null;
      }
      const packageJson: { version?: string } = JSON.parse(
        fs.readFileSync(packageJsonPath, 'utf-8')
      );
      return packageJson.version ?? null;
    } catch (error) {
      logger.error('Error reading Ruffle version:', error);
      return null;
    }
  }

  /** Channel a build belongs to, read off the version string it reports. */
  private channelOfVersion(version: string): RuffleChannel {
    return /nightly/i.test(version) ? 'nightly' : 'stable';
  }

  /** Strip the channel prefix off a tag: `nightly-2026-08-01`, `v0.5.0`. */
  private releaseVersion(tagName: string): string {
    return tagName.replace(/^nightly-/, '').replace(/^v/, '');
  }

  /**
   * Compare two versions of the same channel. Nightlies order by build date,
   * stable releases by their numeric components — the two formats share no
   * ordering, which is why a channel switch is never decided by comparison.
   */
  private compareVersions(a: string, b: string, channel: RuffleChannel): number {
    if (channel === 'nightly') {
      const normalizedA = this.normalizeVersion(a);
      const normalizedB = this.normalizeVersion(b);
      return normalizedA < normalizedB ? -1 : normalizedA > normalizedB ? 1 : 0;
    }

    const parts = (version: string): number[] =>
      version
        .replace(/^v/, '')
        .split('-')[0]
        .split('.')
        .map((part) => {
          const parsed = parseInt(part, 10);
          return isNaN(parsed) ? 0 : parsed;
        });

    const partsA = parts(a);
    const partsB = parts(b);
    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
      const difference = (partsA[i] ?? 0) - (partsB[i] ?? 0);
      if (difference !== 0) {
        return difference < 0 ? -1 : 1;
      }
    }
    return 0;
  }

  private findSelfhostedAsset(release: GitHubRelease): GitHubAsset | null {
    return release.assets.find((asset) => asset.name.includes('web-selfhosted.zip')) ?? null;
  }

  private matchesChannel(release: GitHubRelease, channel: RuffleChannel): boolean {
    if (release.draft) {
      return false;
    }
    return channel === 'nightly' ? release.prerelease : !release.prerelease;
  }

  /** The channel configured for downloads, independent of what is installed. */
  getConfiguredChannel(): RuffleChannel {
    try {
      const value = this.settings.get(RUFFLE_CHANNEL_SETTING_KEY);
      return isRuffleChannel(value) ? value : DEFAULT_RUFFLE_CHANNEL;
    } catch (error) {
      logger.warn('[RuffleService] Could not read the Ruffle channel setting:', error);
      return DEFAULT_RUFFLE_CHANNEL;
    }
  }

  setConfiguredChannel(channel: RuffleChannel, updatedBy?: number): void {
    this.settings.set(RUFFLE_CHANNEL_SETTING_KEY, channel, updatedBy);
    logger.info(`[RuffleService] Ruffle channel set to ${channel}`);
  }

  /** Channel of the installed build, or null when nothing is installed. */
  getInstalledChannel(): RuffleChannel | null {
    const version = this.getCurrentVersion();
    return version === null ? null : this.channelOfVersion(version);
  }

  private async fetchReleases(): Promise<GitHubRelease[]> {
    // Enough releases to build a combined changelog: roughly a month of nightlies.
    const response = await axios.get(`${this.githubApiUrl}?per_page=30`, {
      timeout: 10000,
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Flashpoint-Web',
      },
    });

    const releases = response.data as GitHubRelease[] | null;
    if (!releases || releases.length === 0) {
      throw new Error('No releases found');
    }
    return releases;
  }

  /** GitHub defines this endpoint as the newest non-draft, non-prerelease. */
  private async fetchLatestStableRelease(): Promise<GitHubRelease> {
    const response = await axios.get(`${this.githubApiUrl}/latest`, {
      timeout: 10000,
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Flashpoint-Web',
      },
    });
    return response.data as GitHubRelease;
  }

  /**
   * Get the latest Ruffle release on a channel
   * @param channel Channel to look on
   * @param currentVersion Optional current version to build combined changelog from
   */
  async getLatestVersion(
    channel: RuffleChannel,
    currentVersion?: string | null
  ): Promise<RuffleReleaseInfo> {
    try {
      const releases = await this.fetchReleases();

      let latestRelease =
        releases.find(
          (release) =>
            this.matchesChannel(release, channel) && this.findSelfhostedAsset(release) !== null
        ) ?? null;

      if (latestRelease === null && channel === 'stable') {
        // Stable releases are months apart, so the newest one can sit outside
        // the recent page the changelog is built from.
        const latestStable = await this.fetchLatestStableRelease();
        if (this.findSelfhostedAsset(latestStable) !== null) {
          latestRelease = latestStable;
        }
      }

      const latestAsset = latestRelease === null ? null : this.findSelfhostedAsset(latestRelease);
      if (latestRelease === null || latestAsset === null) {
        throw new Error(`No ${channel} release with web-selfhosted.zip found`);
      }

      // Look for corresponding checksum file
      const checksumAsset = latestRelease.assets.find(
        (asset) =>
          asset.name === `${latestAsset.name}.sha256` ||
          asset.name === 'SHA256SUMS' ||
          asset.name === 'checksums.txt'
      );

      return {
        channel,
        version: this.releaseVersion(latestRelease.tag_name),
        downloadUrl: latestAsset.browser_download_url,
        checksumUrl: checksumAsset?.browser_download_url ?? null,
        publishedAt: latestRelease.published_at,
        changelog: this.buildCombinedChangelog(releases, channel, latestRelease, currentVersion),
      };
    } catch (error) {
      logger.error('Error fetching latest Ruffle version:', error);
      throw new AppError(500, 'Failed to check for Ruffle updates');
    }
  }

  /**
   * Build a combined changelog from all releases on a channel since the current version
   * @param releases Array of GitHub releases (newest first)
   * @param channel Channel being checked
   * @param latestRelease The release that would be installed
   * @param currentVersion Optional current version string, on the same channel
   * @returns Combined changelog markdown with version headers
   */
  private buildCombinedChangelog(
    releases: GitHubRelease[],
    channel: RuffleChannel,
    latestRelease: GitHubRelease,
    currentVersion?: string | null
  ): string {
    const latestBody = latestRelease.body?.trim() || 'No changelog available.';

    if (!currentVersion) {
      logger.debug('[RuffleService] No current version, returning latest changelog only');
      return latestBody;
    }

    logger.debug(`[RuffleService] Building ${channel} changelog since ${currentVersion}`);

    const newerReleases = releases.filter((release) => {
      if (!this.matchesChannel(release, channel) || this.findSelfhostedAsset(release) === null) {
        return false;
      }
      return (
        this.compareVersions(this.releaseVersion(release.tag_name), currentVersion, channel) > 0
      );
    });

    logger.info(
      `[RuffleService] Found ${newerReleases.length} ${channel} releases newer than ${currentVersion}`
    );

    if (newerReleases.length === 0) {
      return latestBody;
    }

    const sortedReleases = [...newerReleases].sort((a, b) =>
      this.compareVersions(
        this.releaseVersion(b.tag_name),
        this.releaseVersion(a.tag_name),
        channel
      )
    );

    return sortedReleases
      .map(
        (release) =>
          `## ${release.tag_name}\n\n${release.body?.trim() || 'No changelog available.'}`
      )
      .join('\n\n---\n\n');
  }

  async checkForUpdate(channel?: RuffleChannel): Promise<RuffleUpdateCheck> {
    const targetChannel = channel ?? this.getConfiguredChannel();
    const currentVersion = this.getCurrentVersion();
    const installedChannel = currentVersion === null ? null : this.channelOfVersion(currentVersion);

    // A version from the other channel cannot bound this channel's history:
    // a nightly date says nothing about which stable releases are new.
    const changelogSince = installedChannel === targetChannel ? currentVersion : null;
    const latest = await this.getLatestVersion(targetChannel, changelogSince);

    const channelSwitch = installedChannel !== null && installedChannel !== targetChannel;

    // Only flag as "update available" when Ruffle is already installed but outdated.
    // When not installed (null), the server auto-installs at startup — no need to show update UI.
    const updateAvailable =
      currentVersion !== null &&
      (channelSwitch || this.compareVersions(currentVersion, latest.version, targetChannel) !== 0);

    return {
      currentVersion,
      installedChannel,
      channel: targetChannel,
      latestVersion: latest.version,
      updateAvailable,
      channelSwitch,
      changelog: latest.changelog,
      publishedAt: latest.publishedAt,
    };
  }

  /**
   * Verify SHA-256 checksum of downloaded ZIP file
   * @param zipBuffer The downloaded ZIP file buffer
   * @param checksumUrl URL to download the checksum file from
   * @param zipFileName Original ZIP filename (for matching in multi-file checksum lists)
   * @returns true if verification succeeds or is skipped (no checksum file)
   * @throws Error if checksum validation fails
   */
  private async verifyChecksum(
    zipBuffer: Buffer,
    checksumUrl: string | null,
    zipFileName: string
  ): Promise<void> {
    if (!checksumUrl) {
      logger.warn(
        '[RuffleService] No checksum file available for verification - skipping integrity check'
      );
      return;
    }

    try {
      logger.info(`[RuffleService] Downloading checksum file from ${checksumUrl}`);

      // Download checksum file
      const checksumResponse = await axios.get(checksumUrl, {
        responseType: 'text',
        timeout: 10000,
        headers: {
          'User-Agent': 'Flashpoint-Web',
        },
      });

      const checksumContent = checksumResponse.data as string;

      // Compute SHA-256 of downloaded ZIP
      const computedHash = crypto.createHash('sha256').update(zipBuffer).digest('hex');

      logger.debug(`[RuffleService] Computed SHA-256: ${computedHash}`);

      // Parse checksum file - handle two formats:
      // 1. Single hash file (*.sha256): just the hash string
      // 2. Multi-file checksum list (SHA256SUMS): "hash  filename" per line
      let expectedHash: string | null = null;

      if (checksumContent.includes(zipFileName)) {
        // Format: "hash  filename" - find line matching our ZIP filename
        const lines = checksumContent.split('\n');
        const matchingLine = lines.find((line) => line.includes(zipFileName));
        if (matchingLine) {
          expectedHash = matchingLine.split(/\s+/)[0];
        }
      } else {
        // Format: single hash file - trim whitespace
        expectedHash = checksumContent.trim().split(/\s+/)[0];
      }

      if (!expectedHash) {
        logger.warn(
          `[RuffleService] Could not extract expected hash from checksum file - skipping verification`
        );
        return;
      }

      logger.debug(`[RuffleService] Expected SHA-256: ${expectedHash}`);

      // Compare hashes (case-insensitive)
      if (computedHash.toLowerCase() !== expectedHash.toLowerCase()) {
        throw new Error(
          `SHA-256 checksum mismatch! Expected: ${expectedHash}, Got: ${computedHash}`
        );
      }

      logger.info('[RuffleService] SHA-256 checksum verification passed');
    } catch (error) {
      // Always re-throw when a checksum URL was explicitly provided —
      // skipping verification only when no checksum file exists in the release.
      // This prevents an attacker who can block the checksum URL from
      // forcing verification bypass while the tampered ZIP goes through.
      logger.error('[RuffleService] Checksum verification failed:', error);
      const message = error instanceof Error ? error.message : 'Unknown checksum error';
      throw new Error(`Checksum verification failed: ${message}`);
    }
  }

  /**
   * Copy a directory tree. Hand-rolled rather than fs.cpSync, which is still
   * experimental on the Node 20 runtime the container image ships.
   */
  private copyDirectory(source: string, target: string): void {
    fs.mkdirSync(target, { recursive: true });
    for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
      const from = path.join(source, entry.name);
      const to = path.join(target, entry.name);
      if (entry.isDirectory()) {
        this.copyDirectory(from, to);
      } else if (entry.isSymbolicLink()) {
        fs.rmSync(to, { force: true });
        fs.symlinkSync(fs.readlinkSync(from), to);
      } else {
        fs.copyFileSync(from, to);
      }
    }
  }

  /** Empty a directory without unlinking it — the only option for a mount point. */
  private clearDirectory(dir: string): void {
    for (const entry of fs.readdirSync(dir)) {
      fs.rmSync(path.join(dir, entry), { recursive: true, force: true });
    }
  }

  private removeDirectory(dir: string): void {
    if (!fs.existsSync(dir)) {
      return;
    }
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch (error: unknown) {
      if (swapFallbackCode(error) === null) {
        throw error;
      }
      this.clearDirectory(dir);
    }
  }

  /**
   * Move `source` over `target`, replacing whatever is there. Prefers an atomic
   * rename, then falls back to copying the contents in place: a rename cannot
   * be the only strategy because it fails with EXDEV when the source is an
   * unmodified image-layer directory under overlay2, and with EBUSY when either
   * path is a bind-mounted volume.
   */
  private replaceDirectory(source: string, target: string): void {
    this.removeDirectory(target);

    // An existing target here means removal fell back to emptying a mount
    // point, so the path cannot be a rename destination either.
    if (!fs.existsSync(target)) {
      try {
        fs.renameSync(source, target);
        return;
      } catch (error: unknown) {
        const code = swapFallbackCode(error);
        if (code === null) {
          throw error;
        }
        logger.warn(
          `[RuffleService] Cannot rename ${source} to ${target} (${code}), copying instead`
        );
      }
    }

    this.copyDirectory(source, target);

    // The replace has succeeded once the destination is complete. Failing here
    // would report failure with a good copy in place, and the caller would roll
    // back over it; the leftover source is retried by the next removal instead.
    try {
      this.removeDirectory(source);
    } catch (error: unknown) {
      logger.warn(`[RuffleService] Copied to ${target} but could not remove ${source}:`, error);
    }
  }

  /** Relative path -> byte size for every file in a tree. */
  private describeTree(dir: string, prefix = ''): Map<string, number> {
    const files = new Map<string, number>();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        for (const [nested, size] of this.describeTree(fullPath, relativePath)) {
          files.set(nested, size);
        }
      } else if (!entry.isSymbolicLink()) {
        files.set(relativePath, fs.statSync(fullPath).size);
      }
    }
    return files;
  }

  /**
   * Compare the installed tree against what was extracted. `verifyInstallation`
   * only proves ruffle.js exists, which an interrupted copy can satisfy while
   * leaving the rest of the tree missing or short.
   */
  private findInstallMismatch(expected: ReadonlyMap<string, number>): string | null {
    let installed: Map<string, number>;
    try {
      installed = this.describeTree(this.installPath);
    } catch (error: unknown) {
      return `installed files could not be read (${error instanceof Error ? error.message : 'unknown error'})`;
    }

    for (const [relativePath, size] of expected) {
      const installedSize = installed.get(relativePath);
      if (installedSize === undefined) {
        return `missing ${relativePath}`;
      }
      if (installedSize !== size) {
        return `${relativePath} is ${installedSize} bytes, expected ${size}`;
      }
    }
    return null;
  }

  async updateRuffle(channel?: RuffleChannel): Promise<{
    success: boolean;
    version: string;
    channel: RuffleChannel;
    message: string;
  }> {
    const targetChannel = channel ?? this.getConfiguredChannel();
    try {
      const latest = await this.getLatestVersion(targetChannel);
      logger.info(`[RuffleService] Downloading Ruffle ${latest.version} (${targetChannel})...`);

      // Download zip file
      const response = await axios.get(latest.downloadUrl, {
        responseType: 'arraybuffer',
        timeout: 60000, // 60 seconds for download
        headers: {
          'User-Agent': 'Flashpoint-Web',
        },
      });

      const zipBuffer = Buffer.from(response.data);
      logger.info('[RuffleService] Download complete, verifying integrity...');

      // Extract filename from URL for checksum verification
      const zipFileName = latest.downloadUrl.split('/').pop() || 'ruffle.zip';

      // Verify SHA-256 checksum before extraction
      await this.verifyChecksum(zipBuffer, latest.checksumUrl, zipFileName);

      logger.info('[RuffleService] Integrity verification complete, extracting...');

      // Extract zip to temporary directory
      const zip = new AdmZip(zipBuffer);
      const tempDir = path.join(this.installPath, '../ruffle-temp');

      // Clean temp directory if exists
      this.removeDirectory(tempDir);
      fs.mkdirSync(tempDir, { recursive: true });

      // Zip Slip protection: validate all entry paths BEFORE extraction
      const resolvedTempDir = path.resolve(tempDir);
      for (const entry of zip.getEntries()) {
        const resolvedEntry = path.resolve(tempDir, entry.entryName);
        if (
          !resolvedEntry.startsWith(resolvedTempDir + path.sep) &&
          resolvedEntry !== resolvedTempDir
        ) {
          this.removeDirectory(tempDir);
          throw new Error('Zip Slip detected: archive contains path traversal entry');
        }
      }

      // Extract all files (safe after validation)
      zip.extractAllTo(tempDir, true);

      logger.info('[RuffleService] Extraction complete, installing...');

      // Backup current installation
      const backupDir = path.join(this.installPath, '../ruffle-backup');
      let backedUp = false;

      const expectedFiles = this.describeTree(tempDir);

      try {
        if (fs.existsSync(this.installPath)) {
          this.replaceDirectory(this.installPath, backupDir);
          backedUp = true;
        }

        // Move extracted files to public/ruffle
        this.replaceDirectory(tempDir, this.installPath);

        // Verify the installation was successful BEFORE deleting backup
        if (!this.verifyInstallation()) {
          throw new Error('Ruffle files were not installed successfully');
        }
        const mismatch = this.findInstallMismatch(expectedFiles);
        if (mismatch !== null) {
          throw new Error(`Ruffle installation is incomplete: ${mismatch}`);
        }
      } catch (installError) {
        this.removeDirectory(tempDir);
        if (backedUp && fs.existsSync(backupDir)) {
          try {
            this.replaceDirectory(backupDir, this.installPath);
            logger.info('[RuffleService] Restored previous installation after failed update');
          } catch (restoreError) {
            logger.error('[RuffleService] Failed to restore Ruffle backup:', restoreError);
          }
        }
        throw installError;
      }

      // Clean up backup only after successful verification
      this.removeDirectory(backupDir);

      logger.info('[RuffleService] Ruffle update completed successfully');

      return {
        success: true,
        version: latest.version,
        channel: targetChannel,
        message: `Successfully installed Ruffle ${latest.version} (${targetChannel})`,
      };
    } catch (error) {
      logger.error('[RuffleService] Error updating Ruffle:', error);

      // Provide more detailed error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new AppError(500, `Failed to update Ruffle: ${errorMessage}`);
    }
  }

  verifyInstallation(): boolean {
    try {
      const ruffleJsPath = path.join(this.installPath, 'ruffle.js');
      return fs.existsSync(ruffleJsPath);
    } catch (error) {
      return false;
    }
  }

  /**
   * Copy the Ruffle shipped inside the image into the install directory. A fresh
   * data volume otherwise has no player at all until a download finishes — and
   * never gets one on a host that cannot reach GitHub.
   */
  private seedFromBundle(): boolean {
    if (this.bundledPath === this.installPath) {
      return false;
    }
    if (!fs.existsSync(path.join(this.bundledPath, 'ruffle.js'))) {
      return false;
    }
    try {
      this.copyDirectory(this.bundledPath, this.installPath);
      logger.info(
        `✅ Ruffle seeded from the bundled copy (version: ${this.getCurrentVersion() ?? 'unknown'})`
      );
      return true;
    } catch (error: unknown) {
      logger.warn('[RuffleService] Could not seed Ruffle from the bundled copy:', error);
      return false;
    }
  }

  /**
   * Make a Ruffle available, preferring what is already installed, then the copy
   * baked into the image, and only then a download.
   */
  async ensureInstalled(): Promise<'present' | 'seeded' | 'downloaded'> {
    if (this.verifyInstallation()) {
      logger.info(`✅ Ruffle verified (version: ${this.getCurrentVersion() ?? 'unknown'})`);
      return 'present';
    }

    if (this.seedFromBundle()) {
      return 'seeded';
    }

    logger.info(
      `🎮 Ruffle not found, downloading the latest ${this.getConfiguredChannel()} build...`
    );
    await this.updateRuffle();
    logger.info('✅ Ruffle installation complete');
    return 'downloaded';
  }
}
