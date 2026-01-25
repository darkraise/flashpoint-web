import { logger } from '../utils/logger';
import { RuffleService } from '../services/RuffleService';

/**
 * Background job that periodically checks for Ruffle updates and installs them
 */
export class RuffleUpdateJob {
  private ruffleService: RuffleService;

  constructor() {
    this.ruffleService = new RuffleService();
  }

  /**
   * Run the Ruffle update job
   * Checks for updates and installs if available
   */
  async run(): Promise<string> {
    try {
      logger.info('[RuffleUpdateJob] Starting Ruffle update job...');

      // Check if Ruffle is installed
      const isInstalled = this.ruffleService.verifyInstallation();
      if (!isInstalled) {
        logger.warn('[RuffleUpdateJob] Ruffle not installed, skipping update check');
        return 'Ruffle not installed, skipped';
      }

      // Check for updates
      logger.info('[RuffleUpdateJob] Checking for Ruffle updates...');
      const updateInfo = await this.ruffleService.checkForUpdate();

      if (!updateInfo.updateAvailable) {
        logger.info(
          `[RuffleUpdateJob] Ruffle is up to date (current: ${updateInfo.currentVersion})`
        );
        return `Ruffle is up to date (${updateInfo.currentVersion})`;
      }

      logger.info(
        `[RuffleUpdateJob] Update available - Current: ${updateInfo.currentVersion}, Latest: ${updateInfo.latestVersion}`
      );

      // Install update
      logger.info('[RuffleUpdateJob] Installing Ruffle update...');
      const result = await this.ruffleService.updateRuffle();

      if (result.success) {
        logger.info(
          `[RuffleUpdateJob] Update completed successfully - Version: ${result.version}`
        );
        return `Ruffle updated to ${result.version}`;
      } else {
        logger.error(`[RuffleUpdateJob] Update failed: ${result.message}`);
        throw new Error(result.message || 'Ruffle update failed');
      }
    } catch (error) {
      logger.error('[RuffleUpdateJob] Error running Ruffle update job:', error);
      throw error; // Re-throw so JobScheduler marks execution as failed
    }
  }
}
