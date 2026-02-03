import crypto from 'crypto';
import fs from 'fs';
import { logger } from '../utils/logger';

/**
 * Service for calculating and validating SHA256 hashes of files.
 * Uses streaming to handle large files efficiently.
 */
export class HashValidator {
  /**
   * Calculate SHA256 hash of a file using streaming.
   * Memory-efficient for large files.
   *
   * @param filePath - Absolute path to the file
   * @returns Promise resolving to hex string hash (lowercase)
   */
  static async calculateHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);

        stream.on('data', (chunk) => {
          hash.update(chunk);
        });

        stream.on('end', () => {
          const hashHex = hash.digest('hex').toLowerCase();
          logger.debug('Hash calculated', { filePath, hash: hashHex });
          resolve(hashHex);
        });

        stream.on('error', (error) => {
          logger.error('Error reading file for hash calculation:', { filePath, error });
          reject(new Error(`Failed to read file for hashing: ${error.message}`));
        });
      } catch (error) {
        logger.error('Error creating hash stream:', { filePath, error });
        reject(error);
      }
    });
  }

  /**
   * Validate that a file's hash matches the expected hash.
   * Comparison is case-insensitive.
   *
   * @param filePath - Absolute path to the file
   * @param expectedHash - Expected SHA256 hash (hex string)
   * @returns Promise resolving to true if valid, false if invalid
   * @throws Error if file cannot be read
   */
  static async validate(filePath: string, expectedHash: string): Promise<boolean> {
    const actualHash = await this.calculateHash(filePath);
    const expected = expectedHash.toLowerCase();
    const isValid = actualHash === expected;

    if (!isValid) {
      logger.warn('Hash validation failed', {
        filePath,
        expected,
        actual: actualHash,
      });
    }

    return isValid;
  }

  /**
   * Validate a file's hash and throw an error if it doesn't match.
   *
   * @param filePath - Absolute path to the file
   * @param expectedHash - Expected SHA256 hash (hex string)
   * @param source - Source name for error messages
   * @throws Error if hash doesn't match or file cannot be read
   */
  static async validateOrThrow(
    filePath: string,
    expectedHash: string,
    source?: string
  ): Promise<void> {
    const isValid = await this.validate(filePath, expectedHash);

    if (!isValid) {
      const sourceInfo = source ? ` from ${source}` : '';
      throw new Error(
        `Hash validation failed${sourceInfo}: File hash does not match expected SHA256`
      );
    }
  }

  /**
   * Calculate hash and return both the hash and file size.
   * Useful for download verification.
   *
   * @param filePath - Absolute path to the file
   * @returns Promise resolving to object with hash and size
   */
  static async calculateHashWithSize(filePath: string): Promise<{ hash: string; size: number }> {
    const hash = await this.calculateHash(filePath);
    const stats = await fs.promises.stat(filePath);

    return {
      hash,
      size: stats.size,
    };
  }
}
