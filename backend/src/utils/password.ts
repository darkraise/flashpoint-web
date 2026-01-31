import bcrypt from 'bcrypt';
import { config } from '../config';

/**
 * Hash a password using bcrypt
 * @param password - Plain text password
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, config.bcryptSaltRounds);
}

/**
 * Verify a password against a hash
 * @param password - Plain text password
 * @param hash - Hashed password to compare against
 * @returns True if password matches hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
