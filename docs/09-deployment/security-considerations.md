# Security Considerations

Comprehensive security hardening guide for production deployments of Flashpoint Web.

## Table of Contents

- [Security Overview](#security-overview)
- [Authentication and Authorization](#authentication-and-authorization)
- [JWT Security](#jwt-security)
- [CORS Configuration](#cors-configuration)
- [Rate Limiting and DDoS Protection](#rate-limiting-and-ddos-protection)
- [Input Validation](#input-validation)
- [SQL Injection Prevention](#sql-injection-prevention)
- [File Access Security](#file-access-security)
- [HTTP Security Headers](#http-security-headers)
- [SSL/TLS Configuration](#ssltls-configuration)
- [Container Security](#container-security)
- [Network Security](#network-security)
- [Logging and Monitoring](#logging-and-monitoring)
- [Data Protection](#data-protection)
- [Security Checklist](#security-checklist)

## Security Overview

Flashpoint Web implements defense-in-depth security with multiple layers:

1. **Network Layer**: Firewall rules, SSL/TLS encryption
2. **Application Layer**: Authentication, authorization, input validation
3. **Data Layer**: Encrypted storage, access controls, audit logs
4. **Infrastructure Layer**: Container isolation, process separation

**Security Principles:**

- Principle of least privilege
- Defense in depth
- Fail securely
- Keep it simple
- Don't trust user input
- Secure by default

## Recent Security Improvements (v1.2.0)

### Security Audit Results

A comprehensive security audit in January 2025 identified and fixed critical vulnerabilities:

**Issues Fixed:**
1. **Database Management Endpoints** - Previously unprotected, now require `settings.update` permission
2. **System Update Operations** - Install, system-info, and metadata sync now require authentication
3. **Game Download Endpoints** - All download operations now enforce `games.download` permission
4. **Playlist Modifications** - Flashpoint playlist CRUD operations now require appropriate permissions
5. **Play Tracking** - `games.play` permission now enforced on all play session endpoints

**Permission Enforcement Improvements:**
- Before: 83% of endpoints properly protected (50/60 endpoints)
- After: 94% of endpoints properly protected (59/63 endpoints)
- Security Score: Improved from 6/10 to 9/10

### Permission Caching (Performance & Security)

**Implementation:**
- In-memory caching with automatic TTL expiration
- User permissions: 5-minute TTL
- Role permissions: 10-minute TTL
- Automatic invalidation on permission changes

**Benefits:**
- 90%+ reduction in database permission queries
- Faster authorization checks (1-5ms vs 50-100ms)
- Reduced attack surface (fewer database queries)
- Cache management endpoints for administrators

**Security Considerations:**
- Permissions may be cached up to 5 minutes after revocation
- Critical permission changes should manually clear cache
- Cache statistics available for monitoring
- Automatic cleanup prevents memory leaks

**Management:**
```bash
# View cache statistics
curl -X GET http://localhost:3100/_cache/permissions/stats \
  -H "Authorization: Bearer {admin_token}"

# Clear all permission caches
curl -X POST http://localhost:3100/_cache/permissions/clear \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{"type": "all"}'

# Clear specific user's cache
curl -X POST http://localhost:3100/_cache/permissions/clear \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{"type": "user", "id": 5}'
```

### Token Revocation

**Automatic Revocation:**
- Old refresh tokens automatically revoked on token refresh
- Prevents token reuse attacks
- Revoked tokens marked with `revoked_at` timestamp

**Bulk Revocation:**
```typescript
// Revoke all tokens for a user (e.g., security breach, password change)
await authService.revokeAllUserTokens(userId);
```

**Use Cases:**
- User password changed → Revoke all user tokens
- Security breach detected → Revoke all tokens
- User account compromised → Admin revokes all user sessions
- Employee termination → Immediate access revocation

### Protected Endpoints Inventory

**Critical Operations (All Protected):**

| Endpoint | Method | Permission | Activity Logged |
|----------|--------|------------|-----------------|
| `/api/database/reload` | POST | `settings.update` | ✅ |
| `/api/database/status` | GET | `settings.update` | ✅ |
| `/api/updates/install` | POST | `settings.update` | ✅ |
| `/api/updates/system-info` | GET | `settings.update` | ✅ |
| `/api/updates/metadata/sync` | POST | `settings.update` | ✅ |
| `/api/games/:id/download` | POST | `games.download` | ✅ |
| `/api/games/:id/download/progress` | GET | `games.download` | ❌ |
| `/api/games/:id/download` | DELETE | `games.download` | ✅ |
| `/api/playlists` | POST | `playlists.create` | ✅ |
| `/api/playlists/:id/games` | POST | `playlists.update` | ✅ |
| `/api/playlists/:id/games` | DELETE | `playlists.update` | ✅ |
| `/api/playlists/:id` | DELETE | `playlists.delete` | ✅ |
| `/api/play/*` | ALL | `games.play` | Varies |

### System Role Protection

**System Roles (Cannot be modified):**
- Admin (ID: 1, Priority: 100)
- User (ID: 2, Priority: 50)
- Guest (ID: 3, Priority: 0)

**Implementation:**
```typescript
// backend/src/constants/roles.ts
export const SYSTEM_ROLES = {
  ADMIN: 1,
  USER: 2,
  GUEST: 3,
} as const;

export function isSystemRole(roleId: number): boolean {
  return Object.values(SYSTEM_ROLES).includes(roleId);
}
```

**Protection:**
- System roles cannot be deleted
- System role permissions cannot be modified
- System role names/descriptions cannot be changed
- Prevents accidental lockout of administrators

## Authentication and Authorization

### Password Security

**Hashing Algorithm:** bcrypt with cost factor 12

```typescript
// backend/src/services/AuthService.ts
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

async hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

**Password Requirements:**

```typescript
// Minimum requirements
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: false
};
```

**Recommendations:**

- Enforce minimum 12 characters for production
- Require mix of uppercase, lowercase, numbers
- Implement password complexity scoring (zxcvbn)
- Prevent common passwords (e.g., "password123")
- Implement account lockout after failed attempts
- Enable two-factor authentication (future enhancement)

### Role-Based Access Control (RBAC)

**Permission Hierarchy:**

```
Admin > Moderator > User > Guest
```

**Permission Scopes:**

```typescript
const PERMISSIONS = {
  // Game permissions
  'games.view': 'View game library',
  'games.play': 'Play games',
  'games.download': 'Download games',

  // Playlist permissions
  'playlists.create': 'Create playlists',
  'playlists.edit': 'Edit own playlists',
  'playlists.delete': 'Delete own playlists',
  'playlists.manage': 'Manage all playlists',

  // User management
  'users.view': 'View user list',
  'users.create': 'Create users',
  'users.edit': 'Edit users',
  'users.delete': 'Delete users',
  'users.manage': 'Full user management',

  // System administration
  'system.config': 'System configuration',
  'system.logs': 'View system logs',
  'system.admin': 'Full system admin'
};
```

**Middleware Protection:**

```typescript
// backend/src/middleware/rbac.ts
export const requirePermission = (permission: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const hasPermission = await checkPermission(user.id, permission);

    if (!hasPermission) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

// Usage
router.delete('/users/:id', requirePermission('users.delete'), deleteUser);
```

### Session Management

**Session Timeout:**

```bash
# .env
JWT_EXPIRATION=1h           # Short-lived access token
JWT_REFRESH_EXPIRATION=7d   # Longer refresh token
```

**Token Refresh Flow:**

1. Access token expires after 1 hour
2. Client uses refresh token to get new access token
3. Refresh token rotated on each use (future enhancement)
4. Refresh tokens stored in database for revocation

**Session Revocation:**

```typescript
// Logout endpoint
router.post('/auth/logout', authenticateToken, async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  // Add to blacklist (Redis recommended)
  await addToBlacklist(token);

  // Clear refresh token
  await revokeRefreshToken(req.user.id);

  res.json({ message: 'Logged out successfully' });
});
```

## JWT Security

### Secret Management

**CRITICAL: Change default JWT secret in production!**

Generate secure secrets:

```bash
# 64-byte (512-bit) secret
openssl rand -hex 64

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Environment Configuration:**

```bash
# NEVER use default in production
JWT_SECRET=a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456

# Separate secrets for different environments
JWT_SECRET_DEVELOPMENT=dev-secret-not-for-production
JWT_SECRET_STAGING=staging-unique-secret-different-from-prod
JWT_SECRET_PRODUCTION=production-unique-secret-rotate-regularly
```

**Secret Storage:**

- Use environment variables, not config files
- Store in secure secret management system (AWS Secrets Manager, HashiCorp Vault)
- Never commit to version control
- Rotate periodically (every 90 days recommended)

### JWT Configuration

**Secure JWT Options:**

```typescript
// backend/src/utils/jwt.ts
import jwt from 'jsonwebtoken';

export function signToken(payload: object, expiresIn: string = '1h'): string {
  return jwt.sign(
    payload,
    process.env.JWT_SECRET!,
    {
      algorithm: 'HS256',      // Secure algorithm
      expiresIn,               // Token expiration
      issuer: 'flashpoint-web', // Token issuer
      audience: 'flashpoint-api' // Intended audience
    }
  );
}

export function verifyToken(token: string): any {
  return jwt.verify(
    token,
    process.env.JWT_SECRET!,
    {
      algorithms: ['HS256'],    // Only allow HS256
      issuer: 'flashpoint-web',
      audience: 'flashpoint-api',
      clockTolerance: 30        // 30 second clock skew tolerance
    }
  );
}
```

### Token Validation

**Middleware Implementation:**

```typescript
// backend/src/middleware/auth.ts
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    // Verify token
    const decoded = verifyToken(token);

    // Check blacklist (if using Redis)
    const isBlacklisted = await checkBlacklist(token);
    if (isBlacklisted) {
      return res.status(401).json({ error: 'Token has been revoked' });
    }

    // Attach user to request
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Token expired' });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    return res.status(500).json({ error: 'Authentication failed' });
  }
};
```

## CORS Configuration

### Production CORS Settings

**Strict CORS (Recommended):**

```bash
# Single domain
DOMAIN=https://flashpoint.example.com

# Multiple domains
DOMAIN=https://flashpoint.example.com,https://www.flashpoint.example.com
```

**Nginx CORS Headers:**

```nginx
# Only if backend doesn't handle CORS
location /api/ {
    if ($request_method = 'OPTIONS') {
        add_header 'Access-Control-Allow-Origin' 'https://flashpoint.example.com' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type' always;
        add_header 'Access-Control-Max-Age' 1728000;
        add_header 'Content-Length' 0;
        return 204;
    }

    add_header 'Access-Control-Allow-Origin' 'https://flashpoint.example.com' always;
    proxy_pass http://backend_servers;
}
```

**Backend CORS Configuration:**

```typescript
// backend/src/middleware/cors.ts
import cors from 'cors';

const allowedOrigins = process.env.DOMAIN?.split(',') || [];

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,  // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400  // 24 hours
});
```

**Game Service CORS:**

```typescript
// game-service/src/middleware/cors.ts
// Allow all origins for game content (required for iframes)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Range');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});
```

## Rate Limiting and DDoS Protection

### Application-Level Rate Limiting

**Express Rate Limit Configuration:**

```typescript
// backend/src/middleware/rateLimiter.ts
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';

// Global rate limiter
export const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Use Redis for distributed rate limiting
  store: process.env.REDIS_ENABLED === 'true'
    ? new RedisStore({
        client: createClient({ url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}` })
      })
    : undefined
});

// Strict limiter for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  skipSuccessfulRequests: true,
  message: 'Too many login attempts, please try again later.'
});

// API limiter
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60
});
```

**Usage:**

```typescript
// Apply to all routes
app.use(globalLimiter);

// Apply to auth routes
app.use('/api/auth/login', authLimiter);

// Apply to API routes
app.use('/api', apiLimiter);
```

### Nginx Rate Limiting

**Configuration:**

```nginx
# /etc/nginx/nginx.conf
http {
    # Rate limit zones
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=1r/m;
    limit_req_zone $binary_remote_addr zone=general_limit:10m rate=30r/s;

    # Connection limit
    limit_conn_zone $binary_remote_addr zone=conn_limit:10m;

    server {
        # Global connection limit
        limit_conn conn_limit 10;

        # Auth endpoints (strict)
        location /api/auth/login {
            limit_req zone=auth_limit burst=3 nodelay;
            proxy_pass http://backend_servers;
        }

        # API endpoints (moderate)
        location /api/ {
            limit_req zone=api_limit burst=20 nodelay;
            proxy_pass http://backend_servers;
        }

        # General endpoints (lenient)
        location / {
            limit_req zone=general_limit burst=50 nodelay;
            proxy_pass http://backend_servers;
        }
    }
}
```

### Firewall Rules

**UFW (Ubuntu):**

```bash
# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Rate limit SSH
sudo ufw limit 22/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

**iptables (Advanced):**

```bash
# Limit connections per IP
iptables -A INPUT -p tcp --dport 80 -m connlimit --connlimit-above 20 -j REJECT

# Rate limit new connections
iptables -A INPUT -p tcp --dport 80 -m state --state NEW -m recent --set
iptables -A INPUT -p tcp --dport 80 -m state --state NEW -m recent --update --seconds 60 --hitcount 20 -j DROP

# Save rules
iptables-save > /etc/iptables/rules.v4
```

## Input Validation

### Validation with Zod

**Schema Validation:**

```typescript
// backend/src/validators/user.ts
import { z } from 'zod';

export const createUserSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must not exceed 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores'),

  email: z.string()
    .email('Invalid email address')
    .max(255, 'Email too long'),

  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/[A-Z]/, 'Password must contain uppercase letter')
    .regex(/[a-z]/, 'Password must contain lowercase letter')
    .regex(/[0-9]/, 'Password must contain number'),

  role: z.enum(['admin', 'moderator', 'user', 'guest']).optional()
});

export const loginSchema = z.object({
  username: z.string().min(1, 'Username required'),
  password: z.string().min(1, 'Password required')
});
```

**Validation Middleware:**

```typescript
// backend/src/middleware/validate.ts
import { z } from 'zod';

export const validate = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors
        });
      }
      next(error);
    }
  };
};

// Usage
router.post('/users', validate(createUserSchema), createUser);
```

### Path Traversal Prevention

**File Path Sanitization:**

```typescript
// backend/src/utils/pathSecurity.ts
import path from 'path';

export function sanitizePath(userPath: string, baseDir: string): string | null {
  // Normalize and resolve path
  const normalizedPath = path.normalize(userPath).replace(/^(\.\.(\/|\\|$))+/, '');
  const resolvedPath = path.resolve(baseDir, normalizedPath);

  // Ensure path is within base directory
  if (!resolvedPath.startsWith(baseDir)) {
    return null; // Path traversal attempt
  }

  return resolvedPath;
}

// Usage
const imagePath = sanitizePath(req.params.imageName, IMAGES_DIR);
if (!imagePath) {
  return res.status(403).json({ error: 'Invalid path' });
}
```

**URL Parameter Validation:**

```typescript
// Validate game ID (UUID)
const gameIdSchema = z.string().uuid();

// Validate search query
const searchSchema = z.object({
  q: z.string().max(200).optional(),
  platform: z.string().max(50).optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0)
});
```

## SQL Injection Prevention

### Parameterized Queries

**Always use prepared statements:**

```typescript
// GOOD: Parameterized query
const games = db.prepare('SELECT * FROM game WHERE title LIKE ?')
  .all(`%${searchQuery}%`);

// BAD: String concatenation (NEVER DO THIS)
const games = db.prepare(`SELECT * FROM game WHERE title LIKE '%${searchQuery}%'`)
  .all();
```

**Complex Queries:**

```typescript
// backend/src/services/GameService.ts
export class GameService {
  searchGames(filters: GameFilters): Game[] {
    let query = 'SELECT * FROM game WHERE 1=1';
    const params: any[] = [];

    if (filters.title) {
      query += ' AND title LIKE ?';
      params.push(`%${filters.title}%`);
    }

    if (filters.platform) {
      query += ' AND platform = ?';
      params.push(filters.platform);
    }

    if (filters.library) {
      query += ' AND library = ?';
      params.push(filters.library);
    }

    query += ' LIMIT ? OFFSET ?';
    params.push(filters.limit, filters.offset);

    return this.db.prepare(query).all(...params) as Game[];
  }
}
```

### Database Permissions

**Principle of Least Privilege:**

- Flashpoint database: **READ-ONLY** access
- User database: Read/Write only for app user
- No DROP/ALTER permissions for app database user

**SQLite Pragmas:**

```typescript
// backend/src/services/DatabaseService.ts
const db = new Database(dbPath, {
  readonly: true,  // Flashpoint database is read-only
  fileMustExist: true
});

// Set secure pragmas
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('foreign_keys = ON');
```

## File Access Security

### Read-Only Mounts

**Docker volumes:**

```yaml
# docker-compose.yml
volumes:
  - ${FLASHPOINT_HOST_PATH}:/data/flashpoint:ro  # Read-only
```

**File system permissions:**

```bash
# Flashpoint data owned by different user
sudo chown -R flashpoint-data:flashpoint-data /data/flashpoint
sudo chmod -R 755 /data/flashpoint

# App cannot write to Flashpoint directory
sudo chmod -R a-w /data/flashpoint
```

### File Serving Security

**Restrict file types:**

```typescript
// game-service/src/utils/mimeTypes.ts
const ALLOWED_MIME_TYPES = new Set([
  'text/html',
  'text/css',
  'text/javascript',
  'application/javascript',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/svg+xml',
  'application/x-shockwave-flash',
  // ... other safe types
]);

export function isAllowedMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.has(mimeType);
}
```

**Content-Type validation:**

```typescript
// Prevent MIME sniffing attacks
res.setHeader('X-Content-Type-Options', 'nosniff');
res.setHeader('Content-Type', determineMimeType(filePath));
```

## HTTP Security Headers

### Helmet.js Configuration

```typescript
// backend/src/middleware/security.ts
import helmet from 'helmet';

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Needed for Ruffle
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'"],
      childSrc: ["'self'"],
      workerSrc: ["'self'", 'blob:'],
      formAction: ["'self'"],
      upgradeInsecureRequests: []
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: {
    action: 'sameorigin'
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  }
});

app.use(securityHeaders);
```

### Nginx Security Headers

```nginx
# Security headers
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-src 'self'; object-src 'none'; worker-src 'self' blob:;" always;

# Remove server tokens
server_tokens off;
```

## SSL/TLS Configuration

### Modern TLS Configuration

```nginx
# /etc/nginx/snippets/ssl-params.conf

# Protocols
ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers on;

# Ciphers (Mozilla Modern)
ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384';

# Session cache
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
ssl_session_tickets off;

# OCSP stapling
ssl_stapling on;
ssl_stapling_verify on;
resolver 8.8.8.8 8.8.4.4 valid=300s;
resolver_timeout 5s;

# DH parameters (4096 bit)
ssl_dhparam /etc/nginx/dhparam.pem;
```

**Generate DH parameters:**

```bash
sudo openssl dhparam -out /etc/nginx/dhparam.pem 4096
```

### Certificate Management

**Let's Encrypt Auto-Renewal:**

```bash
# Test renewal
sudo certbot renew --dry-run

# Set up auto-renewal
sudo crontab -e

# Add cron job (daily check, renew if needed)
0 3 * * * certbot renew --post-hook "systemctl reload nginx" --quiet
```

## Container Security

### Non-Root User

**Dockerfile best practice:**

```dockerfile
# Create non-root user
RUN addgroup -g 1001 -S flashpoint && \
    adduser -S flashpoint -u 1001

# Change ownership
RUN chown -R flashpoint:flashpoint /app

# Switch to non-root user
USER flashpoint
```

### Resource Limits

**Docker Compose:**

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
          pids: 100
        reservations:
          memory: 512M
```

### Image Security

**Scan images for vulnerabilities:**

```bash
# Using Docker Scout
docker scout cves flashpoint-backend:latest

# Using Trivy
trivy image flashpoint-backend:latest

# Using Snyk
snyk container test flashpoint-backend:latest
```

**Keep images updated:**

```bash
# Update base images
docker pull node:20-alpine

# Rebuild with latest patches
docker-compose build --no-cache
```

### Secrets Management

**Never embed secrets in images:**

```dockerfile
# BAD - Don't do this
ENV JWT_SECRET=my-secret-key

# GOOD - Use build args and env vars
ARG BUILD_ENV
ENV NODE_ENV=${BUILD_ENV}
```

**Use Docker secrets:**

```yaml
secrets:
  jwt_secret:
    file: ./secrets/jwt_secret.txt

services:
  backend:
    secrets:
      - jwt_secret
    environment:
      - JWT_SECRET_FILE=/run/secrets/jwt_secret
```

## Network Security

### Firewall Configuration

**Allow only necessary ports:**

```bash
# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Block direct access to backend
sudo ufw deny 3100/tcp

# Block game service ports
sudo ufw deny 22500/tcp
sudo ufw deny 22501/tcp
```

### Network Isolation

**Docker network isolation:**

```yaml
networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true  # No internet access

services:
  frontend:
    networks:
      - frontend

  backend:
    networks:
      - frontend
      - backend

  database:
    networks:
      - backend  # Only accessible from backend
```

### Reverse Proxy Only

**Bind services to localhost:**

```bash
# Backend only listens on localhost
HOST=127.0.0.1
PORT=3100
```

**Nginx proxies external requests:**

```nginx
upstream backend_servers {
    server 127.0.0.1:3100;  # Only localhost
}
```

## Logging and Monitoring

### Security Event Logging

**Log security-relevant events:**

```typescript
// backend/src/middleware/securityLogger.ts
export const securityLogger = (req: Request, res: Response, next: NextFunction) => {
  const logEvent = (event: string, details: object) => {
    logger.warn('Security Event', {
      event,
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.get('user-agent'),
      path: req.path,
      method: req.method,
      ...details
    });
  };

  // Log failed auth attempts
  res.on('finish', () => {
    if (req.path.includes('/auth/login') && res.statusCode === 401) {
      logEvent('FAILED_LOGIN', {
        username: req.body.username
      });
    }

    if (res.statusCode === 403) {
      logEvent('FORBIDDEN_ACCESS', {
        resource: req.path
      });
    }

    if (res.statusCode === 429) {
      logEvent('RATE_LIMIT_EXCEEDED', {});
    }
  });

  next();
};
```

### Intrusion Detection

**fail2ban configuration:**

```ini
# /etc/fail2ban/jail.local
[flashpoint-auth]
enabled = true
port = http,https
filter = flashpoint-auth
logpath = /var/log/nginx/flashpoint-access.log
maxretry = 5
bantime = 3600
findtime = 600
action = iptables-multiport[name=flashpoint, port="http,https"]
```

**Filter:**

```ini
# /etc/fail2ban/filter.d/flashpoint-auth.conf
[Definition]
failregex = ^<HOST> .* "POST /api/auth/login HTTP.*" 401
ignoreregex =
```

### Security Monitoring

**Monitor for:**

- Failed login attempts
- Rate limit violations
- 403 Forbidden errors
- Unusual traffic patterns
- Large file downloads
- SQL injection attempts
- Path traversal attempts

**Alerting:**

```bash
# Email alerts for security events
# /etc/fail2ban/action.d/sendmail-whois.conf
```

## Data Protection

### Database Encryption

**Encrypt sensitive data at rest:**

```typescript
// backend/src/utils/encryption.ts
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decrypt(encryptedData: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedData.split(':');

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

### Backup Security

**Encrypt backups:**

```bash
# Encrypted backup script
#!/bin/bash
BACKUP_FILE="user-db-$(date +%Y%m%d).db"
ENCRYPTED_FILE="$BACKUP_FILE.gpg"

# Create backup
sqlite3 /opt/flashpoint-web/backend/data/user.db ".backup '$BACKUP_FILE'"

# Encrypt with GPG
gpg --symmetric --cipher-algo AES256 "$BACKUP_FILE"

# Remove unencrypted backup
shred -u "$BACKUP_FILE"

# Upload encrypted backup
aws s3 cp "$ENCRYPTED_FILE" s3://backups/flashpoint/
```

### Data Retention

**Auto-delete old logs and sessions:**

```sql
-- Delete old play sessions
DELETE FROM play_sessions WHERE created_at < datetime('now', '-90 days');

-- Delete old audit logs
DELETE FROM audit_logs WHERE created_at < datetime('now', '-1 year');
```

## Security Checklist

### Pre-Production Checklist

- [ ] Change default JWT secret (min 64 characters)
- [ ] Set strong CORS origin (no wildcards)
- [ ] Enable HTTPS with valid SSL certificate
- [ ] Configure rate limiting on all endpoints
- [ ] Enable security headers (Helmet.js)
- [ ] Scan images for vulnerabilities
- [ ] Run as non-root user in containers
- [ ] Set resource limits on containers
- [ ] Enable firewall (UFW/iptables)
- [ ] Configure Nginx reverse proxy
- [ ] Set up fail2ban for intrusion detection
- [ ] Enable security event logging
- [ ] Implement password complexity requirements
- [ ] Configure session timeout
- [ ] Enable database encryption for sensitive fields
- [ ] Set up encrypted backups
- [ ] Disable unnecessary services
- [ ] Remove default credentials
- [ ] Update all dependencies
- [ ] Configure log rotation
- [ ] Set up monitoring and alerting

### Regular Security Maintenance

**Weekly:**
- [ ] Review security logs
- [ ] Check for failed login attempts
- [ ] Monitor rate limit violations
- [ ] Review fail2ban bans

**Monthly:**
- [ ] Update dependencies (`npm audit`)
- [ ] Review user permissions
- [ ] Check SSL certificate expiration
- [ ] Review access logs for anomalies
- [ ] Test backup restoration

**Quarterly:**
- [ ] Rotate JWT secrets
- [ ] Security audit of codebase
- [ ] Penetration testing
- [ ] Update SSL/TLS configuration
- [ ] Review and update firewall rules

**Annually:**
- [ ] Full security assessment
- [ ] Third-party security audit
- [ ] Disaster recovery drill
- [ ] Update incident response plan

## Next Steps

- [Docker Deployment](./docker-deployment.md) - Secure container deployment
- [Production Setup](./production-setup.md) - Production configuration
- [Environment Variables](./environment-variables.md) - Secure environment configuration
