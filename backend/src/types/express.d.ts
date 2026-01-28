/**
 * Express Type Augmentation
 *
 * Extends Express Request interface to include authenticated user data.
 * This uses namespace syntax for module augmentation, which is the recommended
 * TypeScript pattern for extending third-party library types.
 */

import { AuthUser } from './auth';

declare global {
  namespace Express {
    interface Request {
      /**
       * Authenticated user information populated by auth middleware
       * - Set by authenticate() middleware (required auth)
       * - Set by optionalAuth() middleware (optional auth with guest fallback)
       * - Set by softAuth() middleware (optional auth, no guest fallback)
       */
      user?: AuthUser;
    }
  }
}
