import axios from 'axios';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import AdmZip from 'adm-zip';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { config } from '../config';

interface GitHubAsset {
  name: string;
  browser_download_url: string;
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
  private readonly frontendPublicPath: string;
  private readonly githubApiUrl = 'https://api.github.com/repos/ruffle-rs/ruffle/releases';

  constructor() {
    // Install into the directory that is actually served. In a built deployment
    // that is the frontend's dist output; in development Vite serves public/.
    // Pointing at public/ in a container made every fresh start re-download
    // Ruffle even though the image already ships it in dist/.
    this.frontendPublicPath = config.serveFrontend
      ? path.join(config.frontendDistPath, 'ruffle')
      : path.resolve(__dirname, '../../../frontend/public/ruffle');
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
      const packageJsonPath = path.join(this.frontendPublicPath, 'package.json');
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

  /**
   * Get latest Ruffle version info from GitHub releases
   * @param currentVersion Optional current version to build combined changelog from
   */
  async getLatestVersion(currentVersion?: string | null): Promise<{
    version: string;
    downloadUrl: string;
    checksumUrl: string | null;
    publishedAt: string;
    changelog: string;
  }> {
    try {
      // Fetch more releases to build combined changelog (covers ~1 month of nightly releases)
      const response = await axios.get(`${this.githubApiUrl}?per_page=30`, {
        timeout: 10000,
        headers: {
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'Flashpoint-Web',
        },
      });

      const releases = response.data;
      if (!releases || releases.length === 0) {
        throw new Error('No releases found');
      }

      // Find the latest release with web-selfhosted.zip asset
      let latestRelease = null;
      let latestAsset = null;

      for (const release of releases) {
        const asset = release.assets.find((a: GitHubAsset) =>
          a.name.includes('web-selfhosted.zip')
        );
        if (asset) {
          latestRelease = release;
          latestAsset = asset;
          break;
        }
      }

      if (!latestRelease || !latestAsset) {
        throw new Error('web-selfhosted.zip not found in any release');
      }

      // Look for corresponding checksum file
      const checksumAsset = latestRelease.assets.find(
        (a: GitHubAsset) =>
          a.name === `${latestAsset.name}.sha256` ||
          a.name === 'SHA256SUMS' ||
          a.name === 'checksums.txt'
      );

      // Build combined changelog from all releases since currentVersion
      const changelog = this.buildCombinedChangelog(releases, currentVersion);

      return {
        version: latestRelease.tag_name.replace('nightly-', ''),
        downloadUrl: latestAsset.browser_download_url,
        checksumUrl: checksumAsset?.browser_download_url ?? null,
        publishedAt: latestRelease.published_at,
        changelog,
      };
    } catch (error) {
      logger.error('Error fetching latest Ruffle version:', error);
      throw new AppError(500, 'Failed to check for Ruffle updates');
    }
  }

  /**
   * Build a combined changelog from all releases since the current version
   * @param releases Array of GitHub releases (newest first)
   * @param currentVersion Optional current version string
   * @returns Combined changelog markdown with version headers
   */
  private buildCombinedChangelog(
    releases: Array<{ tag_name: string; body: string | null; assets: GitHubAsset[] }>,
    currentVersion?: string | null
  ): string {
    // If no current version, just return the latest changelog
    if (!currentVersion) {
      logger.debug('[RuffleService] No current version, returning latest changelog only');
      return releases[0]?.body || 'No changelog available.';
    }

    const normalizedCurrent = this.normalizeVersion(currentVersion);
    logger.debug(
      `[RuffleService] Current version: ${currentVersion} -> normalized: ${normalizedCurrent}`
    );

    // Filter releases that have web-selfhosted.zip and are newer than current version
    const newerReleases = releases.filter((release) => {
      // Must have web-selfhosted asset
      const hasAsset = release.assets.some((a: GitHubAsset) =>
        a.name.includes('web-selfhosted.zip')
      );
      if (!hasAsset) {
        logger.debug(`[RuffleService] Release ${release.tag_name} skipped - no web-selfhosted.zip`);
        return false;
      }

      // Must be newer than current version
      const releaseVersion = this.normalizeVersion(release.tag_name);
      const isNewer = releaseVersion > normalizedCurrent;
      logger.debug(
        `[RuffleService] Release ${release.tag_name} -> ${releaseVersion}, isNewer: ${isNewer}`
      );
      return isNewer;
    });

    logger.info(
      `[RuffleService] Found ${newerReleases.length} releases newer than ${normalizedCurrent}`
    );

    if (newerReleases.length === 0) {
      return releases[0]?.body || 'No changelog available.';
    }

    // Sort by version descending (newest first)
    const sortedReleases = [...newerReleases].sort((a, b) => {
      const versionA = this.normalizeVersion(a.tag_name);
      const versionB = this.normalizeVersion(b.tag_name);
      return versionB.localeCompare(versionA);
    });

    // Build combined changelog with version headers
    const changelogParts = sortedReleases.map((release) => {
      const version = release.tag_name;
      const body = release.body?.trim() || 'No changelog available.';
      return `## ${version}\n\n${body}`;
    });

    return changelogParts.join('\n\n---\n\n');
  }

  async checkForUpdate(): Promise<{
    currentVersion: string | null;
    latestVersion: string;
    updateAvailable: boolean;
    changelog?: string;
    publishedAt?: string;
  }> {
    const currentVersion = this.getCurrentVersion();
    // Pass current version to get combined changelog of all updates since that version
    const latest = await this.getLatestVersion(currentVersion);

    // Normalize versions to same format (YYYY-MM-DD) for comparison
    const normalizedCurrent = currentVersion ? this.normalizeVersion(currentVersion) : null;
    const normalizedLatest = this.normalizeVersion(latest.version);

    // Only flag as "update available" when Ruffle is already installed but outdated.
    // When not installed (null), the server auto-installs at startup — no need to show update UI.
    const updateAvailable = normalizedCurrent !== null && normalizedCurrent !== normalizedLatest;

    return {
      currentVersion,
      latestVersion: latest.version,
      updateAvailable,
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
      installed = this.describeTree(this.frontendPublicPath);
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

  async updateRuffle(): Promise<{
    success: boolean;
    version: string;
    message: string;
  }> {
    try {
      const latest = await this.getLatestVersion();
      logger.info(`[RuffleService] Downloading Ruffle ${latest.version}...`);

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
      const tempDir = path.join(this.frontendPublicPath, '../ruffle-temp');

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
      const backupDir = path.join(this.frontendPublicPath, '../ruffle-backup');
      let backedUp = false;

      const expectedFiles = this.describeTree(tempDir);

      try {
        if (fs.existsSync(this.frontendPublicPath)) {
          this.replaceDirectory(this.frontendPublicPath, backupDir);
          backedUp = true;
        }

        // Move extracted files to public/ruffle
        this.replaceDirectory(tempDir, this.frontendPublicPath);

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
            this.replaceDirectory(backupDir, this.frontendPublicPath);
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
        message: `Successfully updated Ruffle to version ${latest.version}`,
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
      const ruffleJsPath = path.join(this.frontendPublicPath, 'ruffle.js');
      return fs.existsSync(ruffleJsPath);
    } catch (error) {
      return false;
    }
  }
}
