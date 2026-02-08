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

### Guest Access Validation

**Status**: ✅ **Hardened** (2026-02-07)

**Implementation**: `backend/src/middleware/auth.ts` and
`frontend/src/store/auth.ts`

- ✅ Guest users (id=0) excluded from shared access bypass in
  `validateSharedGameAccess`
- ✅ Guest permissions restricted to read-only: `games.read`,
  `playlists.read` only
- ✅ `games.play` removed from guest role (requires authentication)

### Data Integrity (Transaction Safety)

**Status**: ✅ **Hardened** (2026-02-07)

**Implementation**: Multiple backend services

All operations with TOCTOU (Time-of-Check-Time-of-Use) race conditions now
wrapped in database transactions:

- `AuthService.register()` — uniqueness checks + INSERT in single transaction
- `UserService.createUser()` — uniqueness checks + INSERT in single transaction
- `SystemSettingsService.updateCategory()` — multi-setting updates in single
  transaction
- `UserPlaylistService.cloneSharedPlaylist()` — playlist creation + game inserts
  in single transaction

**Protection**:

- ✅ Prevents duplicate user registration under concurrent requests
- ✅ Ensures atomic multi-row updates (all-or-nothing)
- ✅ Uses `better-sqlite3` synchronous transaction API for correctness

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

### Extended Zod Validation (2026-02-07)

**Status**: ✅ **Expanded** (2026-02-07)

Additional routes now use Zod validation for request bodies and query parameters:

- **community-playlists.ts**: `downloadUrl` validated with
  `z.string().url().max(2000)` to prevent extremely long URLs
- **shared-playlists.ts**: `newTitle` validated with
  `z.string().min(1).max(255).optional()` for title updates
- **cache.ts**: `cacheType` validated with
  `z.enum(['gameSearch', 'permissions', 'all']).optional()` to restrict cache
  invalidation targets
- **activities.ts**: `timeRange` validated against allowlist `['24h', '7d',
  '30d']` to prevent invalid time range parameters

**Protection**:

- ✅ Prevents malformed request bodies from reaching service layer
- ✅ Restricts query/body values to explicit allowlists
- ✅ Returns 400 Bad Request with validation errors
- ✅ Consistent validation patterns across all endpoints

### Route ID Parameter Validation

**Status**: ✅ **Hardened** (2026-02-06)

**Implementation**: All route files handling `/:id` parameters

Route ID parameters are now validated with `isNaN()` guard after `parseInt()`:

```typescript
// users.ts, roles.ts, etc.
const id = parseInt(req.params.id, 10);
if (isNaN(id)) {
  return res.status(400).json({ error: 'Invalid ID' });
}

// Safe to use in queries
const user = UserDatabaseService.get('SELECT * FROM users WHERE id = ?', [id]);
```

**Protection**:

- ✅ Prevents NaN parameters from reaching SQL queries
- ✅ Returns 400 Bad Request instead of misleading 404
- ✅ Provides clear error feedback to API consumers

### Query Parameter Limits

**Status**: ✅ **Hardened** (2026-02-06)

**Implementation**: Query parameters capped to prevent excessive queries

**Affected Endpoints**:

- `users.ts`: `limit` capped at 100
- `favorites.ts`: `limit` capped at 100
- `games.ts`: `/random` library param validated with Zod enum
- `playlists.ts`: Request bodies validated with Zod schemas
- `auth.ts`: Zod validation errors aggregate all messages

**Pattern**:

```typescript
const limit = Math.min(req.query.limit ? parseInt(req.query.limit as string) : 10, 100);
const games = GameService.getGames(limit);
```

**Protection**:

- ✅ Prevents clients from requesting `limit=999999` and dumping entire tables
- ✅ Reduces database load and query execution time
- ✅ Protects against unintentional DoS attacks

### Zod Error Aggregation

**Status**: ✅ **Hardened** (2026-02-06)

**Implementation**: `backend/src/routes/auth.ts`

Authentication endpoints now aggregate all Zod validation errors instead of showing only the first:

```typescript
// BEFORE: Only first error shown
res.status(400).json({ error: 'Username is required' });

// AFTER: All validation errors aggregated
res.status(400).json({
  error: 'Validation failed',
  details: [
    'Username is required',
    'Password must be at least 6 characters',
    'Email is invalid'
  ]
});
```

**Protection**:

