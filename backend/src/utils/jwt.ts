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
    expiresIn: config.jwtExpiresIn as string | number
  } as jwt.SignOptions);
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

/**
 * Shared Access Payload interface for temporary playlist access tokens
 */
export interface SharedAccessPayload {
  type: 'shared_access';
  shareToken: string;
  playlistId: number;
}

/**
 * Generate shared access token (60 minutes, non-refreshable)
 * Used for temporary access to shared playlists and their games
 * @param payload - Share token and playlist ID
 * @returns Signed JWT token
 */
export function generateSharedAccessToken(payload: Omit<SharedAccessPayload, 'type'>): string {
  return jwt.sign(
    { ...payload, type: 'shared_access' },
    config.jwtSecret,
    { expiresIn: '60m' } // 60 minutes, non-refreshable
  );
}

/**
 * Verify and decode shared access token
 * @param token - JWT token to verify
 * @returns Decoded shared access payload
 * @throws Error if token is invalid, expired, or wrong type
 */
export function verifySharedAccessToken(token: string): SharedAccessPayload {
  const payload = jwt.verify(token, config.jwtSecret) as SharedAccessPayload;
  if (payload.type !== 'shared_access') {
    throw new Error('Invalid token type');
  }
  return payload;
}
