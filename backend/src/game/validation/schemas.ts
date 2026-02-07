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
 * Schema for unmount endpoint (reuses mountGameSchema)
 * DELETE /mount/:gameId
 */
export const unmountGameSchema = mountGameSchema;

/**
 * Schema for hostname validation
 */
export const hostnameSchema = z
  .string()
  .min(2, 'Hostname is required') // Intentionally requires 2+ chars; single-char hostnames not supported for legacy content
  .max(253, 'Hostname is too long')
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9\-_.]*[a-zA-Z0-9]$/, {
    message: 'Invalid hostname format',
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
 * Validate and sanitize a hostname
 */
export function validateHostname(hostname: unknown): string {
  const result = hostnameSchema.safeParse(hostname);

  if (!result.success) {
    throw new Error(`Invalid hostname: ${result.error.issues[0].message}`);
  }

  return result.data;
}
