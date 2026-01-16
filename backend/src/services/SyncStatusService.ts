import { logger } from '../utils/logger';

export interface SyncStatus {
  isRunning: boolean;
  stage: string;
  progress: number; // 0-100
  message: string;
  error?: string;
  result?: {
    success: boolean;
    gamesUpdated: number;
    gamesDeleted: number;
    tagsUpdated: number;
    platformsUpdated: number;
    timestamp: string;
  };
  startTime?: string;
  endTime?: string;
}

/**
 * Service to track metadata sync status and progress
 * Allows frontend to poll for real-time updates
 */
export class SyncStatusService {
  private static instance: SyncStatusService;
  private status: SyncStatus;

  private constructor() {
    this.status = {
      isRunning: false,
      stage: 'idle',
      progress: 0,
      message: 'No sync in progress'
    };
  }

  static getInstance(): SyncStatusService {
    if (!SyncStatusService.instance) {
      SyncStatusService.instance = new SyncStatusService();
    }
    return SyncStatusService.instance;
  }

  /**
   * Get current sync status
   */
  getStatus(): SyncStatus {
    return { ...this.status };
  }

  /**
   * Check if a sync is currently running
   */
  isRunning(): boolean {
    return this.status.isRunning;
  }

  /**
   * Start a new sync operation
   */
  startSync(): void {
    if (this.status.isRunning) {
      throw new Error('Sync already in progress');
    }

    this.status = {
      isRunning: true,
      stage: 'initializing',
      progress: 0,
      message: 'Starting metadata sync...',
      startTime: new Date().toISOString()
    };

    logger.info('[SyncStatus] Sync started');
  }

  /**
   * Update sync progress
   */
  updateProgress(stage: string, progress: number, message: string): void {
    this.status.stage = stage;
    this.status.progress = Math.min(100, Math.max(0, progress));
    this.status.message = message;

    logger.debug(`[SyncStatus] Progress: ${this.status.progress}% - ${stage} - ${message}`);
  }

  /**
   * Complete sync successfully
   */
  completeSync(result: SyncStatus['result']): void {
    this.status.isRunning = false;
    this.status.stage = 'completed';
    this.status.progress = 100;
    this.status.message = 'Sync completed successfully';
    this.status.result = result;
    this.status.endTime = new Date().toISOString();

    logger.info('[SyncStatus] Sync completed successfully', result);
  }

  /**
   * Mark sync as failed
   */
  failSync(error: string): void {
    this.status.isRunning = false;
    this.status.stage = 'failed';
    this.status.message = 'Sync failed';
    this.status.error = error;
    this.status.endTime = new Date().toISOString();

    logger.error('[SyncStatus] Sync failed:', error);
  }

  /**
   * Reset sync status
   */
  reset(): void {
    this.status = {
      isRunning: false,
      stage: 'idle',
      progress: 0,
      message: 'No sync in progress'
    };

    logger.debug('[SyncStatus] Status reset');
  }
}
