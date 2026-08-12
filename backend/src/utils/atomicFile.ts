import { randomBytes } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from './logger';

/** Windows and SMB reject a rename while another process holds the target open. */
const RETRYABLE_RENAME_CODES: ReadonlySet<string> = new Set(['EPERM', 'EACCES', 'EBUSY', 'EEXIST']);
const RENAME_ATTEMPTS = 3;
const RENAME_RETRY_DELAY_MS = 60;

function isRetryableRenameError(error: unknown): boolean {
  if (!(error instanceof Error) || !('code' in error)) {
    return false;
  }
  const code = (error as NodeJS.ErrnoException).code;
  return typeof code === 'string' && RETRYABLE_RENAME_CODES.has(code);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Write a file so readers never observe a partial one: fill a sibling temp file,
 * then rename it into place. Several of these files are shared with the
 * Flashpoint Launcher, where a torn write corrupts the desktop app's own state.
 *
 * The temp file is unique per call — a fixed `.tmp` suffix collides when two
 * writers target the same path and produces exactly the corruption this avoids.
 *
 * Never falls back to writing in place: that would silently reintroduce the
 * torn-write window this exists to close.
 */
export async function writeFileAtomic(
  filePath: string,
  data: string | Buffer,
  options?: { encoding?: BufferEncoding }
): Promise<void> {
  const tempPath = `${filePath}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`;

  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(tempPath, data, options?.encoding ? { encoding: options.encoding } : {});

    for (let attempt = 1; ; attempt++) {
      try {
        await fs.rename(tempPath, filePath);
        return;
      } catch (error: unknown) {
        if (attempt >= RENAME_ATTEMPTS || !isRetryableRenameError(error)) {
          throw error;
        }
        await delay(RENAME_RETRY_DELAY_MS * attempt);
      }
    }
  } catch (error) {
    await fs.rm(tempPath, { force: true }).catch((cleanupError: unknown) => {
      logger.warn(`[atomicFile] Failed to remove temp file ${tempPath}:`, cleanupError);
    });
    throw error;
  }
}
