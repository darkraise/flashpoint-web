import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config';

/**
 * JWT Payload interface
 */
export interface JWTPayload {
  userId: number;
  username: string;
  role: string;
}

/**
 * Generate JWT access token (short-lived)
 * @param payload - User data to encode in the token
 * @returns Signed JWT token
 */
export function generateAccessToken(payload: JWTPayload): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn
  });
}

/**
 * Generate refresh token (long-lived, random string)
 * @returns Random hex string for refresh token
 */
export function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString('hex');
}

/**
 * Verify and decode JWT access token
 * @param token - JWT token to verify
 * @returns Decoded payload
 * @throws Error if token is invalid or expired
 */
export function verifyToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, config.jwtSecret) as JWTPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw error;
  }
}
