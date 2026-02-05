import path from 'path';
import { logger } from './logger';

/**
 * Path Security Utilities
 * Prevents directory traversal attacks and ensures paths stay within allowed directories
 */

/**
 * Check if a URL path has been double-encoded (indicates potential attack)
 * Double encoding: %252e%252e = %2e%2e (after first decode) = .. (after second decode)
 *
 * @param urlPath - The URL path to check
 * @returns true if double encoding is detected
 */
export function hasDoubleEncoding(urlPath: string): boolean {
  // Check for double-encoded sequences that would decode to dangerous patterns
  // %25 is the encoding for '%', so %252e = %2e, %252f = %2f, etc.
  // Double-encoding is a technique to bypass security filters that only decode once.
  const doubleEncodedPatterns = [
    /%25(?:2[eEfF]|5[cC])/gi, // %252e (%2e = .), %252f (%2f = /), %255c (%5c = \)
    /%25(?:00)/gi, // %2500 = double-encoded null byte
  ];

  for (const pattern of doubleEncodedPatterns) {
    if (pattern.test(urlPath)) {
      return true;
    }
  }

  return false;
}

/**
 * Sanitize an error message to prevent path leakage
 * Removes or redacts internal file system paths from error messages
 *
 * @param message - The error message to sanitize
 * @returns Sanitized error message safe for client response
 */
export function sanitizeErrorMessage(message: string): string {
  // Remove Windows absolute paths (e.g., C:\Users\..., D:\Flashpoint\...)
  let sanitized = message.replace(/[A-Za-z]:\\[^:\s'"]+/g, '[path]');

  // Remove Unix absolute paths (e.g., /home/user/..., /data/flashpoint/...)
  sanitized = sanitized.replace(/\/(?:home|data|usr|var|tmp|opt|etc)[^\s'"]+/gi, '[path]');

  // Remove network paths (e.g., \\server\share\...)
  sanitized = sanitized.replace(/\\\\[^\s'"]+/g, '[path]');

  // Remove any remaining paths that look like file paths with extensions
  sanitized = sanitized.replace(/[^\s'"]+\.[a-zA-Z]{2,4}(?:\s|$|["'])/g, '[file] ');

  return sanitized;
}

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
 * IMPORTANT: This function should be called BEFORE any URL decoding to catch
 * double-encoded attacks. The http module already decodes URLs once, so we
 * check for patterns that would become dangerous after a second decode.
 *
 * @param urlPath - The URL path to sanitize
 * @returns The sanitized path
 * @throws Error if dangerous characters are detected
 */
export function sanitizeUrlPath(urlPath: string): string {
  // Check for null bytes (can be used to bypass file extension checks)
  if (urlPath.includes('\0')) {
    logger.warn(`[Security] Null byte detected in URL path`);
    throw new Error('Invalid path: Null byte detected');
  }

  // Check for double-encoding attacks (G-H1)
  // Double-encoding can bypass security checks if the URL is decoded twice
  if (hasDoubleEncoding(urlPath)) {
    logger.warn(`[Security] Double-encoded path detected (potential attack)`);
    throw new Error('Invalid path: Double encoding detected');
  }

  // Check for other dangerous patterns
  // Note: We allow '..' because it will be handled by sanitizeAndValidatePath
  // But we check for obviously malicious patterns
  const dangerousPatterns = [
    /\.\.\\/g, // ..\ (Windows path traversal)
    /\.\.%2[fF]/g, // URL encoded ../
    /\.\.%5[cC]/g, // URL encoded ..\
    /%00/g, // URL encoded null byte
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(urlPath)) {
      logger.warn(`[Security] Dangerous pattern detected in URL path`);
      throw new Error('Invalid path: Dangerous pattern detected');
    }
  }

  // Decode URL once and check for traversal patterns after decoding
  // This catches cases where traversal sequences are single-encoded
  try {
    const decoded = decodeURIComponent(urlPath);

    // After decoding, check for null bytes that were encoded
    if (decoded.includes('\0')) {
      logger.warn(`[Security] Encoded null byte detected in URL path`);
      throw new Error('Invalid path: Null byte detected');
    }
  } catch (error) {
    // decodeURIComponent can throw on malformed sequences
    // This is acceptable - malformed URLs should be rejected
    if (error instanceof URIError) {
      logger.warn(`[Security] Malformed URL encoding detected`);
      throw new Error('Invalid path: Malformed URL encoding');
    }
    throw error;
  }

  return urlPath;
}
