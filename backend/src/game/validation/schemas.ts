import { z } from 'zod';

export const mountGameSchema = z.object({
  gameId: z
    .string()
    .min(1, 'Game ID is required')
    .max(255, 'Game ID is too long')
    .regex(/^[a-zA-Z0-9\-_]+$/, 'Game ID contains invalid characters'),
});

export const unmountGameSchema = mountGameSchema;

export const hostnameSchema = z
  .string()
  .min(2, 'Hostname is required') // Intentionally requires 2+ chars; single-char hostnames not supported for legacy content
  .max(253, 'Hostname is too long')
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9\-_.]*[a-zA-Z0-9]$/, {
    message: 'Invalid hostname format',
  });

export function validateGameId(gameId: unknown): string {
  const result = mountGameSchema.shape.gameId.safeParse(gameId);

  if (!result.success) {
    throw new Error(`Invalid game ID: ${result.error.issues[0].message}`);
  }

  return result.data;
}

export function validateHostname(hostname: unknown): string {
  const result = hostnameSchema.safeParse(hostname);

  if (!result.success) {
    throw new Error(`Invalid hostname: ${result.error.issues[0].message}`);
  }

  return result.data;
}