- ✅ Provides complete feedback for form validation
- ✅ Helps API consumers fix all issues at once
- ✅ Reduces round-trip API calls

### Path Traversal Prevention

**Status**: ✅ **Comprehensive Protection Implemented** (2026-01-29)

**Centralized Security Utilities**: `backend/src/game/utils/pathSecurity.ts`

The backend game module has comprehensive directory traversal protection through
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

**Legacy Server** (`backend/src/game/legacy-server.ts`):

- ✅ URL path sanitization at entry point
- ✅ Path validation before all file access
- ✅ Separate validation for htdocs and CGI paths

**GameZip Server** (`backend/src/game/gamezipserver.ts`):

- ✅ URL path sanitization in file requests
- ✅ Mount ID validation (prevents path separators)
- ✅ ZIP path validation (ensures files within games directory)

**Test Coverage**: 17 tests (all passing) in `backend/src/game/utils/pathSecurity.test.ts`

**For detailed information**: See
`docs/13-security/directory-traversal-protection.md` (now covers backend game
module)

---

## DoS & Resource Exhaustion Protection

### Request Body Size Limits

**Backend Game Module**: `backend/src/game/gamezipserver.ts`

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

**Implementation**: `backend/src/game/zip-manager.ts`

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

### ZIP Entry Size Limits

**Status**: ✅ **Implemented** (2026-02-06)

**Implementation**: `backend/src/game/zip-manager.ts`

```typescript
const MAX_ZIP_ENTRY_SIZE = 50 * 1024 * 1024; // 50MB per entry
```

**Protection**:

- Prevents memory exhaustion from oversized ZIP entries
- Blocks decompression bombs
- Enforced during ZIP mounting

### Rate Limiting on Resource-Intensive Endpoints

**Status**: ✅ **Implemented** (2026-02-06)

**Error Reporting** (`backend/src/routes/errors.ts`):

```typescript
router.post('/', rateLimitStrict, ...) // Strict rate limiting
```

**Updates** (`backend/src/routes/updates.ts`):

```typescript
router.get('/', rateLimitStandard, ...) // Standard rate limiting
```

**Protection**:

- Prevents abuse of error submission endpoint
- Prevents excessive update check requests
- Reduces server resource consumption

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

### Backend Game Content Routes (Permissive - Justified)

**Implementation**: `backend/src/game/` routes (`/game-proxy/*`, `/game-zip/*`)

```typescript
res.setHeader('Access-Control-Allow-Origin', '*');
```

**Justification**: See `docs/12-reference/cors-security-decision.md`

- Serves public, read-only game content
- No sensitive data exposure
- Supports game embedding use cases
- Integrated into the same backend service as restrictive API routes

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

## SSRF (Server-Side Request Forgery) Prevention

### DNS Rebinding Prevention

**Status**: ✅ **Implemented** (2026-02-07)

**Implementation**: `backend/src/game/services/GameDataDownloader.ts`

Pre-checks DNS resolution for non-IP hostnames before connecting, blocking
private/internal addresses:

```typescript
// Resolve hostname and check for private IPs
const addr = await dns.lookup(hostname);
if (isPrivateAddress(addr.address)) {
  throw new Error('Download blocked: resolves to private address');
}
```

**Protection**:

- ✅ Prevents DNS rebinding attacks where public hostnames resolve to internal
  IPs
- ✅ Blocks downloads from 127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12,
  192.168.0.0/16
- ✅ Check performed before connection, not after

### Community Playlists Domain Allowlist

**Status**: ✅ **Implemented** (2026-02-06)

**Implementation**: `backend/src/routes/community-playlists.ts`

```typescript
const ALLOWED_DOWNLOAD_DOMAINS = [
  'flashpointarchive.org',
  '*.flashpointarchive.org',
];

// Domain validation before request
if (!validateDomain(url, ALLOWED_DOWNLOAD_DOMAINS)) {
  return res.status(400).json({ error: 'Invalid domain' });
}
```

**Security Features**:

- ✅ Whitelist of allowed domains for playlist downloads
- ✅ HTTPS enforcement for downloads
- ✅ Prevents internal network access (e.g., 127.0.0.1, internal IPs)

**Consolidated Constants** (2026-02-07):

The domain allowlist is now a single exported constant from
`CommunityPlaylistService.ts`, eliminating duplication between the route and
service files. This creates a single source of truth for allowed domains across
the application.

