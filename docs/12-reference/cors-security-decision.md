# CORS Security Decision

## Overview

The Game Service intentionally uses `Access-Control-Allow-Origin: *` (wildcard) to allow cross-origin requests from any origin. This document explains the security rationale and justification for this decision.

## Location

- **File**: `game-service/src/utils/cors.ts`
- **Implementation**: `setCorsHeaders()` function
- **Affected Servers**:
  - HTTP Proxy Server (port 22500)
  - GameZip Server (port 22501)

## Security Decision

**Decision**: Allow all origins (`*`) for game-service CORS headers

**Rationale**:

### 1. Public Game Content

The game-service serves **public, read-only game content** from the Flashpoint Archive:
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
- Running games from `http://localhost:22500` while frontend is on `http://localhost:5173`
- Supporting different development environments and ports
- Allowing community-hosted instances with various domain configurations

### 3. No Sensitive Data Exposure

The game-service does **NOT** serve:
- ❌ User data or personal information
- ❌ Authentication tokens or credentials
- ❌ Private database records
- ❌ Configuration secrets
- ❌ API keys or sensitive settings

All sensitive operations are handled by the backend service (port 3100) which has **restrictive CORS** configured to only allow the specific frontend origin.

### 4. Security Boundaries

**Backend Service (Port 3100)** - Restricted CORS:
```typescript
// backend/src/server.ts
cors({
  origin: process.env.DOMAIN || 'http://localhost:5173',
  credentials: true
})
```
- Handles authentication
- Manages user data
- Enforces RBAC permissions
- Uses restrictive CORS with credentials

**Game Service (Ports 22500, 22501)** - Permissive CORS:
```typescript
// game-service/src/utils/cors.ts
setCorsHeaders(res, { allowCrossDomain: true });
// Sets: Access-Control-Allow-Origin: *
```
- Serves public game files only
- No authentication required
- No sensitive data access
- Read-only content delivery

### 5. Additional Security Measures

Even with wildcard CORS, the game-service implements:

1. **Path Traversal Prevention**
   - Validates ZIP mount IDs (no `..`, `/`, `\`, null bytes)
   - Restricts ZIP files to allowed games directory
   - File: `game-service/src/gamezipserver.ts:131-134, 156-169`

2. **Request Size Limits**
   - 1MB maximum request body size
   - Prevents DoS attacks
   - File: `game-service/src/gamezipserver.ts:307`

3. **Read-Only Operations**
   - No write, update, or delete operations
   - ZIP mounting requires explicit POST request
   - File serving is GET-only

4. **No Credential Sharing**
   - No cookies or authentication headers
   - No `Access-Control-Allow-Credentials`
   - Stateless file serving

## Alternatives Considered

### Alternative 1: Whitelist Frontend Origin Only

**Rejected**: Would break game embedding and require reconfiguration for every deployment environment.

### Alternative 2: Dynamic Origin Validation

**Rejected**: Adds complexity with no security benefit given the public, read-only nature of served content.

### Alternative 3: Separate Authenticated Endpoint

**Already Implemented**: The backend service (port 3100) already handles all authenticated operations with restrictive CORS.

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

## Conclusion

The wildcard CORS policy for game-service is a **justified security decision** that:
1. Serves only public, read-only game content
2. Exposes no sensitive data
3. Supports legitimate embedding and development use cases
4. Maintains strong security boundaries with the backend service
5. Implements additional security measures to prevent abuse

This decision has been reviewed and documented for security audit purposes.

---

**Last Updated**: 2026-01-27
**Reviewed By**: Code Review Process
**Status**: Approved - Justified for public content delivery
