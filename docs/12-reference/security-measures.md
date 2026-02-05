# Security Measures Reference

## Overview

This document catalogs all security measures implemented in the Flashpoint Web
application, addressing OWASP Top 10 vulnerabilities and security best
practices.

---

## Authentication & Authorization

### JWT-Based Authentication

**Implementation**: `backend/src/middleware/auth.ts`

- ✅ JWT tokens for stateless authentication
- ✅ Access tokens (1 hour expiry)
- ✅ Refresh tokens (7 days expiry)
- ✅ Token rotation on refresh
- ✅ Automatic token cleanup on logout

**Security Features**:

- Secret key from environment variable
- Token signature verification
- Expiration validation
- User existence validation on each request

### Role-Based Access Control (RBAC)

**Implementation**: `backend/src/middleware/rbac.ts`

- ✅ Permission-based authorization
- ✅ Role hierarchy (admin, moderator, user, guest)
- ✅ Granular permissions (e.g., `games.play`, `users.manage`)
- ✅ Permission caching for performance

**Permission System**:

```typescript
requirePermission('settings.update');
requirePermission('users.read');
requirePermission('games.play');
```

### Password Security

**Implementation**: `backend/src/services/AuthService.ts`

- ✅ bcrypt hashing (10 rounds)
- ✅ Minimum password length (6 characters)
- ✅ Password validation with Zod schemas
- ✅ No password storage in plaintext

---

## Rate Limiting

### Login Endpoint Protection

**Implementation**: `backend/src/routes/auth.ts:17-38`

```typescript
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per IP
  skipSuccessfulRequests: false,
});
```

**Protection Against**:

- Brute force password attacks
- Credential stuffing
- Account enumeration

### Registration Endpoint Protection

**Implementation**: `backend/src/routes/auth.ts:41-61`

```typescript
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registrations per IP per hour
});
```

**Protection Against**:

- Account creation spam
- Resource exhaustion
- Abuse of registration system

---

## Input Validation

### Zod Schema Validation

**Implementation**: Throughout route files

**Examples**:

```typescript
// Login validation
const loginSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6),
});

// Registration validation
const registerSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(6),
});
```

**Validation Middleware**: `backend/src/middleware/validation.ts`

- ✅ Centralized validation error handling
- ✅ Type-safe request validation
- ✅ Automatic 400 Bad Request responses

### Path Traversal Prevention

**Status**: ✅ **Comprehensive Protection Implemented** (2026-01-29)

**Centralized Security Utilities**: `game-service/src/utils/pathSecurity.ts`

The game-service now has comprehensive directory traversal protection through
centralized validation utilities:

**1. Path Sanitization & Validation**:

```typescript
sanitizeAndValidatePath(basePath: string, requestPath: string): string
```

- Normalizes paths and ensures they stay within allowed directories
- Platform-aware (Windows/Unix)
- Blocks: `../`, absolute paths, null bytes, URL-encoded traversal

**2. URL Path Sanitization**:

```typescript
sanitizeUrlPath(urlPath: string): string
```

- Detects null bytes (`\0`)
- Blocks URL-encoded directory traversal (`..%2F`, `..%5C`)
- Blocks backslash path traversal (`..\\`)

**Implementation Coverage**:

**Legacy Server** (`game-service/src/legacy-server.ts`):

- ✅ URL path sanitization at entry point
- ✅ Path validation before all file access
- ✅ Separate validation for htdocs and cgi-bin paths

**GameZip Server** (`game-service/src/gamezipserver.ts`):

- ✅ URL path sanitization in file requests
- ✅ Mount ID validation (prevents path separators)
- ✅ ZIP path validation (ensures files within games directory)

**Test Coverage**: 17 tests (all passing) in `pathSecurity.test.ts`

**For detailed information**: See
`docs/13-security/directory-traversal-protection.md`

---

## DoS Protection

### Request Body Size Limits

**Game Service**: `game-service/src/gamezipserver.ts:307-324`

```typescript
private readBody(req: http.IncomingMessage, maxSize: number = 1024 * 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > maxSize) {
        req.destroy();
        reject(new Error('Request body too large'));
      }
    });
  });
}
```

**Protection**: 1MB maximum request size prevents memory exhaustion attacks

### ZIP Manager Memory Protection

**Implementation**: `game-service/src/zip-manager.ts:20-36`

```typescript
private mountedZips = new LRUCache<string, MountedZip>({
  max: 100, // Maximum 100 ZIPs mounted simultaneously
  ttl: 30 * 60 * 1000, // 30-minute TTL
  dispose: async (value, key) => {
    await value.zip.close(); // Auto-cleanup on eviction
  }
});
```

**Protection**:

- Prevents unlimited ZIP mounts
- Automatic cleanup of old mounts
- Resource leak prevention

---

## Logging & Monitoring

### Activity Logging

**Implementation**: `backend/src/middleware/activityLogger.ts`

**Tracked Actions**:

- User login/logout
- Resource creation/updates/deletions
- Permission changes
- Failed authentication attempts

**Logged Information**:

- User ID
- Action type
- Resource affected
- IP address
- Timestamp