```typescript
// CommunityPlaylistService.ts
export const ALLOWED_DOWNLOAD_DOMAINS = [
  'flashpointarchive.org',
  '*.flashpointarchive.org',
];
```

This pattern prevents inconsistencies where the route validation might differ
from the service-level validation.

### Game Data Download Redirect Limits

**Status**: ✅ **Implemented** (2026-02-06)

**Implementation**: `backend/src/game/services/GameDataDownloader.ts`

```typescript
private maxRedirects = 5; // Maximum redirect chain length
```

**Redirect Handling**:

```typescript
// Drain response body on redirect/error to prevent connection leaks
response.resume();
```

**Protection**:

- Limits redirect chains to 5 hops (prevents infinite redirect loops)
- Drains response bodies to prevent resource leaks
- Prevents redirect-based SSRF attacks

---

## Error Handling & Information Disclosure Prevention

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

### Async Error Handler Wrapper

**Status**: ✅ **Hardened** (2026-02-06)

**Implementation**: `backend/src/routes/system-settings.ts` and other route files

All async route handlers are now wrapped with `asyncHandler` to prevent unhandled promise rejections:

```typescript
// BEFORE: Uncaught rejections if error thrown in async handler
router.get('/', async (req, res) => {
  const result = await someService.getResult(); // If rejects, crashes server
  res.json(result);
});

// AFTER: Error caught and passed to error handler middleware
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const result = await someService.getResult();
    res.json(result);
  })
);
```

**Implementation**:

```typescript
function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
```

**Protection**:

- ✅ Prevents unhandled promise rejections from crashing server
- ✅ Errors reach centralized error handler
- ✅ Consistent error responses to clients

**Middleware Coverage** (2026-02-07):

asyncHandler now also wraps middleware functions:

- `authenticate` middleware in `backend/src/middleware/auth.ts`
- `optionalAuth` middleware in `backend/src/middleware/auth.ts`
- All game content route handlers: `game-zip.ts`, `game-proxy.ts`, `github.ts`

This ensures middleware errors are also caught and handled properly instead of
propagating as unhandled rejections.

### Sensitive Log Sanitization

**Status**: ✅ **Hardened** (2026-02-06)

**Implementation**: `backend/src/routes/auth.ts`

Username input is now sanitized before logging to prevent leaking sensitive data:

```typescript
private sanitizeUsername(username: unknown): string {
  if (typeof username !== 'string') {
    return 'unknown';
  }
  // Truncate long usernames to prevent log injection
  return username.substring(0, 50);
}

// In login handler
logger.warn(`[Auth] Login attempt failed for user: ${this.sanitizeUsername(req.body.username)}`);
```

**Protection**:

- ✅ Prevents username PII exposure in logs
- ✅ Truncates long inputs to prevent log injection
- ✅ Safe fallback for non-string values

### Download Endpoint Error Messages & SSE Handling

**Status**: ✅ **Hardened** (2026-02-06)

**Implementation**: `backend/src/routes/downloads.ts`

**Error Response Sanitization**:

Error responses no longer leak internal implementation details to clients:

```typescript
// ✗ Before: Error: File not found at /D/Flashpoint/Data/Games/abc123.zip
// ✓ After: { error: 'File not found' }
```

**Server-Sent Events (SSE) Error Handling**:

SSE endpoint now properly checks `res.headersSent` before attempting to send error responses:

```typescript
// BEFORE: Errors crash if headers already sent
try {
  // SSE streaming operations
} catch (error) {
  res.status(500).json({ error: 'Server error' }); // Crashes if headers sent!
}

// AFTER: Check headers before responding
try {
  // SSE streaming operations
} catch (error) {
  if (res.headersSent) {
    // Headers already sent, write SSE error event
    res.write(`data: {"error": "Server error"}\n\n`);
    res.end();
  } else {
    // Headers not sent, use normal response
    res.status(500).json({ error: 'Server error' });
  }
}
```

**Protection**:

- ✅ Prevents attackers from discovering system paths
- ✅ Prevents crashes when headers already sent
- ✅ Graceful error handling for streaming responses

### Health Endpoint Information Disclosure

**Status**: ✅ **Hardened** (2026-02-06)

**Implementation**: `backend/src/server.ts`

Health endpoint (`/health`) no longer exposes sensitive information:

