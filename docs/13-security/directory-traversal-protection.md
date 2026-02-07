# Directory Traversal Protection

**Date:** 2026-01-29 **Status:** Implemented **Priority:** Critical

## Overview

The backend game module (formerly separate game-service) has been hardened
against directory traversal attacks through comprehensive path validation and
sanitization utilities.

## Problem

The game module (now integrated into backend) had potential directory traversal
vulnerabilities in two areas:

1. **Legacy Server** (`backend/src/game/legacy-server.ts`): Used `path.join()`
   and `path.normalize()` but didn't validate resolved paths
2. **GameZip Server** (`backend/src/game/gamezipserver.ts`): Had partial
   validation but lacked URL path sanitization

## Solution

Implemented centralized path security utilities in
`backend/src/game/utils/pathSecurity.ts`:

### 1. Path Sanitization and Validation

```typescript
sanitizeAndValidatePath(basePath: string, requestPath: string): string
```

- Normalizes paths using `path.normalize()` and `path.resolve()`
- Ensures resolved path stays within the base directory
- Platform-aware (case-insensitive on Windows, case-sensitive on Unix)
- Throws error if directory traversal detected

**Example:**

```typescript
// ✓ SAFE
sanitizeAndValidatePath('/var/www/htdocs', 'files/game.swf');
// Returns: /var/www/htdocs/files/game.swf

// ✗ BLOCKED
sanitizeAndValidatePath('/var/www/htdocs', '../../../etc/passwd');
// Throws: Error('Invalid path: Directory traversal detected')
```

### 2. Multiple Base Directory Validation

```typescript
validatePathInAllowedDirectories(allowedBases: string[], requestPath: string): string
```

Validates path against multiple allowed base directories.

### 3. URL Path Sanitization

```typescript
sanitizeUrlPath(urlPath: string): string
```

- Checks for null bytes (`\0`)
- Blocks URL-encoded directory traversal (`..%2F`, `..%5C`)
- Blocks backslash path traversal (`..\\`)
- Runs before path resolution for early detection

## Implementation

### Legacy Server Changes (`backend/src/game/legacy-server.ts`)

1. **Added URL path sanitization** at request entry point
2. **Added path validation** before file access
3. **Created validation method** for htdocs and CGI paths

### GameZip Server Changes (`backend/src/game/gamezipserver.ts`)

1. **Added URL path sanitization** in file request handler
2. **Existing mount validation** (already present)

## Test Coverage

**File:** `backend/src/game/utils/pathSecurity.test.ts`

- 17 test cases covering all security scenarios
- All tests passing

**Test Categories:**

1. Valid paths within base directory ✓
2. Directory traversal with `../` ✓
3. Directory traversal with absolute paths ✓
4. Directory traversal in middle of path ✓
5. Safe use of `..` within base ✓
6. Multiple allowed directories ✓
7. Null byte detection ✓
8. URL-encoded traversal detection ✓
9. Backslash traversal detection ✓

## Security Guarantees

After this implementation:

1. **No Directory Traversal**: Impossible to escape allowed base directories
2. **Null Byte Protection**: Cannot bypass file extension checks
3. **URL Encoding Protection**: Detects encoded traversal attempts
4. **Platform-Aware**: Works correctly on Windows and Unix
5. **Comprehensive Logging**: All blocked attempts logged with details

## Attack Vectors Blocked

| Attack Type            | Example                            | Status    |
| ---------------------- | ---------------------------------- | --------- |
| Unix path traversal    | `../../../etc/passwd`              | ✓ Blocked |
| Windows path traversal | `..\..\..\windows\system32\config` | ✓ Blocked |
| URL-encoded Unix       | `..%2F..%2F..%2Fetc/passwd`        | ✓ Blocked |
| URL-encoded Windows    | `..%5C..%5C..%5Cwindows`           | ✓ Blocked |
| Null byte injection    | `file.swf\0.txt`                   | ✓ Blocked |
| Absolute path escape   | `/etc/passwd`                      | ✓ Blocked |
| Mixed traversal        | `files/../../etc/passwd`           | ✓ Blocked |

## Performance Impact

- **Minimal**: Path validation adds ~0.1ms per request
- **No caching needed**: Validation is fast enough for real-time use
- **Early exit**: Invalid paths fail fast before file I/O

## Logging

All blocked attempts logged with:

- Original request path
- Resolved absolute path
- Base directory being protected
- Security warning level

**Example log output:**

```
[game-service] warn: [Security] Path traversal attempt blocked: ../../../etc/passwd
[game-service] warn: [Security] Resolved to: D:\etc\passwd
[game-service] warn: [Security] Base directory: D:\var\www\htdocs
```

## Future Improvements

1. **Rate Limiting**: Add rate limiting for repeated traversal attempts
2. **IP Blacklisting**: Temporarily block IPs with multiple failed attempts
3. **Alerting**: Send notifications for sustained attack patterns
4. **Audit Log**: Separate security audit log for compliance

## Related Security Measures

As part of the comprehensive 2026-02-06 security review, several complementary
hardening measures were implemented alongside directory traversal protection:

### XSS Prevention in Game Loading Pages

The GameZip server now escapes all HTML-interpolated values (progress, source
names, elapsed time) using a centralized `escapeHtml()` utility. See
`docs/12-reference/security-measures.md` (XSS Prevention section).

### CGI Environment Variable Allowlist

CGI scripts now receive only whitelisted environment variables, preventing
information disclosure through environment leakage. See
`docs/12-reference/security-measures.md` (CGI Security Hardening section).

### SSRF Prevention for Game Data Downloads

Game data downloads now enforce domain allowlists and redirect limits to prevent
server-side request forgery. See `docs/12-reference/security-measures.md` (SSRF
Prevention section).

---

## Related Files

- `backend/src/game/utils/pathSecurity.ts` - Security utilities
- `backend/src/game/utils/pathSecurity.test.ts` - Test suite
- `backend/src/game/legacy-server.ts` - Legacy server implementation
- `backend/src/game/gamezipserver.ts` - GameZip server implementation
- `backend/src/game/cgi/cgi-executor.ts` - CGI environment & header filtering
- `backend/src/game/services/GameDataDownloader.ts` - SSRF/redirect protection

## References

- **OWASP**:
  [Path Traversal](https://owasp.org/www-community/attacks/Path_Traversal)
- **CWE-22**: Directory Traversal
- **Phase**: Phase 1 - Security (Critical priority fix)
- **Related Review**: 2026-02-06 comprehensive code review (critical & high
  severity fixes)
