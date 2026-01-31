# Security Fixes - Code Implementation Guide

This document provides step-by-step code changes to fix the critical security vulnerabilities.

---

## CRITICAL FIX #1: Add Content-Security-Policy Header

**File:** `frontend/index.html`

Replace current header section with:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="
      default-src 'self';
      script-src 'self' /ruffle/ /ruffle/ruffle.js;
      style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
      style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com;
      style-src-attr 'unsafe-inline';
      font-src 'self' https://fonts.gstatic.com data:;
      img-src 'self' data: http://localhost:22500 http://localhost:22501;
      frame-src 'self' http://localhost:22500 http://localhost:22501;
      connect-src 'self' http://localhost:3100 http://localhost:22500 http://localhost:22501 https://infinity.flashpointarchive.org https://infinity.unstable.life;
      object-src 'none';
      base-uri 'self';
      form-action 'self';
      frame-ancestors 'none';
      block-all-mixed-content;
    " />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <title>Flashpoint Archive</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**Notes:**
- `'unsafe-inline'` for styles is required by Tailwind/ShadCN UI (this is acceptable as styles have limited XSS vector)
- `frame-src 'self'` allows only same-origin iframes (your game service)
- `object-src 'none'` prevents embedding of plugins
- `frame-ancestors 'none'` prevents clickjacking

---

## CRITICAL FIX #2: Minimize Iframe Sandbox Attributes

**File:** `frontend/src/components/player/GamePlayer.tsx`

**Change (Line ~132):**

```typescript
// BEFORE:
<iframe
  src={contentUrl}
  className="w-full h-full border-0"
  title={title}
  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-pointer-lock allow-top-navigation-by-user-activation"
  allow="fullscreen; autoplay; clipboard-read; clipboard-write"
  onLoad={() => {
    console.log('[HTML5 Game] Loaded successfully:', contentUrl);
    setIframeError(null);
  }}
  onError={(e) => {
    console.error('[HTML5 Game] Load error:', e);
    setIframeError('Failed to load HTML5 game');
  }}
/>

// AFTER:
<iframe
  src={contentUrl}
  className="w-full h-full border-0"
  title={title}
  sandbox="allow-scripts allow-forms"
  allow="fullscreen"
  onLoad={() => {
    console.log('[HTML5 Game] Loaded successfully:', contentUrl);
    setIframeError(null);
  }}
  onError={(e) => {
    console.error('[HTML5 Game] Load error:', e);
    setIframeError('Failed to load HTML5 game');
  }}
/>
```

---

## CRITICAL FIX #3: Add SRI Checksum to Ruffle

**File:** `frontend/src/components/player/RufflePlayer.tsx`

**Step 1: Generate SRI Checksum**

Run this before building:

```bash
# Windows (PowerShell)
$hash = (Get-FileHash "frontend/public/ruffle/ruffle.js" -Algorithm SHA384).Hash
$base64 = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes([System.Convert]::FromHexString($hash)))
Write-Host "sha384-$base64"

# Mac/Linux
openssl dgst -sha384 -binary frontend/public/ruffle/ruffle.js | openssl base64 -A
```

**Step 2: Create Configuration File**

**File:** `frontend/src/config/ruffle-config.ts` (NEW FILE)

```typescript
/**
 * Ruffle Player Configuration with Security
 * Update SRI_INTEGRITY hash when upgrading Ruffle
 */

export const RUFFLE_CONFIG = {
  src: '/ruffle/ruffle.js',
  // UPDATE THIS HASH when Ruffle is upgraded
  // Run: openssl dgst -sha384 -binary frontend/public/ruffle/ruffle.js | openssl base64 -A
  integrity: 'sha384-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', // Replace with actual hash
  crossOrigin: 'anonymous',
} as const;

/**
 * Validate that the Ruffle script loaded correctly with integrity
 */
export async function validateRuffleIntegrity(): Promise<boolean> {
  const ruffleScript = document.querySelector(
    `script[src="${RUFFLE_CONFIG.src}"]`
  ) as HTMLScriptElement;

  if (!ruffleScript) {
    return false;
  }

  // Verify the script has the correct integrity attribute
  return ruffleScript.integrity === RUFFLE_CONFIG.integrity;
}
```

**Step 3: Update RufflePlayer Component**

**File:** `frontend/src/components/player/RufflePlayer.tsx`

Replace the script loading section (around lines 80-95):