### Sensitive Data Sanitization

**Implementation**: `backend/src/middleware/errorHandler.ts:18-42`

```typescript
function sanitizeBody(body: any): any {
  const sanitized = { ...body };
  const sensitiveFields = [
    'password',
    'currentPassword',
    'newPassword',
    'token',
    'refreshToken',
    'secret',
    'apiKey',
    'accessToken',
  ];

  sensitiveFields.forEach((field) => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });

  return sanitized;
}
```

**Protection**: Prevents passwords and tokens from appearing in logs

---

## CORS Configuration

### Backend Service (Restrictive)

**Implementation**: `backend/src/server.ts`

```typescript
cors({
  origin: process.env.DOMAIN || 'http://localhost:5173',
  credentials: true,
});
```

**Security**:

- ✅ Whitelist specific origin only
- ✅ Credentials allowed for authenticated requests
- ✅ Protects sensitive API endpoints

### Game Service (Permissive - Justified)

**Implementation**: `game-service/src/utils/cors.ts`

```typescript
res.setHeader('Access-Control-Allow-Origin', '*');
```

**Justification**: See `docs/12-reference/cors-security-decision.md`

- Serves public, read-only game content
- No sensitive data exposure
- Supports game embedding use cases

---

## SQL Injection Prevention

### Parameterized Queries

**Implementation**: Throughout `backend/src/services/`

**Example from GameService.ts**:

```typescript
const game = DatabaseService.get('SELECT * FROM game WHERE id = ?', [id]);
```

**Protection**:

- ✅ All database queries use parameterized statements
- ✅ No string concatenation in SQL queries
- ✅ Better-sqlite3 automatic escaping

---

## Error Handling

### Centralized Error Handler

**Implementation**: `backend/src/middleware/errorHandler.ts`

**Features**:

- ✅ Distinguishes operational vs programmer errors
- ✅ Generic error messages to clients (prevents information leakage)
- ✅ Detailed logging for debugging
- ✅ Sanitized request bodies in logs

**Example**:

```typescript
// Unhandled errors
logger.error('[UnhandledError]', {
  message: err.message,
  stack: err.stack,
  body: sanitizeBody(req.body), // Sensitive data redacted
});

// Client receives generic message
res.status(500).json({
  error: { message: 'Internal server error' },
});
```

---

## Frontend Security

### XSS Prevention

**React Built-in Protection**:

- ✅ Automatic escaping of JSX expressions
- ✅ No `dangerouslySetInnerHTML` usage
- ✅ Content Security Policy headers (if configured)

### Token Storage

**Current Implementation**: `frontend/src/store/auth.ts`

**Location**: localStorage

**Note**: Documented trade-off

- Vulnerable to XSS attacks
- Acceptable for low-risk application
- Consider HttpOnly cookies for higher security requirements

### Type Safety

**TypeScript Strict Mode**:

- ✅ No implicit `any` types
- ✅ Null/undefined checks
- ✅ Type-safe API calls

---

## Database Security

### Flashpoint Database

**Access Level**: READ-ONLY

- ✅ No write operations permitted
- ✅ Separate from user database
- ✅ File watching for external updates

### User Database

**Security Features**:

- ✅ SQLite with file-level permissions
- ✅ Schema migrations tracked
- ✅ Transaction support for data integrity
- ✅ Foreign key constraints enabled

---

## Graceful Shutdown

**Implementation**: `backend/src/server.ts:177-200`

**Cleanup on SIGTERM/SIGINT**:

- ✅ Stop scheduled jobs
- ✅ Stop permission cache cleanup
- ✅ Stop play session cleanup
- ✅ Close HTTP server gracefully
- ✅ Force exit after timeout

**Protection**: Prevents resource leaks and incomplete operations

---

## Security Checklist

### ✅ Implemented

- [x] Authentication (JWT)
- [x] Authorization (RBAC)
- [x] Password hashing (bcrypt)
- [x] Rate limiting (login, registration)
- [x] Input validation (Zod schemas)
- [x] SQL injection prevention (parameterized queries)
- [x] Path traversal prevention (comprehensive, with 17 test cases)
- [x] DoS protection (request size limits, LRU cache)
- [x] Sensitive data sanitization in logs
- [x] Activity logging
- [x] Error handling (centralized)
- [x] CORS configuration (restrictive for backend)
- [x] Graceful shutdown

### ⚠️ Recommended Enhancements

- [ ] HttpOnly cookies for refresh tokens (instead of localStorage)
- [ ] Content Security Policy headers
- [ ] Database indexes (requires Flashpoint Archive coordination)
- [ ] Security headers (Helmet middleware)
- [ ] HTTPS in production
- [ ] Rate limiting on all endpoints (currently only auth)

---

## References

- [OWASP Top 10 2021](https://owasp.org/www-project-top-ten/)
- [CORS Security Decision](./cors-security-decision.md)
- [Database Indexes](./database-indexes.md)
- [Authentication & Authorization](../10-features/authentication-authorization.md)

---

**Last Updated**: 2026-01-29 **Review Status**: Comprehensive (Enhanced path
traversal protection)
