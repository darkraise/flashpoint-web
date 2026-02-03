import { z } from 'zod';

/**
 * Validation schemas for game-service endpoints
 * Provides input validation to prevent security issues and malformed requests
 */

/**
 * Schema for mount endpoint
 * POST /mount/:gameId
 */
export const mountGameSchema = z.object({
  gameId: z
    .string()
    .min(1, 'Game ID is required')
    .max(255, 'Game ID is too long')
    .regex(/^[a-zA-Z0-9\-_]+$/, 'Game ID contains invalid characters'),
});

/**
 * Schema for unmount endpoint
 * DELETE /mount/:gameId
 */
export const unmountGameSchema = z.object({
  gameId: z
    .string()
    .min(1, 'Game ID is required')
    .max(255, 'Game ID is too long')
    .regex(/^[a-zA-Z0-9\-_]+$/, 'Game ID contains invalid characters'),
});

/**
 * Schema for file request path validation
 * GET /{path}
 */
export const filePathSchema = z.object({
  path: z
    .string()
    .min(1, 'Path is required')
    .max(2048, 'Path is too long')
    // Block null bytes and obviously malicious patterns
    .refine((path) => !path.includes('\0'), {
      message: 'Path contains null bytes',
    })
    .refine((path) => !path.includes('\\'), {
      message: 'Path contains backslashes (use forward slashes)',
    })
    // URL-encoded traversal attempts
    .refine((path) => !path.match(/\.\.%2[fF]/), {
      message: 'Path contains URL-encoded directory traversal',
    })
    .refine((path) => !path.match(/\.\.%5[cC]/), {
      message: 'Path contains URL-encoded directory traversal',
    }),
});

/**
 * Schema for hostname validation
 */
export const hostnameSchema = z
  .string()
  .min(1, 'Hostname is required')
  .max(253, 'Hostname is too long')
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9\-_.]*[a-zA-Z0-9]$/, {
    message: 'Invalid hostname format',
  });

/**
 * Schema for file request (combined hostname + path)
 */
export const fileRequestSchema = z.object({
  hostname: hostnameSchema,
  path: filePathSchema.shape.path,
});

/**
 * Validate and sanitize a game ID
 */
export function validateGameId(gameId: unknown): string {
  const result = mountGameSchema.shape.gameId.safeParse(gameId);

  if (!result.success) {
    throw new Error(`Invalid game ID: ${result.error.issues[0].message}`);
  }

  return result.data;
}

/**
 * Validate and sanitize a file path
 */
export function validateFilePath(filePath: unknown): string {
  const result = filePathSchema.shape.path.safeParse(filePath);

  if (!result.success) {
    throw new Error(`Invalid file path: ${result.error.issues[0].message}`);
  }

  return result.data;
}

/**
 * Validate and sanitize a hostname
 */
export function validateHostname(hostname: unknown): string {
  const result = hostnameSchema.safeParse(hostname);

  if (!result.success) {
    throw new Error(`Invalid hostname: ${result.error.issues[0].message}`);
  }

  return result.data;
}
