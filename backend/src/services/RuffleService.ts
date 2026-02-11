import axios from 'axios';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import AdmZip from 'adm-zip';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

interface GitHubAsset {
  name: string;
  browser_download_url: string;
}

export class RuffleService {
  private readonly frontendPublicPath: string;
  private readonly githubApiUrl = 'https://api.github.com/repos/ruffle-rs/ruffle/releases';

  constructor() {
    this.frontendPublicPath = path.resolve(__dirname, '../../../frontend/public/ruffle');
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

  async getLatestVersion(): Promise<{
    version: string;
    downloadUrl: string;
    checksumUrl: string | null;
    publishedAt: string;
    changelog: string;
  }> {
    try {
      // Get latest nightly release (prereleases only)
      const response = await axios.get(`${this.githubApiUrl}?per_page=1`, {
        timeout: 10000,
        headers: {
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'Flashpoint-Web',
        },
      });

      const release = response.data[0];
      if (!release) {
        throw new Error('No releases found');
      }

      // Find web-selfhosted asset
      const asset = release.assets.find((a: GitHubAsset) => a.name.includes('web-selfhosted.zip'));

      if (!asset) {
        throw new Error('web-selfhosted.zip not found in release');
      }

      // Look for corresponding checksum file
      // Ruffle releases may include files like:
      // - ruffle-nightly-2024_01_01-web-selfhosted.zip.sha256
      // - SHA256SUMS (contains all checksums)
      const checksumAsset = release.assets.find(
        (a: GitHubAsset) =>
          a.name === `${asset.name}.sha256` || a.name === 'SHA256SUMS' || a.name === 'checksums.txt'
      );

      return {
        version: release.tag_name.replace('nightly-', ''),
        downloadUrl: asset.browser_download_url,
        checksumUrl: checksumAsset?.browser_download_url ?? null,
        publishedAt: release.published_at,
        changelog: release.body || 'No changelog available.',
      };
    } catch (error) {
      logger.error('Error fetching latest Ruffle version:', error);
      throw new AppError(500, 'Failed to check for Ruffle updates');
    }
  }

  async checkForUpdate(): Promise<{
    currentVersion: string | null;
    latestVersion: string;
    updateAvailable: boolean;
    changelog?: string;
    publishedAt?: string;
  }> {
    const currentVersion = this.getCurrentVersion();
    const latest = await this.getLatestVersion();

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
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
      fs.mkdirSync(tempDir, { recursive: true });

      // Zip Slip protection: validate all entry paths BEFORE extraction
      const resolvedTempDir = path.resolve(tempDir);
      for (const entry of zip.getEntries()) {
        const resolvedEntry = path.resolve(tempDir, entry.entryName);
        if (
          !resolvedEntry.startsWith(resolvedTempDir + path.sep) &&
          resolvedEntry !== resolvedTempDir
        ) {
          fs.rmSync(tempDir, { recursive: true, force: true });
          throw new Error('Zip Slip detected: archive contains path traversal entry');
        }
      }

      // Extract all files (safe after validation)
      zip.extractAllTo(tempDir, true);

      logger.info('[RuffleService] Extraction complete, installing...');

      // Backup current installation
      const backupDir = path.join(this.frontendPublicPath, '../ruffle-backup');
      if (fs.existsSync(this.frontendPublicPath)) {
        if (fs.existsSync(backupDir)) {
          fs.rmSync(backupDir, { recursive: true, force: true });
        }
        fs.renameSync(this.frontendPublicPath, backupDir);
      }

      // Move extracted files to public/ruffle
      fs.renameSync(tempDir, this.frontendPublicPath);

      // Verify the installation was successful BEFORE deleting backup
      const isInstalled = this.verifyInstallation();
      if (!isInstalled) {
        // Restore backup if verification fails
        if (fs.existsSync(backupDir)) {
          if (fs.existsSync(this.frontendPublicPath)) {
            fs.rmSync(this.frontendPublicPath, { recursive: true, force: true });
          }
          fs.renameSync(backupDir, this.frontendPublicPath);
          logger.info('[RuffleService] Restored backup after failed verification');
        }
        throw new Error('Ruffle files were not installed successfully');
      }

      // Clean up backup only after successful verification
      if (fs.existsSync(backupDir)) {
        fs.rmSync(backupDir, { recursive: true, force: true });
      }

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