```typescript
// BEFORE:
if (!(window as any).RufflePlayer) {
  const existingScript = document.querySelector(
    'script[src="/ruffle/ruffle.js"]',
  );

  if (!existingScript) {
    const script = document.createElement("script");
    script.src = "/ruffle/ruffle.js";

    // Wait for script to load
    await new Promise<void>((resolve, reject) => {
      script.onload = () => resolve();
      script.onerror = () =>
        reject(new Error("Failed to load Ruffle script"));
      document.head.appendChild(script);
    });
  }
}

// AFTER:
if (!(window as any).RufflePlayer) {
  const existingScript = document.querySelector(
    'script[src="/ruffle/ruffle.js"]',
  );

  if (!existingScript) {
    const script = document.createElement("script");
    script.src = RUFFLE_CONFIG.src;
    script.integrity = RUFFLE_CONFIG.integrity;
    script.crossOrigin = RUFFLE_CONFIG.crossOrigin;

    // Wait for script to load
    await new Promise<void>((resolve, reject) => {
      script.onload = () => resolve();
      script.onerror = () =>
        reject(new Error("Failed to load Ruffle script"));

      // Verify integrity before adding to DOM
      if (!script.integrity) {
        return reject(new Error("Ruffle SRI integrity not configured"));
      }

      document.head.appendChild(script);
    });
  }
}
```

Add import at top:

```typescript
import { RUFFLE_CONFIG } from '@/config/ruffle-config';
```

---

## CRITICAL FIX #4: Enhance Input Validation

**File:** `frontend/src/components/auth/LoginForm.tsx`

Replace the schema:

```typescript
// BEFORE:
const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

// AFTER:
const loginSchema = z.object({
  username: z.string()
    .min(1, 'Username is required')
    .max(50, 'Username too long')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Username can only contain letters, numbers, hyphens, and underscores'
    )
    .refine(
      val => !/^admin$/i.test(val),
      'Reserved username'
    ),
  password: z.string()
    .min(1, 'Password is required')
    .max(128, 'Password too long'),
});
```

**File:** `frontend/src/components/auth/RegisterForm.tsx`

Replace the schema:

```typescript
// BEFORE:
const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(50, 'Username must be at most 50 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// AFTER:
const registerSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be at most 50 characters')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Username can only contain letters, numbers, hyphens, and underscores'
    )
    .refine(
      val => !/^(admin|root|system|moderator|test)$/i.test(val),
      'This username is reserved'
    ),
  email: z.string()
    .email('Invalid email address')
    .max(254, 'Email too long')
    .toLowerCase(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/[0-9]/, 'Password must contain a number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain a special character'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});
```

---

## CRITICAL FIX #5: Add Client-Side Rate Limiting

**File:** `frontend/src/lib/rate-limiter.ts` (NEW FILE)

```typescript
/**
 * Client-side rate limiter to prevent brute force attacks
 */
interface RateLimitRule {
  limit: number;
  windowMs: number;
}

export class RateLimiter {
  private attempts: Map<string, number[]> = new Map();
  private rules: Map<string, RateLimitRule> = new Map();

  constructor(rules?: Record<string, RateLimitRule>) {
    // Default rules
    this.rules.set('post:/auth/login', { limit: 5, windowMs: 15 * 60 * 1000 });
    this.rules.set('post:/auth/register', { limit: 3, windowMs: 60 * 60 * 1000 });
    this.rules.set('post:/auth/refresh', { limit: 10, windowMs: 60 * 1000 });
    this.rules.set('default', { limit: 30, windowMs: 60 * 1000 });

    // Override with custom rules
    if (rules) {
      Object.entries(rules).forEach(([key, rule]) => {
        this.rules.set(key, rule);
      });
    }
  }

  isAllowed(endpoint: string, method: string = 'get'): boolean {
    const key = `${method}:${endpoint}`;
    const rule = this.rules.get(key) || this.rules.get('default')!;

    const now = Date.now();
    const timestamps = this.attempts.get(key) || [];

    // Remove timestamps outside the window
    const recentAttempts = timestamps.filter(
      time => now - time < rule.windowMs
    );

    if (recentAttempts.length >= rule.limit) {
      return false;
    }

    // Record this attempt
    recentAttempts.push(now);
    this.attempts.set(key, recentAttempts);

    return true;
  }

  getRemainingTime(endpoint: string, method: string = 'get'): number {
    const key = `${method}:${endpoint}`;
    const rule = this.rules.get(key) || this.rules.get('default')!;

    const timestamps = this.attempts.get(key) || [];
    const now = Date.now();

    const recentAttempts = timestamps.filter(
      time => now - time < rule.windowMs
    );

    if (recentAttempts.length < rule.limit) {
      return 0; // No restriction
    }

    // Return milliseconds until oldest request exits the window
    return rule.windowMs - (now - recentAttempts[0]);
  }

  reset(endpoint?: string, method?: string): void {
    if (!endpoint) {
      this.attempts.clear();
      return;
    }

    const key = `${method}:${endpoint}`;
    this.attempts.delete(key);
  }
}

export const rateLimiter = new RateLimiter();
```

