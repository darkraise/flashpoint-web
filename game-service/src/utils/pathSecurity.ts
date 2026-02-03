import path from 'path';
import { logger } from './logger';

/**
 * Path Security Utilities
 * Prevents directory traversal attacks and ensures paths stay within allowed directories
 */

/**
 * Sanitize and validate a file path to prevent directory traversal
 *
 * @param basePath - The base directory that the file must be within
 * @param requestPath - The requested path (may contain ../ or other traversal attempts)
 * @returns The validated absolute path
 * @throws Error if the path attempts to escape the base directory
 */
export function sanitizeAndValidatePath(basePath: string, requestPath: string): string {
  // Normalize the base path (resolve to absolute path)
  const resolvedBase = path.resolve(basePath);

  // Normalize and join the request path with base
  // path.normalize() converts '../' sequences and removes redundant separators
  const normalizedRequest = path.normalize(requestPath);

  // Join with base path and resolve to absolute path
  const resolvedPath = path.resolve(resolvedBase, normalizedRequest);

  // CRITICAL SECURITY CHECK: Ensure resolved path is within base directory
  // On Windows, paths are case-insensitive, so we need to handle that
  const isWindows = process.platform === 'win32';

  if (isWindows) {
    // Case-insensitive comparison for Windows
    const normalizedResolvedPath = resolvedPath.toLowerCase();
    const normalizedResolvedBase = resolvedBase.toLowerCase();

    if (!normalizedResolvedPath.startsWith(normalizedResolvedBase)) {
      logger.warn(`[Security] Path traversal attempt blocked: ${requestPath}`);
      logger.warn(`[Security] Resolved to: ${resolvedPath}`);
      logger.warn(`[Security] Base directory: ${resolvedBase}`);
      throw new Error('Invalid path: Directory traversal detected');
    }
  } else {
    // Case-sensitive comparison for Unix-like systems
    if (!resolvedPath.startsWith(resolvedBase)) {
      logger.warn(`[Security] Path traversal attempt blocked: ${requestPath}`);
      logger.warn(`[Security] Resolved to: ${resolvedPath}`);
      logger.warn(`[Security] Base directory: ${resolvedBase}`);
      throw new Error('Invalid path: Directory traversal detected');
    }
  }

  return resolvedPath;
}

/**
 * Validate that a path is within one of multiple allowed base directories
 *
 * @param allowedBases - Array of allowed base directories
 * @param requestPath - The requested path
 * @returns The validated absolute path
 * @throws Error if the path is not within any allowed base directory
 */
export function validatePathInAllowedDirectories(
  allowedBases: string[],
  requestPath: string
): string {
  // Try each base directory
  for (const basePath of allowedBases) {
    try {
      const validatedPath = sanitizeAndValidatePath(basePath, requestPath);
      return validatedPath;
    } catch (error) {
      // Path is not in this base, try next one
      continue;
    }
  }

  // Path is not in any allowed base directory
  logger.warn(`[Security] Path not in any allowed directory: ${requestPath}`);
  logger.warn(`[Security] Allowed bases: ${allowedBases.join(', ')}`);
  throw new Error('Invalid path: Not in any allowed directory');
}

/**
 * Sanitize a URL path component to prevent null bytes and other dangerous characters
 *
 * @param urlPath - The URL path to sanitize
 * @returns The sanitized path
 * @throws Error if dangerous characters are detected
 */
export function sanitizeUrlPath(urlPath: string): string {
  // Check for null bytes (can be used to bypass file extension checks)
  if (urlPath.includes('\0')) {
    logger.warn(`[Security] Null byte detected in URL path: ${urlPath}`);
    throw new Error('Invalid path: Null byte detected');
  }

  // Check for other dangerous patterns
  // Note: We allow '..' because it will be handled by sanitizeAndValidatePath
  // But we check for obviously malicious patterns
  const dangerousPatterns = [
    /\.\.\\/g, // ..\ (Windows path traversal)
    /\.\.%2[fF]/g, // URL encoded ../
    /\.\.%5[cC]/g, // URL encoded ..\
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(urlPath)) {
      logger.warn(`[Security] Dangerous pattern detected in URL path: ${urlPath}`);
      throw new Error('Invalid path: Dangerous pattern detected');
    }
  }

  return urlPath;
}
