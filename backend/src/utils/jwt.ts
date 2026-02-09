import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config';

export interface JWTPayload {
  userId: number;
  username: string;
  role: string;
}

export function generateAccessToken(payload: JWTPayload): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as string | number,
  } as jwt.SignOptions);
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString('hex');
}

export function verifyToken(token: string): JWTPayload {
  try {
    const payload = jwt.verify(token, config.jwtSecret, {
      algorithms: ['HS256'],
    }) as JWTPayload & { type?: string };

    // Reject shared access tokens used as regular auth tokens
    if (payload.type === 'shared_access') {
      throw new Error('Invalid token type');
    }

    return payload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw error;
  }
}

export interface SharedAccessPayload {
  type: 'shared_access';
  shareToken: string;
  playlistId: number;
}

/** Generate shared access token (60 minutes, non-refreshable). */
export function generateSharedAccessToken(payload: Omit<SharedAccessPayload, 'type'>): string {
  return jwt.sign({ ...payload, type: 'shared_access' }, config.jwtSecret, { expiresIn: '60m' });
}

export function verifySharedAccessToken(token: string): SharedAccessPayload {
  const payload = jwt.verify(token, config.jwtSecret, {
    algorithms: ['HS256'],
  }) as SharedAccessPayload;
  if (payload.type !== 'shared_access') {
    throw new Error('Invalid token type');
  }
  return payload;
}