**File:** `frontend/src/lib/api.ts`

Add to top:

```typescript
import { rateLimiter } from './rate-limiter';
```

Add request interceptor:

```typescript
// Add this BEFORE the existing request interceptor
api.interceptors.request.use(
  (config) => {
    const endpoint = config.url || '';
    const method = config.method?.toLowerCase() || 'get';

    // Check rate limit
    if (!rateLimiter.isAllowed(endpoint, method)) {
      const remainingMs = rateLimiter.getRemainingTime(endpoint, method);
      const remainingSecs = Math.ceil(remainingMs / 1000);

      const error = new Error(
        `Too many requests. Please try again in ${remainingSecs} seconds.`
      );
      (error as any).code = 'RATE_LIMIT_EXCEEDED';
      return Promise.reject(error);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
```

---

## HIGH PRIORITY FIX #1: Sanitize Error Messages

**File:** `frontend/src/components/player/GamePlayer.tsx`

Replace error rendering (around line 105):

```typescript
// BEFORE:
{iframeError && (
  <div className="absolute inset-0 flex items-center justify-center bg-background/90 z-10">
    <div className="text-center max-w-md p-6">
      <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
      <h3 className="text-xl font-bold mb-2">Failed to Load Game</h3>
      <p className="mb-4">{iframeError}</p>
      <div className="bg-card rounded p-3 mb-4 border border-border">
        <p className="text-sm text-muted-foreground text-left">
          <strong>URL:</strong> {contentUrl}
        </p>
      </div>
      <p className="text-sm text-muted-foreground">
        Check the browser console for more details.
      </p>
    </div>
  </div>
)}

// AFTER:
{iframeError && (
  <div className="absolute inset-0 flex items-center justify-center bg-background/90 z-10">
    <div className="text-center max-w-md p-6">
      <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
      <h3 className="text-xl font-bold mb-2">Failed to Load Game</h3>
      <p className="mb-4">Unable to load this game. Please try again later or contact support.</p>
      <p className="text-sm text-muted-foreground">
        Error ID: {Date.now().toString(36).toUpperCase()}
      </p>
    </div>
  </div>
)}
```

**File:** `frontend/src/components/player/RufflePlayer.tsx`

Remove or comment out debug logging:

```typescript
// BEFORE:
console.log("[Ruffle] Waiting for any previous cleanup to complete...");
// ... many console.log statements

// AFTER:
if (import.meta.env.DEV) {
  console.log("[Ruffle] Waiting for any previous cleanup to complete...");
}
```

Create logger utility file:

**File:** `frontend/src/lib/logger.ts` (NEW FILE)

```typescript
/**
 * Centralized logging with environment awareness
 */

const isDev = import.meta.env.DEV;

export const logger = {
  debug: (message: string, data?: any) => {
    if (isDev) {
      console.log(`[DEBUG] ${message}`, data);
    }
  },

  info: (message: string, data?: any) => {
    if (isDev) {
      console.log(`[INFO] ${message}`, data);
    }
  },

  warn: (message: string, data?: any) => {
    console.warn(`[WARN] ${message}`, data);
  },

  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${message}`, error);
    // Send to error reporting service in production
    if (!isDev) {
      reportErrorToServer({ message, error });
    }
  },
};

async function reportErrorToServer(errorData: any) {
  try {
    await fetch('/api/monitoring/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...errorData,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      }),
    }).catch(err => console.error('Failed to report error:', err));
  } catch (err) {
    // Silently fail - don't create infinite loops
  }
}
```

---

## HIGH PRIORITY FIX #2: Add Game Data Sanitization

**File:** `frontend/src/components/library/GameCard.tsx`

Add import at top:

```typescript
import DOMPurify from 'dompurify';
```

Update package.json to install DOMPurify:

```bash
npm install dompurify
npm install --save-dev @types/dompurify
```

Create sanitization utility:

**File:** `frontend/src/lib/sanitize.ts` (NEW FILE)

```typescript
import DOMPurify from 'dompurify';

