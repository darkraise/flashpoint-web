# Backend Utilities

This document describes the utility functions and middleware used throughout the backend service.

## Overview

The backend includes several reusable utilities that eliminate code duplication and enforce consistent patterns across the application:

```
backend/src/
├── middleware/
│   └── validation.ts      # Zod request validation middleware
└── utils/
    └── queryParser.ts      # Query string parsing utilities
```

## Middleware Utilities

### validation.ts

**Purpose**: Centralized request validation using Zod schemas

**Location**: `backend/src/middleware/validation.ts`

**Benefits**:
- Eliminates 15+ instances of duplicate Zod error handling
- Type-safe request validation
- Consistent error messages
- Automatic 400 Bad Request responses

**API**:

```typescript
function validateRequest<T extends z.ZodType>(
  schema: T,
  property: RequestProperty = 'body'
): RequestHandler

type RequestProperty = 'body' | 'query' | 'params';
```

**Usage**:

```typescript
import { validateRequest } from '../middleware/validation';
import { z } from 'zod';

// Define schema
const loginSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6)
});

// Apply middleware
router.post('/login',
  validateRequest(loginSchema, 'body'),
  async (req, res) => {
    // req.body is now validated and typed
    const { username, password } = req.body;
    // ...
  }
);
```

**Error Handling**:

When validation fails:
- Returns 400 Bad Request status
- Provides descriptive error message
- Forwards to error handler middleware

Example error response:
```json
{
  "error": {
    "message": "Validation error: username must be at least 3 characters"
  }
}
```

**Validation Targets**:

- `'body'` - Validate request body (POST, PUT, PATCH)
- `'query'` - Validate query parameters (GET)
- `'params'` - Validate route parameters

## Query Parsing Utilities

### queryParser.ts

**Purpose**: Reusable pagination and query parsing functions

**Location**: `backend/src/utils/queryParser.ts`

**Benefits**:
- Eliminates 15+ instances of duplicate pagination logic
- Type-safe parsing with default values
- Consistent limits and offset handling
- Prevents negative offsets and excessive limits

**API**:

```typescript
interface PaginationDefaults {
  limit?: number;      // Default: 50
  maxLimit?: number;   // Default: 100
  offset?: number;     // Default: 0
}

interface PaginationResult {
  limit: number;
  offset: number;
}

function parsePaginationQuery(
  query: any,
  defaults?: PaginationDefaults
): PaginationResult
```

**Usage**:

```typescript
import { parsePaginationQuery } from '../utils/queryParser';

router.get('/games', async (req, res) => {
  // Parse with defaults
  const { limit, offset } = parsePaginationQuery(req.query);
  // limit = 50 (default), offset = 0 (default)

  // Parse with custom defaults
  const { limit, offset } = parsePaginationQuery(req.query, {
    limit: 20,
    maxLimit: 50,
    offset: 0
  });

  // Query database
  const games = DatabaseService.all(
    'SELECT * FROM game LIMIT ? OFFSET ?',
    [limit, offset]
  );

  res.json({ games, limit, offset });
});
```

**Behavior**:

| Input | Output | Notes |
|-------|--------|-------|
| `?limit=10` | `{ limit: 10, offset: 0 }` | Valid limit |
| `?limit=200` | `{ limit: 100, offset: 0 }` | Clamped to maxLimit |
| `?offset=20` | `{ limit: 50, offset: 20 }` | Custom offset |
| `?limit=abc` | `{ limit: 50, offset: 0 }` | Invalid, uses default |
| `?offset=-5` | `{ limit: 50, offset: 0 }` | Negative prevented |

**Type Safety**:

The function returns a strongly typed object:

```typescript
const pagination: PaginationResult = parsePaginationQuery(req.query);
// TypeScript knows pagination.limit and pagination.offset are numbers
```

## Security Utilities

### Data Sanitization (errorHandler.ts)

**Purpose**: Prevent sensitive data from appearing in logs

**Location**: `backend/src/middleware/errorHandler.ts`

**Implementation**:

```typescript
function sanitizeBody(body: any): any {
  if (!body || typeof body !== 'object') return body;

  const sanitized = { ...body };
  const sensitiveFields = [
    'password', 'currentPassword', 'newPassword',
    'token', 'refreshToken', 'secret', 'apiKey', 'accessToken'
  ];

  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });

  return sanitized;
}
```

**Usage**:

```typescript
// In error handler
logger.error('[UnhandledError]', {
  message: err.message,
  stack: err.stack,
  body: sanitizeBody(req.body)  // Passwords/tokens redacted
});
```

**Protected Fields**:
- `password`, `currentPassword`, `newPassword`
- `token`, `refreshToken`, `accessToken`
- `secret`, `apiKey`

Example log output:
```json
{
  "message": "Login failed",
  "body": {
    "username": "john_doe",
    "password": "[REDACTED]"
  }
}
```

## Best Practices

### When to Use validateRequest

Use `validateRequest` for ALL endpoints that accept user input:

✅ **DO**:
```typescript
router.post('/users',
  validateRequest(createUserSchema),
  async (req, res) => { /* ... */ }
);
```

❌ **DON'T**:
```typescript
router.post('/users', async (req, res) => {
  // Manual validation (code duplication)
  if (!req.body.username || !req.body.email) {
    return res.status(400).json({ error: 'Invalid input' });
  }
});
```

### When to Use parsePaginationQuery

Use `parsePaginationQuery` for ALL endpoints that return paginated data:

✅ **DO**:
```typescript
const { limit, offset } = parsePaginationQuery(req.query);
const games = DatabaseService.all(
  'SELECT * FROM game LIMIT ? OFFSET ?',
  [limit, offset]
);
```

❌ **DON'T**:
```typescript
// Manual parsing (code duplication)
const limit = Math.min(parseInt(req.query.limit || '50'), 100);
const offset = Math.max(parseInt(req.query.offset || '0'), 0);
```

### Error Handling Pattern

Combine utilities for robust error handling:

```typescript
router.post('/games/:id/play',
  authenticate,
  validateRequest(playSessionSchema),
  async (req, res, next) => {
    try {
      const { duration } = req.body;
      const gameId = req.params.id;

      await PlayTrackingService.startSession(req.user!.id, gameId);

      res.json({ success: true });
    } catch (error) {
      // Error handler will sanitize sensitive data
      next(error);
    }
  }
);
```

## Future Enhancements

### Planned Utilities

1. **Date Parsing Utility**
   - Parse ISO 8601 date strings
   - Validate date ranges
   - Handle timezone conversions

2. **Response Formatter Utility**
   - Consistent API response structure
   - Pagination metadata
   - HATEOAS links

3. **Cache Utility**
   - Redis integration wrapper
   - Cache key generation
   - TTL management

4. **File Upload Utility**
   - Multipart form handling
   - File type validation
   - Size limits

## References

- [Zod Documentation](https://zod.dev/)
- [Express Middleware Guide](https://expressjs.com/en/guide/using-middleware.html)
- [Input Validation Best Practices](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)

---

**Last Updated**: 2026-01-27
**Review Status**: Current
