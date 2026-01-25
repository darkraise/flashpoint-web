import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import AdmZip from 'adm-zip';
import { AppError } from '../middleware/errorHandler';

/**
 * Service for managing Ruffle emulator versions
 */
export class RuffleService {
  private readonly frontendPublicPath: string;
  private readonly githubApiUrl = 'https://api.github.com/repos/ruffle-rs/ruffle/releases';

  constructor() {
    // Path to frontend's public/ruffle directory
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

  /**
   * Get the currently installed Ruffle version from local files
   */
  getCurrentVersion(): string | null {
    try {
      const packageJsonPath = path.join(this.frontendPublicPath, 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        return null;
      }
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      return packageJson.version || null;
    } catch (error) {
      console.error('Error reading Ruffle version:', error);
      return null;
    }
  }

  /**
   * Get latest nightly release from GitHub
   */
  async getLatestVersion(): Promise<{
    version: string;
    downloadUrl: string;
    publishedAt: string;
    changelog: string;
  }> {
    try {
      // Get latest nightly release (prereleases only)
      const response = await axios.get(`${this.githubApiUrl}?per_page=1`, {
        timeout: 10000,
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Flashpoint-Web'
        }
      });

      const release = response.data[0];
      if (!release) {
        throw new Error('No releases found');
      }

      // Find web-selfhosted asset
      const asset = release.assets.find((a: any) =>
        a.name.includes('web-selfhosted.zip')
      );

      if (!asset) {
        throw new Error('web-selfhosted.zip not found in release');
      }

      return {
        version: release.tag_name.replace('nightly-', ''),
        downloadUrl: asset.browser_download_url,
        publishedAt: release.published_at,
        changelog: release.body || 'No changelog available.'
      };
    } catch (error) {
      console.error('Error fetching latest Ruffle version:', error);
      throw new AppError(500, 'Failed to check for Ruffle updates');
    }
  }

  /**
   * Check if a Ruffle update is available
   */
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

    const updateAvailable = normalizedCurrent !== null && normalizedCurrent !== normalizedLatest;

    return {
      currentVersion,
      latestVersion: latest.version,
      updateAvailable,
      changelog: latest.changelog,
      publishedAt: latest.publishedAt
    };
  }

  /**
   * Download and install Ruffle from GitHub release
   */
  async updateRuffle(): Promise<{
    success: boolean;
    version: string;
    message: string;
  }> {
    try {
      const latest = await this.getLatestVersion();
      console.log(`[RuffleService] Downloading Ruffle ${latest.version}...`);

      // Download zip file
      const response = await axios.get(latest.downloadUrl, {
        responseType: 'arraybuffer',
        timeout: 60000, // 60 seconds for download
        headers: {
          'User-Agent': 'Flashpoint-Web'
        }
      });

      console.log('[RuffleService] Download complete, extracting...');

      // Extract zip to temporary directory
      const zip = new AdmZip(Buffer.from(response.data));
      const tempDir = path.join(this.frontendPublicPath, '../ruffle-temp');

      // Clean temp directory if exists
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
      fs.mkdirSync(tempDir, { recursive: true });

      // Extract all files
      zip.extractAllTo(tempDir, true);

      console.log('[RuffleService] Extraction complete, installing...');

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

      // Clean up backup
      if (fs.existsSync(backupDir)) {
        fs.rmSync(backupDir, { recursive: true, force: true });
      }

      // Verify the installation was successful
      const isInstalled = this.verifyInstallation();
      if (!isInstalled) {
        throw new Error('Ruffle files were not installed successfully');
      }

      console.log('[RuffleService] Ruffle update completed successfully');

      return {
        success: true,
        version: latest.version,
        message: `Successfully updated Ruffle to version ${latest.version}`
      };
    } catch (error) {
      console.error('[RuffleService] Error updating Ruffle:', error);

      // Provide more detailed error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new AppError(500, `Failed to update Ruffle: ${errorMessage}`);
    }
  }

  /**
   * Verify Ruffle files exist in the public directory
   */
  verifyInstallation(): boolean {
    try {
      const ruffleJsPath = path.join(this.frontendPublicPath, 'ruffle.js');
      return fs.existsSync(ruffleJsPath);
    } catch (error) {
      return false;
    }
  }
}
