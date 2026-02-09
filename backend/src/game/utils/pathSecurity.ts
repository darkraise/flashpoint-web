import path from 'path';
import { logger } from '../../utils/logger';

/**
 * Check if a URL path has been double-encoded (indicates potential attack).
 * %25 encodes '%', so %252e decodes to %2e then to '.', bypassing single-decode filters.
 */
export function hasDoubleEncoding(urlPath: string): boolean {
  const doubleEncodedPatterns = [
    /%25(?:2[eEfF]|5[cC])/i, // %252e (.), %252f (/), %255c (\)
    /%25(?:00)/i, // %2500 (null byte)
  ];

  for (const pattern of doubleEncodedPatterns) {
    if (pattern.test(urlPath)) {
      return true;
    }
  }

  return false;
}

/** Redacts internal file system paths from error messages to prevent path leakage */
export function sanitizeErrorMessage(message: string): string {
  let sanitized = message.replace(/[A-Za-z]:\\[^:\s'"]+/g, '[path]');
  sanitized = sanitized.replace(/\/(?:home|data|usr|var|tmp|opt|etc)[^\s'"]+/gi, '[path]');
  sanitized = sanitized.replace(/\\\\[^\s'"]+/g, '[path]');
  sanitized = sanitized.replace(/[^\s'"]+\.[a-zA-Z]{2,4}(?:\s|$|["'])/g, '[file] ');

  return sanitized;
}

/** Validates that a path stays within the allowed base directory (prevents directory traversal) */
export function sanitizeAndValidatePath(basePath: string, requestPath: string): string {
  const resolvedBase = path.resolve(basePath);
  const normalizedRequest = path.normalize(requestPath);
  const resolvedPath = path.resolve(resolvedBase, normalizedRequest);

  // Case-insensitive comparison on Windows
  const isWindows = process.platform === 'win32';

  if (isWindows) {
    const normalizedResolvedPath = resolvedPath.toLowerCase();
    const normalizedResolvedBase = resolvedBase.toLowerCase();

    if (!normalizedResolvedPath.startsWith(normalizedResolvedBase)) {
      logger.warn(`[Security] Path traversal attempt blocked: ${requestPath}`);
      logger.warn(`[Security] Resolved to: ${resolvedPath}`);
      logger.warn(`[Security] Base directory: ${resolvedBase}`);
      throw new Error('Invalid path: Directory traversal detected');
    }

    // Prevent sibling directory access (e.g., "htdocs-backup" when base is "htdocs")
    if (
      normalizedResolvedPath !== normalizedResolvedBase &&
      !normalizedResolvedPath.startsWith(normalizedResolvedBase + path.sep)
    ) {
      logger.warn(`[Security] Sibling directory access blocked: ${requestPath}`);
      logger.warn(`[Security] Resolved to: ${resolvedPath}`);
      logger.warn(`[Security] Base directory: ${resolvedBase}`);
      throw new Error('Invalid path: Path escapes allowed directory');
    }
  } else {
    if (!resolvedPath.startsWith(resolvedBase)) {
      logger.warn(`[Security] Path traversal attempt blocked: ${requestPath}`);
      logger.warn(`[Security] Resolved to: ${resolvedPath}`);
      logger.warn(`[Security] Base directory: ${resolvedBase}`);
      throw new Error('Invalid path: Directory traversal detected');
    }

    if (resolvedPath !== resolvedBase && !resolvedPath.startsWith(resolvedBase + path.sep)) {
      logger.warn(`[Security] Sibling directory access blocked: ${requestPath}`);
      logger.warn(`[Security] Resolved to: ${resolvedPath}`);
      logger.warn(`[Security] Base directory: ${resolvedBase}`);
      throw new Error('Invalid path: Path escapes allowed directory');
    }
  }

  return resolvedPath;
}

/**
 * Sanitize a URL path. Must be called BEFORE URL decoding to catch double-encoded attacks.
 * The http module already decodes once, so we detect patterns dangerous after a second decode.
 */
export function sanitizeUrlPath(urlPath: string): string {
  if (urlPath.includes('\0')) {
    logger.warn(`[Security] Null byte detected in URL path`);
    throw new Error('Invalid path: Null byte detected');
  }

  if (hasDoubleEncoding(urlPath)) {
    logger.warn(`[Security] Double-encoded path detected (potential attack)`);
    throw new Error('Invalid path: Double encoding detected');
  }

  // '..' itself is allowed (handled by sanitizeAndValidatePath), but encoded traversal is not
  const dangerousPatterns = [
    /\.\.\\/, // ..\ (Windows path traversal)
    /\.\.%2[fF]/, // URL encoded ../
    /\.\.%5[cC]/, // URL encoded ..\
    /%00/, // URL encoded null byte
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(urlPath)) {
      logger.warn(`[Security] Dangerous pattern detected in URL path`);
      throw new Error('Invalid path: Dangerous pattern detected');
    }
  }

  try {
    const decoded = decodeURIComponent(urlPath);

    if (decoded.includes('\0')) {
      logger.warn(`[Security] Encoded null byte detected in URL path`);
      throw new Error('Invalid path: Null byte detected');
    }
  } catch (error) {
    if (error instanceof URIError) {
      logger.warn(`[Security] Malformed URL encoding detected`);
      throw new Error('Invalid path: Malformed URL encoding');
    }
    throw error;
  }

  return urlPath;
}
