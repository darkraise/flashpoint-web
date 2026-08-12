import { logger } from '../utils/logger';

/**
 * Tracks how far startup has progressed so the HTTP listener can open before the
 * slow work finishes. On a network mount the database copy and cache pre-warm
 * take long enough that a browser hitting the port meanwhile would otherwise get
 * a connection error instead of a page.
 */
export class StartupState {
  private static ready = false;
  private static phase = 'Starting up';

  static isReady(): boolean {
    return this.ready;
  }

  static getPhase(): string {
    return this.phase;
  }

  static setPhase(phase: string): void {
    if (this.ready) {
      return;
    }
    this.phase = phase;
    logger.info(`[Startup] ${phase}`);
  }

  static markReady(): void {
    this.ready = true;
    this.phase = 'Ready';
  }

  /** Test seam: startup state is process-wide and survives between suites. */
  static reset(): void {
    this.ready = false;
    this.phase = 'Starting up';
  }
}