/**
 * Sanitize user-facing game data
 */
export function sanitizeGameTitle(title: string): string {
  return DOMPurify.sanitize(title, {
    ALLOWED_TAGS: [], // No HTML tags
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
}

export function sanitizePlatformName(platform: string): string {
  return DOMPurify.sanitize(platform, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
}

export function sanitizeGameDescription(description: string): string {
  return DOMPurify.sanitize(description, {
    ALLOWED_TAGS: ['br', 'strong', 'em', 'p'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
}
```

Update GameCard to use sanitization:

```typescript
import { sanitizeGameTitle, sanitizePlatformName } from '@/lib/sanitize';

// In component:
<h3
  className="font-semibold text-sm truncate w-full"
  title={sanitizeGameTitle(game.title)}
>
  {sanitizeGameTitle(game.title)}
</h3>

{game.platformName && (
  <Badge variant="secondary" className="h-5 p-1 text-xs font-normal">
    <span className="truncate">{sanitizePlatformName(game.platformName)}</span>
  </Badge>
)}
```

---

## Testing the Fixes

Create test file:

**File:** `frontend/src/__tests__/security.test.ts` (NEW FILE)

```typescript
import { describe, it, expect } from 'vitest';
import { sanitizeGameTitle } from '@/lib/sanitize';
import DOMPurify from 'dompurify';

describe('Security Fixes', () => {
  it('should sanitize XSS attempts in game titles', () => {
    const xssPayload = 'Game<img src=x onerror="alert(\'xss\')">';
    const sanitized = sanitizeGameTitle(xssPayload);
    expect(sanitized).not.toContain('<img');
    expect(sanitized).not.toContain('onerror');
  });

  it('should preserve legitimate game titles', () => {
    const title = "The Legend of Zelda: A Link's Awakening";
    const sanitized = sanitizeGameTitle(title);
    expect(sanitized).toBe(title);
  });

  it('should have CSP meta tag', () => {
    const cspMeta = document.querySelector(
      'meta[http-equiv="Content-Security-Policy"]'
    );
    expect(cspMeta).toBeTruthy();
    expect(cspMeta?.getAttribute('content')).toContain('default-src');
  });

  it('should have SRI integrity on Ruffle script', () => {
    const ruffleScript = document.querySelector(
      'script[src*="ruffle.js"]'
    ) as HTMLScriptElement;
    expect(ruffleScript?.integrity).toBeTruthy();
    expect(ruffleScript?.integrity).toMatch(/^sha384-/);
  });
});
```

---

## Deployment Checklist

- [ ] CSP meta tag added to index.html
- [ ] Iframe sandbox minimized
- [ ] Ruffle SRI checksum added
- [ ] Input validation enhanced
- [ ] Rate limiting implemented
- [ ] Error messages sanitized
- [ ] Logger utility created
- [ ] DOMPurify integrated
- [ ] All tests passing
- [ ] npm audit clean
- [ ] Security tests pass
- [ ] Backend changes deployed first (HTTP-only cookies, CSRF tokens)
- [ ] Frontend deployed
- [ ] Monitor for errors in production

---

## Backend Changes Required (Coordinate with Backend Team)

These changes **must** be implemented on the backend before frontend deployment:

1. **HTTP-Only Cookies for Tokens**
   - Remove JWT token from response body
   - Send Set-Cookie with HttpOnly; Secure; SameSite=Strict

2. **CSRF Token Endpoints**
   - GET `/api/auth/csrf-token` - Returns new CSRF token
   - Validate X-CSRF-Token header on all state-changing requests

3. **Security Headers Middleware**
   ```
   X-Content-Type-Options: nosniff
   X-Frame-Options: SAMEORIGIN
   X-XSS-Protection: 1; mode=block
   Referrer-Policy: strict-origin-when-cross-origin
   Permissions-Policy: geolocation=(), microphone=(), camera=()
   Strict-Transport-Security: max-age=31536000; includeSubDomains
   ```

4. **Error Monitoring Endpoint**
   - POST `/api/monitoring/errors` - Accept error reports

---

## Timeline

**Day 1-2:** Apply all "BEFORE" changes in this document
**Day 3:** Backend team implements HTTP-only cookies + CSRF
**Day 4:** Integration testing
**Day 5:** Security testing + npm audit
**Day 6:** Deploy to staging
**Day 7:** Production deployment

---

**Last Updated:** 2026-01-25