```typescript
// ✗ Before: { status: 'ok', flashpointPath: '/D/Flashpoint' }
// ✓ After: { status: 'ok' }
```

**Protection**: Prevents disclosure of system paths to unauthorized users

### Additional Code Quality Improvements

**Status**: ✅ **Implemented** (2026-02-07)

**Low-Priority Security Enhancements**:

- **headersSent guard in proxy-request-handler**: The `sendError()` method in `proxy-request-handler.ts` now checks `res.headersSent` before attempting to send error responses, preventing "Cannot set headers after they are sent" errors in streaming scenarios.
- **Private visibility on internal methods**: `findActiveDownload()` in `gamezipserver.ts` is now `private` - it was only used internally but was publicly accessible. `PRIVATE_IP_RANGES` in `GameDataDownloader.ts` is now `static readonly`.
- **Removed unnecessary exports**: Internal-only constants like `CUSTOM_MIME_TYPES` no longer exported, reducing the public API surface. Convenience re-exports removed from service index files.

---

## XSS Prevention

### Backend Game Module HTML Escaping

**Status**: ✅ **Implemented** (2026-02-06)

**Implementation**: `backend/src/game/gamezipserver.ts`

The GameZip server dynamically generates HTML loading pages with user-controlled
data (progress values, source names, elapsed time). All interpolated values are
now escaped using a centralized `escapeHtml()` utility:

```typescript
private escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}
```

**Protected Values**:

- Progress percentages and values
- Download source names
- Elapsed time and status messages

**Prevention**: Blocks XSS attacks through HTML injection in dynamically
generated loading pages

### Frontend Security

**React Built-in Protection**:

- ✅ Automatic escaping of JSX expressions
- ✅ No `dangerouslySetInnerHTML` usage
- ✅ Content Security Policy headers (if configured)

### Token Storage

**Current Implementation**: `frontend/src/store/auth.ts` and `backend/src/middleware/auth.ts`

**Refresh Tokens**: HTTP-only cookies

- ✅ Protected from XSS attacks (JavaScript cannot access)
- ✅ Cookie name: `fp_refresh`
- ✅ Cookie path: `/api/auth` (scoped to auth routes only)
- ✅ Expiry: 30 days
- ✅ Secure flag: enabled in production (HTTPS only)
- ✅ SameSite: `lax` (provides CSRF protection)
- ✅ Automatically sent with requests via `withCredentials: true` on axios client

**Access Tokens**: Memory-only (Zustand store)

- ✅ Never persisted to localStorage
- ✅ Lost on page reload (recovered via `/api/auth/refresh` cookie)
- ✅ Prevents XSS persistence attacks

**Session Recovery on Page Reload**:

1. Frontend initializes auth store (access token is empty)
2. Frontend makes `GET /api/auth/refresh` (cookie sent automatically)
3. Backend validates refresh token from cookie
4. Backend returns new access token (no cookie refresh needed)
5. Frontend stores access token in memory

### Type Safety

**TypeScript Strict Mode**:

- ✅ No implicit `any` types
- ✅ Null/undefined checks
- ✅ Type-safe API calls

---

## Authentication on Protected Endpoints

### Game Management Endpoints

**Status**: ✅ **Implemented** (2026-02-06)

**Protected Endpoints** (`backend/src/routes/game-zip.ts`):

- **POST /game-zip/mount** - Mount a ZIP file (requires `settings.update`)
- **POST /game-zip/unmount** - Unmount a ZIP file (requires `settings.update`)
- **GET /game-zip/list** - List mounted ZIPs (requires `settings.update`)

**Authentication Middleware**:

```typescript
router.post('/mount', authenticate, requirePermission('settings.update'), ...);
router.post('/unmount', authenticate, requirePermission('settings.update'), ...);
router.get('/list', authenticate, requirePermission('settings.update'), ...);
```

**Exception**: File-serving route (`GET /*`) remains unauthenticated

- **Reason**: Game content must load in iframes without authentication
- **Security**: No sensitive data exposed (public game files only)

---

## CGI & Legacy Content Security

### CGI Symlink Bypass Prevention

**Status**: ✅ **Implemented** (2026-02-07)

**Implementation**: `backend/src/game/cgi/cgi-executor.ts`

CGI script path validation now resolves symlinks before checking path
boundaries:

```typescript
// Resolve symlinks before validation
const realPath = await fs.realpath(scriptPath);
const validPath = sanitizeAndValidatePath(cgiBaseDir, realPath);
```

