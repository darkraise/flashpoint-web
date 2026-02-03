import { logger } from '../utils/logger';
import { MetadataUpdateService } from '../services/MetadataUpdateService';
import { MetadataSyncService } from '../services/MetadataSyncService';
import { SyncStatusService } from '../services/SyncStatusService';

/**
 * Background job that periodically checks for metadata updates and syncs them
 */
export class MetadataSyncJob {
  private metadataUpdateService: MetadataUpdateService;
  private metadataSyncService: MetadataSyncService;
  private syncStatusService: SyncStatusService;

  constructor() {
    this.metadataUpdateService = new MetadataUpdateService();
    this.metadataSyncService = new MetadataSyncService();
    this.syncStatusService = SyncStatusService.getInstance();
  }

  /**
   * Run the metadata sync job
   * Checks for updates and syncs if available
   */
  async run(): Promise<string> {
    try {
      logger.info('[MetadataSyncJob] Starting metadata sync job...');

      // Check if a sync is already running
      const status = this.syncStatusService.getStatus();
      if (status.isRunning) {
        logger.warn('[MetadataSyncJob] Sync already in progress, skipping job run');
        return 'Sync already in progress, skipped';
      }

      // Check for updates
      logger.info('[MetadataSyncJob] Checking for metadata updates...');
      const updateInfo = await this.metadataUpdateService.getMetadataUpdateInfo();

      if (!updateInfo.hasUpdates) {
        logger.info('[MetadataSyncJob] No metadata updates available');
        return 'No updates available';
      }

      logger.info(
        `[MetadataSyncJob] Updates available - Games: ${updateInfo.gamesUpdateCount}, Tags: ${updateInfo.tagsUpdateCount}`
      );

      // Trigger sync
      logger.info('[MetadataSyncJob] Starting metadata sync...');
      const result = await this.metadataSyncService.syncMetadata();

      if (result.success) {
        const message = `Games updated: ${result.gamesUpdated}`;

        logger.info(
          `[MetadataSyncJob] Sync completed successfully - ` +
            `Games: ${result.gamesUpdated}, ` +
            `Tags: ${result.tagsUpdated}, ` +
            `Platforms: ${result.platformsUpdated}, ` +
            `Deleted: ${result.gamesDeleted}`
        );
        return message;
      } else {
        logger.error(`[MetadataSyncJob] Sync failed: ${result.error}`);
        throw new Error(result.error || 'Metadata sync failed');
      }
    } catch (error) {
      logger.error('[MetadataSyncJob] Error running metadata sync job:', error);
      throw error; // Re-throw so JobScheduler marks execution as failed
    }
  }
}
