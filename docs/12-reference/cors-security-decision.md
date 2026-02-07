# CORS Security Decision

## Overview

The backend service includes game content routes that intentionally use
`Access-Control-Allow-Origin: *` (wildcard) to allow cross-origin requests from
any origin. This document explains the security rationale and justification for
this decision.

## Location

- **Backend Files**: `backend/src/game/legacy-server.ts`, `backend/src/game/gamezipserver.ts`
- **Routes**:
  - `/game-proxy/*` - HTTP proxy for game content
  - `/game-zip/*` - ZIP file streaming

## Security Decision

**Decision**: Allow all origins (`*`) for backend game content routes

**Rationale**:

### 1. Public Game Content

The backend game content routes serve **public, read-only game content** from
the Flashpoint Archive:

- Flash game files (.swf)
- HTML5 game files (.html, .js, .css)
- Game assets (images, audio, etc.)
- Animation files

All content served is:

- ✅ Public domain or freely redistributable
- ✅ Read-only (no data modification)
- ✅ Non-sensitive (no user data, credentials, or private information)
- ✅ Cacheable and intended for broad distribution

### 2. Game Embedding Use Cases

The wildcard CORS policy supports legitimate use cases:

- Embedding Flash/HTML5 games in iframes across different domains
- Running games from `http://localhost:3100/game-proxy/*` while frontend is on
  `http://localhost:5173`
- Supporting different development environments and ports
- Allowing community-hosted instances with various domain configurations

### 3. No Sensitive Data Exposure

The backend game content routes do **NOT** serve:

- ❌ User data or personal information
- ❌ Authentication tokens or credentials
- ❌ Private database records
- ❌ Configuration secrets
- ❌ API keys or sensitive settings

All sensitive operations are handled by the backend service (port 3100) which
has **restrictive CORS** configured to only allow the specific frontend origin.

### 4. Security Boundaries

**Backend API Routes** (`/api/*`) - Restricted CORS:

```typescript
// backend/src/server.ts
cors({
  origin: (origin, callback) => {
    // Checks env var and dynamic domains table
    // Allows only configured origins
  },
  credentials: true,
});
```

- Handles authentication
- Manages user data
- Enforces RBAC permissions
- Uses restrictive CORS with credentials

**Backend Game Content Routes** (`/game-proxy/*`, `/game-zip/*`) - Permissive CORS:

```typescript
// backend/src/game/cors-handler.ts
res.setHeader('Access-Control-Allow-Origin', '*');
```

- Serves public game files only
- No authentication required
- No sensitive data access
- Read-only content delivery

### 5. Additional Security Measures

Even with wildcard CORS, the backend game content routes implement:

1. **Path Traversal Prevention**
   - Centralized security utilities in `backend/src/game/utils/pathSecurity.ts`
   - Validates ZIP mount IDs and file paths
   - Blocks `..`, `/`, `\`, null bytes, and URL-encoded traversal
   - Restricts ZIP files to allowed games directory
   - Comprehensive test coverage (17 test cases)

2. **Request Size Limits**
   - 1MB maximum request body size
   - Prevents DoS attacks

3. **Read-Only Operations**
   - No write, update, or delete operations
   - ZIP mounting is internal only
   - File serving is GET-only

4. **No Credential Sharing**
   - No cookies or authentication headers
   - No `Access-Control-Allow-Credentials`
   - Stateless file serving

## Separation of Concerns

The wildcard CORS policy for game content routes is separate from the backend
API CORS configuration:

- **Backend API** (`/api/*`): Restrictive CORS, only allows configured origins
- **Game Content** (`/game-proxy/*`, `/game-zip/*`): Permissive CORS, allows all
  origins

Both routes run on the same backend service (port 3100) but are isolated by
path.

## Alternatives Considered

### Alternative 1: Whitelist Frontend Origin Only

**Rejected**: Would break game embedding and require reconfiguration for every
deployment environment.

### Alternative 2: Dynamic Origin Validation

**Rejected**: Adds complexity with no security benefit given the public,
read-only nature of served content.

### Alternative 3: Separate Backend Service

**Previously Implemented**: Before the game-service merger, the game service
ran on separate ports (22500/22501). Now integrated into the backend with
separate route prefixes.

## Risk Assessment

**Risk Level**: ✅ LOW

**Justification**:

- Content is public and intended for broad distribution
- No sensitive data exposure
- No write operations
- Backend handles all authentication/authorization with restrictive CORS
- Additional security measures prevent abuse

## Monitoring and Compliance

**Monitoring**:

- Request logs track file access patterns
- Unusual access patterns can be detected via backend activity logging
- ZIP mount operations are logged for audit

**Compliance**:

- Meets OWASP security guidelines for public content delivery
- Follows principle of least privilege (game-service has no database access)
- Implements defense in depth (multiple security layers)

## Backend API Dynamic CORS (Updated 2026-02)

The backend API routes now support **dynamic CORS** in addition to the static
`DOMAIN` environment variable:

**Implementation**: `backend/src/server.ts`

```typescript
origin: (origin, callback) => {
  if (!origin) return callback(null, true); // same-origin
  if (origin === config.domain) return callback(null, true); // env var
  // Check domains table (cached 60s)
  const allowed = domainService.getAllowedOrigins();
  if (allowed.has(origin)) return callback(null, true);
  callback(new Error('Not allowed by CORS'));
};
```

**How it works:**

- Admins configure domains via `/api/domains` endpoints
- `DomainService.getAllowedOrigins()` generates both `http://` and `https://`
  variants per hostname
- Results cached in-memory for 60 seconds, invalidated on any domain mutation
- Falls back to `DOMAIN` env var if no domains configured or DB unavailable

**Game Content Routes**: Game content routes (`/game-proxy/*`, `/game-zip/*`)
always use wildcard CORS (`*`) for public game embedding, regardless of domain
configuration.

## Conclusion

The wildcard CORS policy for backend game content routes is a **justified
security decision** that:

1. Serves only public, read-only game content
2. Exposes no sensitive data
3. Supports legitimate embedding and development use cases
4. Maintains strong security boundaries with the backend service
5. Implements additional security measures to prevent abuse

This decision has been reviewed and documented for security audit purposes.

---

**Last Updated**: 2026-01-27 **Reviewed By**: Code Review Process **Status**:
Approved - Justified for public content delivery