**Protection**:

- ✅ Prevents symlink-based path traversal (symlink pointing outside allowed
  directory)
- ✅ Uses `fs.realpath()` to resolve all symbolic links before validation
- ✅ Validates the resolved path stays within allowed CGI directory

### CGI Environment Variable Allowlist

**Status**: ✅ **Implemented** (2026-02-06)

**Implementation**: `backend/src/game/cgi/cgi-executor.ts`

CGI scripts no longer receive unrestricted environment variables. Using an
allowlist instead of a denylist:

```typescript
private static readonly ALLOWED_ENV_VARS = new Set([
  'REQUEST_METHOD',
  'REQUEST_URI',
  'QUERY_STRING',
  'CONTENT_TYPE',
  'CONTENT_LENGTH',
  'HTTP_HOST',
  'HTTP_USER_AGENT',
  'REMOTE_ADDR',
  'PATH_INFO',
  'PATH_TRANSLATED',
  // ... more safe variables
]);
```

**Protection**:

- ✅ CGI scripts only receive necessary variables
- ✅ Prevents leakage of sensitive env vars (API keys, paths, tokens)
- ✅ Blocks information disclosure attacks

### HTTP Header Filtering for CGI

**Status**: ✅ **Implemented** (2026-02-06)

**Implementation**: `backend/src/game/cgi/cgi-executor.ts`

```typescript
private static readonly ALLOWED_CGI_HEADERS = new Set([
  'accept',
  'accept-encoding',
  'accept-language',
  'content-type',
  'content-length',
  'user-agent',
  'referer',
  // ... more safe headers
]);
```

**Protection**:

- ✅ Filters HTTP headers passed to CGI scripts
- ✅ Prevents header injection attacks
- ✅ Blocks sensitive header propagation

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
- [x] Rate limiting (login, registration, errors, updates)
- [x] Input validation (Zod schemas, route ID parameters, query limits)
- [x] SQL injection prevention (parameterized queries)
- [x] Path traversal prevention (comprehensive, with 17 test cases)
- [x] DoS protection (request size limits, LRU cache, ZIP entry limits)
- [x] Sensitive data sanitization in logs (username truncation)
- [x] Activity logging
- [x] Error handling (centralized, no information leakage, async handlers)
- [x] CORS configuration (restrictive for backend, dynamic)
- [x] Graceful shutdown
- [x] XSS prevention (HTML escaping in generated templates)
- [x] SSRF prevention (domain allowlist, redirect limits)
- [x] Authentication on game management endpoints
- [x] CGI environment variable allowlist
- [x] HTTP header filtering for CGI
- [x] Health endpoint hardening (no path disclosure)
- [x] SSE error handling (headers check before responding)
- [x] DNS rebinding prevention (private IP check before download)
- [x] Symlink bypass prevention (realpath before path validation)
- [x] Guest access hardening (read-only permissions, shared access check)
- [x] TOCTOU race condition prevention (database transactions)
- [x] SSE write-after-close prevention (closed flag guard)
- [x] AbortSignal listener cleanup (memory leak prevention)
- [x] Downloaded file path re-validation (post-download directory check)
- [x] Extended Zod validation on request bodies (community playlists, shared
  playlists, cache, activities)
- [x] asyncHandler on all async middleware (authenticate, optionalAuth)
- [x] Consolidated domain allowlists (single source of truth)

### ⚠️ Recommended Enhancements

- [ ] Content Security Policy headers
- [ ] Database indexes (requires Flashpoint Archive coordination)
- [ ] Security headers (Helmet middleware)
- [ ] HTTPS in production
- [ ] Rate limiting on additional endpoints (CDN fallback, external requests)

---

## References

- [OWASP Top 10 2021](https://owasp.org/www-project-top-ten/)
- [CORS Security Decision](./cors-security-decision.md)
- [Database Indexes](./database-indexes.md)
- [Authentication & Authorization](../10-features/authentication-authorization.md)

---

**Last Updated**: 2026-02-07 **Review Status**: Comprehensive (All critical, high,
and medium-severity fixes implemented: HTTP-only cookies, DNS rebinding, symlink
bypass, TOCTOU transactions, guest hardening, resource cleanup, SSE safety,
downloaded file validation, extended Zod validation, asyncHandler middleware,
consolidated domain allowlists)
