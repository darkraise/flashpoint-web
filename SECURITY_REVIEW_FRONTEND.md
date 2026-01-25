# Frontend Security Review Report

**Project:** Flashpoint Web Frontend
**Reviewed:** 2026-01-25
**Reviewer:** Security Analysis Agent
**Status:** CRITICAL ISSUES FOUND - ACTION REQUIRED

---

## Executive Summary

The frontend application exhibits several security vulnerabilities ranging from critical to medium severity. The most critical findings relate to:

1. **Insecure Token Storage** - JWT tokens stored in localStorage without protection
2. **Missing Security Headers** - No CSP, X-Frame-Options, or security headers enforcement
3. **Unsafe Iframe Sandbox Attributes** - Game content lacks proper sandboxing
4. **Insufficient Input Validation** - Some forms lack comprehensive validation
5. **Potential XSS via Ruffle** - Unsafe script loading and innerHTML manipulation
6. **API Key Exposure Risk** - Axios interceptor could expose bearer tokens in logs

**Overall Risk Level:** CRITICAL

---

## Critical Issues (Fix Immediately)

### 1. INSECURE JWT TOKEN STORAGE IN LOCALSTORAGE

**Severity:** CRITICAL
**Category:** Broken Authentication / Sensitive Data Exposure
**Location:** `frontend/src/store/auth.ts` (lines 76-96), `frontend/src/lib/api.ts` (lines 546-551)

**Issue:**

JWT access tokens and refresh tokens are stored in localStorage without encryption or CSRF protection. This is a known attack vector where:

- XSS vulnerabilities can steal tokens via JavaScript
- Malicious browser extensions can access tokens
- Tokens persist across browser sessions
- No CSRF token protection for state-changing requests

```typescript
// VULNERABLE: Storing sensitive tokens in localStorage
localStorage.setItem(name, value);

// When retrieved
const token = useAuthStore.getState().accessToken;
if (token) {
  config.headers.Authorization = `Bearer ${token}`;
}
```

**Impact:**

- Account takeover via token theft
- Unauthorized access to user data and sensitive operations
- Long-term compromise if attacker obtains stored tokens

**Proof of Concept:**

```javascript
// Any script on the page (via XSS) can steal tokens
const tokens = JSON.parse(localStorage.getItem('flashpoint-auth'));
console.log(tokens.state.accessToken); // Token exposed!
```

**Remediation:**

1. Move tokens to HTTP-only cookies (not accessible via JavaScript)
2. Use Secure flag for HTTPS-only transmission
3. Use SameSite=Strict for CSRF protection
4. Implement CSRF tokens for state-changing requests
5. Set short expiration times for access tokens

```typescript
// RECOMMENDED: Use HTTP-only cookies
// Backend should set cookie with:
// Set-Cookie: accessToken=<token>;
//   HttpOnly;
//   Secure;
//   SameSite=Strict;
//   Max-Age=3600

// Frontend accesses automatically (no XSS risk)
const refreshResponse = await api.post('/auth/refresh');
// Token automatically included in cookie
```

**References:**
- OWASP: Authentication Cheat Sheet
- CWE-613: Insufficient Session Expiration
- CWE-522: Insufficiently Protected Credentials

---

### 2. MISSING SECURITY HEADERS AND CSP CONFIGURATION

**Severity:** CRITICAL
**Category:** Security Misconfiguration
**Location:** `frontend/index.html`, `frontend/vite.config.ts`, Backend should enforce

**Issue:**

The frontend is missing critical security headers:

- **No Content-Security-Policy (CSP)** - Vulnerable to XSS
- **No X-Frame-Options** - Clickjacking risk
- **No X-Content-Type-Options** - MIME sniffing attacks
- **No Referrer-Policy** - Information disclosure
- **No Permissions-Policy** - Feature abuse risk

```html
<!-- VULNERABLE: No security headers in index.html -->
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <!-- Missing CSP meta tag -->
  </head>
</html>
```

**Impact:**

- XSS attacks can execute arbitrary JavaScript
- Clickjacking attacks can trick users
- MIME sniffing can execute malicious files
- Referrer leaks sensitive information

**Remediation:**

1. Add CSP meta tag to index.html:

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' /ruffle/;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data:;
  frame-src 'self';
  connect-src 'self' http://localhost:3100 http://localhost:22500 http://localhost:22501;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
  block-all-mixed-content;
">
```

2. Add other security headers (via backend middleware or vite plugin):

```typescript
// Backend should add these headers:
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});
```

3. Configure Vite to include CSP in development:

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    middlewares: [(req, res, next) => {
      res.setHeader('Content-Security-Policy', '...');
      next();
    }]
  }
});
```

**References:**
- OWASP: Content Security Policy Cheat Sheet
- MDN: Content-Security-Policy
- CWE-693: Protection Mechanism Failure

---

### 3. UNSAFE IFRAME SANDBOX ATTRIBUTES FOR GAME CONTENT

**Severity:** CRITICAL
**Category:** Insufficient Isolation / XSS
**Location:** `frontend/src/components/player/GamePlayer.tsx` (line 132)

**Issue:**

HTML5 game content is loaded in an iframe with overly permissive sandbox attributes:

```typescript
// VULNERABLE: Too permissive sandbox
<iframe
  src={contentUrl}
  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-pointer-lock allow-top-navigation-by-user-activation"
  allow="fullscreen; autoplay; clipboard-read; clipboard-write"
/>
```

**Specific Issues:**

1. `allow-same-origin` - Allows iframe to access parent window context
2. `allow-popups` - Can open arbitrary pop-ups/windows
3. `allow-pointer-lock` - Can lock mouse pointer
4. `allow-top-navigation-by-user-activation` - Can redirect parent window
5. `clipboard-read; clipboard-write` - Unrestricted clipboard access

**Impact:**

- Malicious game code can escape sandbox and compromise parent page
- Can steal tokens from parent window
- Can redirect user to phishing sites
- Can access clipboard data
- Can interfere with user input

**Proof of Concept:**

```javascript
// Inside game iframe
// With allow-same-origin, this attacks parent:
try {
  const parentAuth = window.parent.localStorage.getItem('flashpoint-auth');
  // Steal tokens!
} catch (e) {
  // Still vulnerable if relaxed CORS
}
```

**Remediation:**

Minimize sandbox permissions to absolute minimum:

```typescript
// SECURE: Minimal sandbox permissions
<iframe
  src={contentUrl}
  title={title}
  sandbox="allow-scripts allow-forms"
  allow="fullscreen"
  onLoad={() => console.log('Game loaded')}
  onError={(e) => console.error('Load error:', e)}
/>
```

**Explanation of Minimal Attributes:**

- `allow-scripts` - Required for games to execute
- `allow-forms` - Only if game submits forms (can often be removed)
- `allow="fullscreen"` - Only if fullscreen truly needed
- Remove `allow-same-origin` - Prevents iframe from accessing parent
- Remove other permissions - Not needed for typical game content

**Additional Security:**

```typescript
// Add origin validation before loading untrusted content
const validateGameUrl = (url: string) => {
  const allowedOrigins = [
    'http://localhost:22500', // Local game service
    // Add other trusted game content sources
  ];

  try {
    const gameUrl = new URL(url);
    if (!allowedOrigins.includes(gameUrl.origin)) {
      throw new Error('Untrusted game URL origin');
    }
  } catch (error) {
    console.error('Invalid game URL:', error);
    return false;
  }
  return true;
};

// Use before rendering iframe
if (!validateGameUrl(contentUrl)) {
  // Don't load game
}
```

**References:**
- OWASP: HTML5 Sandbox Attribute
- MDN: iframe sandbox
- CWE-95: Improper Neutralization of Directives in Dynamically Evaluated Code

---

### 4. UNSAFE RUFFLE SCRIPT LOADING AND innerHTML MANIPULATION

**Severity:** CRITICAL
**Category:** Code Injection / XSS
**Location:** `frontend/src/components/player/RufflePlayer.tsx` (lines 80-95, 146-150)

**Issue:**

The Ruffle player loads scripts dynamically without integrity checking and manipulates the DOM with innerHTML patterns:

```typescript
// VULNERABLE: No integrity check on script load
const script = document.createElement("script");
script.src = "/ruffle/ruffle.js";
document.head.appendChild(script);

// VULNERABLE: Using innerHTML indirectly via DOM manipulation
while (containerRef.current.firstChild) {
  containerRef.current.removeChild(containerRef.current.firstChild);
}
containerRef.current.appendChild(player);
```

**Specific Issues:**

1. **No Subresource Integrity (SRI)** - Script could be tampered with
2. **Script injection** - Dynamic script creation without validation
3. **Self-hosted script path** - `/ruffle/ruffle.js` not validated
4. **No Content-Security-Policy** - Scripts can be loaded from anywhere

**Impact:**

- Man-in-the-middle attacks can inject malicious Ruffle
- Compromised Ruffle library can steal tokens
- Can execute arbitrary JavaScript with full page access

**Proof of Concept (if Ruffle file served without integrity):**

```bash
# Attacker intercepts /ruffle/ruffle.js and injects:
# Steal all localStorage tokens
localStorage.getItem('flashpoint-auth')
# Inject keylogger
document.addEventListener('keydown', sendKeystroke)
```

**Remediation:**

1. Add Subresource Integrity (SRI) checks:

```typescript
// SECURE: Script loading with integrity
const scriptSrc = "/ruffle/ruffle.js";
const scriptIntegrity = "sha384-CALCULATED_HASH_HERE"; // Pre-calculated hash

const script = document.createElement("script");
script.src = scriptSrc;
script.integrity = scriptIntegrity;
script.crossOrigin = "anonymous";

await new Promise<void>((resolve, reject) => {
  script.onload = () => resolve();
  script.onerror = () => reject(new Error("Failed to load Ruffle"));
  document.head.appendChild(script);
});
```

2. Calculate SRI hash for Ruffle:

```bash
# On build, generate hash:
openssl dgst -sha384 -binary frontend/public/ruffle/ruffle.js | \
  openssl base64 -A

# Output: sha384-XXXXXXXXXXXXX
```

3. Store and verify in configuration:

```typescript
// ruffle-config.ts
export const RUFFLE_CONFIG = {
  src: "/ruffle/ruffle.js",
  integrity: "sha384-XXXXXXXXXXXXX", // Update on new Ruffle versions
  crossOrigin: "anonymous",
};

// Use in component
const script = document.createElement("script");
script.src = RUFFLE_CONFIG.src;
script.integrity = RUFFLE_CONFIG.integrity;
script.crossOrigin = RUFFLE_CONFIG.crossOrigin;
```

4. Strengthen CSP for Ruffle:

```html
<meta http-equiv="Content-Security-Policy" content="
  script-src 'self' /ruffle/ruffle.js 'sha384-INLINE_HASH';
">
```

**References:**
- OWASP: Subresource Integrity
- MDN: SRI (Subresource Integrity)
- CWE-95: Improper Code Injection Prevention

---

### 5. MISSING CSRF PROTECTION ON STATE-CHANGING REQUESTS

**Severity:** CRITICAL
**Category:** Cross-Site Request Forgery
**Location:** `frontend/src/lib/api.ts` - All POST/PUT/DELETE requests

**Issue:**

API requests lack CSRF token protection. While credentials are not automatically sent (axios doesn't include credentials by default), the API should still protect against CSRF:

```typescript
// Current: No CSRF token mechanism
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

**Issue Details:**

- No CSRF token generated or validated
- POST/PUT/DELETE requests could be forged via form submissions
- Even with JWT, CSRF attacks can modify state (if credentials auto-included)

**Impact:**

- Account takeover via CSRF
- Unauthorized state changes
- Malicious actions performed on user's behalf

**Proof of Concept:**

```html
<!-- Attacker's malicious page -->
<form action="http://localhost:3100/api/users/1" method="POST">
  <input name="email" value="attacker@evil.com">
</form>
<script>
  document.forms[0].submit(); // Auto-submit
</script>
```

**Remediation:**

1. Implement CSRF token handling in API client:

```typescript
// api-client.ts
let csrfToken: string | null = null;

// Fetch CSRF token on app startup
export async function initCsrfToken() {
  try {
    const response = await api.get('/auth/csrf-token');
    csrfToken = response.data.token;
    return csrfToken;
  } catch (error) {
    console.error('Failed to get CSRF token:', error);
  }
}

// Add CSRF token to all state-changing requests
api.interceptors.request.use((config) => {
  // Add authorization token
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Add CSRF token for state-changing operations
  const isStateChanging = ['post', 'put', 'patch', 'delete'].includes(
    config.method?.toLowerCase() || ''
  );

  if (isStateChanging && csrfToken) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }

  return config;
});
```

2. Backend should validate CSRF tokens:

```typescript
// Backend middleware
app.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const token = req.headers['x-csrf-token'];
    const sessionToken = req.session?.csrfToken;

    if (!token || token !== sessionToken) {
      return res.status(403).json({ error: 'CSRF token invalid' });
    }
  }
  next();
});
```

3. Initialize CSRF token in main.tsx:

```typescript
// main.tsx
async function initApp() {
  // Initialize CSRF token before rendering app
  await initCsrfToken();

  ReactDOM.createRoot(document.getElementById('root')!).render(
    // App...
  );
}

initApp();
```

**References:**
- OWASP: Cross-Site Request Forgery (CSRF)
- CWE-352: Cross-Site Request Forgery (CSRF)

---

## High Issues (Fix Before Production)

### 6. INSUFFICIENT INPUT VALIDATION IN AUTH FORMS

**Severity:** HIGH
**Category:** Input Validation
**Location:** `frontend/src/components/auth/LoginForm.tsx`, `frontend/src/components/auth/RegisterForm.tsx`

**Issue:**

While Zod validation is implemented, it's minimal and doesn't prevent all attacks:

```typescript
// MINIMAL: Only basic validation
const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

const registerSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be at most 50 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
});
```

**Issues:**

1. No regex validation for username (allows special chars that could be exploited)
2. No password complexity requirements
3. No max length on password
4. Email validation only checks format, not existence
5. No rate limiting on login attempts (client-side only)

**Impact:**

- Weak passwords accepted
- Account brute-forcing possible
- Username injection attacks

**Remediation:**

```typescript
// ENHANCED: Comprehensive validation
const loginSchema = z.object({
  username: z.string()
    .min(1, 'Username is required')
    .max(50, 'Username too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username contains invalid characters')
    .refine(val => !/^admin$/i.test(val), 'Reserved username'),
  password: z.string()
    .min(1, 'Password is required')
    .max(128, 'Password too long'),
});

const registerSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be at most 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores')
    .refine(val => !/admin|root|system/i.test(val), 'Username is reserved'),
  email: z.string()
    .email('Invalid email address')
    .max(254, 'Email too long')
    .toLowerCase(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/[A-Z]/, 'Password must contain uppercase letter')
    .regex(/[a-z]/, 'Password must contain lowercase letter')
    .regex(/[0-9]/, 'Password must contain number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain special character'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});
```

**Client-Side Rate Limiting:**

```typescript
// Add rate limiting to prevent brute force
import pRetry from 'p-retry';

const loginAttempts = new Map<string, Array<number>>();
const RATE_LIMIT = {
  attempts: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
};

function checkRateLimit(username: string): boolean {
  const now = Date.now();
  const attempts = loginAttempts.get(username) || [];

  // Remove old attempts outside window
  const recentAttempts = attempts.filter(time => now - time < RATE_LIMIT.windowMs);

  if (recentAttempts.length >= RATE_LIMIT.attempts) {
    return false;
  }

  recentAttempts.push(now);
  loginAttempts.set(username, recentAttempts);
  return true;
}

// In LoginForm:
const onSubmit = async (values: LoginFormValues) => {
  if (!checkRateLimit(values.username)) {
    setError('Too many login attempts. Please try again later.');
    return;
  }
  // Continue with login...
};
```

**References:**
- OWASP: Input Validation Cheat Sheet
- CWE-20: Improper Input Validation

---

### 7. SENSITIVE DATA IN ERROR MESSAGES AND LOGS

**Severity:** HIGH
**Category:** Sensitive Information Disclosure
**Location:** `frontend/src/lib/api.ts` (lines 546-600), `frontend/src/components/player/GamePlayer.tsx` (line 103)

**Issue:**

Error messages expose sensitive information:

```typescript
// VULNERABLE: Exposes detailed error info
setIframeError('Failed to load HTML5 game');

// Shows actual URLs in error (could leak internal structure)
<p className="text-sm text-muted-foreground text-left">
  <strong>URL:</strong> {contentUrl}
</p>

// In RufflePlayer:
console.error('[HTML5 Game] Load error:', e); // Console logs exposed in production
console.log("[Ruffle] Loading SWF:", swfUrl);
```

**Impact:**

- Information disclosure about system architecture
- Helps attackers understand application structure
- User confusion from technical errors
- Console logs in production can be captured

**Remediation:**

```typescript
// SECURE: Generic user-facing messages
const [iframeError, setIframeError] = useState<string | null>(null);

const onError = (e: Event) => {
  console.error('[HTML5 Game] Load error:', e); // Log to server, not shown to user

  // Show generic message to user
  setIframeError('Unable to load this game. Please try again later or contact support.');

  // Send detailed error to server for monitoring
  reportError({
    component: 'GamePlayer',
    type: 'IframeLoadError',
    url: contentUrl,
    error: e.toString(),
    timestamp: new Date().toISOString(),
  });
};

// SECURE: Don't expose URLs to users
{iframeError && (
  <div className="absolute inset-0 flex items-center justify-center bg-background/90 z-10">
    <div className="text-center max-w-md p-6">
      <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
      <h3 className="text-xl font-bold mb-2">Failed to Load Game</h3>
      <p className="mb-4">{iframeError}</p>
      <p className="text-sm text-muted-foreground">
        If this persists, please contact support with error ID: {errorId}
      </p>
    </div>
  </div>
)}
```

**Handle Console Logging in Production:**

```typescript
// logger.ts
const isDevelopment = import.meta.env.DEV;

export const logger = {
  log: (message: string, data?: any) => {
    if (isDevelopment) {
      console.log(message, data);
    }
  },
  error: (message: string, error?: any) => {
    // Always send errors to server
    reportError({ message, error });

    if (isDevelopment) {
      console.error(message, error);
    }
  },
};

// Use instead of console
logger.error('[HTML5 Game] Load error:', e);
```

**References:**
- OWASP: Sensitive Data Exposure
- CWE-209: Information Exposure Through an Error Message

---

### 8. POTENTIAL XSS IN GAME TITLE AND METADATA RENDERING

**Severity:** HIGH
**Category:** Cross-Site Scripting (XSS)
**Location:** `frontend/src/components/library/GameCard.tsx` (line 63)

**Issue:**

Game titles and metadata are rendered without sanitization:

```typescript
// POTENTIALLY VULNERABLE: Game data from API rendered without sanitization
<h3
  className="font-semibold text-sm truncate w-full"
  title={game.title}
>
  {game.title}
</h3>

// Other metadata uses:
<span className="truncate">{game.platformName}</span>
```

**Note:** React automatically escapes text content, so this is partially safe, but the `title` attribute could be exploited if API returns malicious HTML entities:

```javascript
// If API returns:
{
  title: "Game<img src=x onerror='alert(\"XSS\")'>"
}
// React escapes this, but title attribute might not
```

**Impact:**

- If API is compromised, XSS attacks possible
- Malicious titles could inject scripts

**Remediation:**

```typescript
// SECURE: Explicitly sanitize potentially dangerous content
import DOMPurify from 'dompurify';

const sanitizeGameTitle = (title: string): string => {
  return DOMPurify.sanitize(title, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: []
  });
};

// Use:
<h3
  className="font-semibold text-sm truncate w-full"
  title={sanitizeGameTitle(game.title)}
>
  {sanitizeGameTitle(game.title)}
</h3>

// Or create sanitization utility
export const createSafeText = (text: string): string => {
  // Replace any HTML-like content
  return String(text)
    .replace(/[<>"']/g, char => ({
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;'
    }[char] || char));
};
```

**Install DOMPurify:**

```bash
npm install dompurify
npm install --save-dev @types/dompurify
```

**References:**
- OWASP: Cross-Site Scripting (XSS)
- CWE-79: Improper Neutralization of Input During Web Page Generation

---

### 9. MISSING HTTPONLY AND SECURE FLAGS FOR TOKEN COOKIES

**Severity:** HIGH
**Category:** Broken Authentication
**Location:** Backend responsibility, but frontend should verify

**Issue:**

While using localStorage (not cookies) for tokens, the backend should be enforcing HTTP-only cookies instead. Frontend should verify:

```typescript
// Current approach (vulnerable):
// Tokens stored in localStorage
localStorage.setItem('flashpoint-auth', authData);

// Better approach (if backend implements):
// Backend sends Set-Cookie with HttpOnly flag
// Frontend cannot access it (automatic)
```

**What Frontend Should Check:**

When backend is fixed, ensure:

1. Backend sends cookies with `HttpOnly; Secure; SameSite=Strict`
2. Frontend **doesn't** try to read/store tokens in JavaScript
3. Cookies are automatically included in requests

**References:**
- OWASP: Authentication Cheat Sheet
- CWE-614: Sensitive Cookie in HTTPS Session Without 'Secure' Attribute

---

## Medium Issues (Fix When Possible)

### 10. UNPROTECTED GAME IMAGE AND LOGO LOADING

**Severity:** MEDIUM
**Category:** Content Injection
**Location:** `frontend/src/components/library/GameCard.tsx` (lines 62-75)

**Issue:**

Images are loaded from `/proxy/` endpoints without validation:

```typescript
const imagePath = game.logoPath || game.screenshotPath;
const imageUrl = imagePath ? `/proxy/images/${imagePath}` : null;

// Image loaded with minimal error handling
<img
  src={imageUrl}
  alt={game.title}
  onError={() => setImageError(true)}
  loading="lazy"
/>
```

**Potential Issues:**

1. No origin validation for image paths
2. Path traversal possible if backend doesn't validate
3. No image type validation
4. No file size checks

**Impact:**

- Malicious images could break layout
- Path traversal attacks
- Denial of service via large files

**Remediation:**

```typescript
// SECURE: Validate image paths
const validateImagePath = (path: string): boolean => {
  // No absolute URLs allowed
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return false;
  }

  // No path traversal
  if (path.includes('..') || path.startsWith('/')) {
    return false;
  }

  // Whitelist allowed extensions
  const allowed = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
  const ext = path.toLowerCase().substring(path.lastIndexOf('.'));
  if (!allowed.includes(ext)) {
    return false;
  }

  return true;
};

// Use in component:
const imagePath = game.logoPath || game.screenshotPath;
const imageUrl = imagePath && validateImagePath(imagePath)
  ? `/proxy/images/${imagePath}`
  : null;
```

**Add Image Size Limits:**

```typescript
<img
  src={imageUrl}
  alt={game.title}
  loading="lazy"
  onLoad={(e) => {
    // Check actual dimensions
    const img = e.target as HTMLImageElement;
    if (img.naturalWidth > 4096 || img.naturalHeight > 4096) {
      console.warn('Image dimensions too large');
      setImageError(true);
    } else {
      setImageLoaded(true);
    }
  }}
  onError={() => setImageError(true)}
  style={{ maxWidth: '100%', maxHeight: '100%' }}
/>
```

**References:**
- CWE-22: Improper Limitation of a Pathname to a Restricted Directory

---

### 11. INSUFFICIENT LOGGING AND MONITORING

**Severity:** MEDIUM
**Category:** Insufficient Logging & Monitoring
**Location:** Frontend lacks centralized error reporting

**Issue:**

Frontend errors are only logged to console, not sent to server:

```typescript
// CURRENT: Only console logging
console.error('Login error:', error);
console.log('[Ruffle] Loading SWF:', swfUrl);

// No monitoring of security events
```

**Impact:**

- Cannot detect attacks in progress
- Difficult to debug production issues
- Security events go unnoticed
- No audit trail

**Remediation:**

```typescript
// error-reporting.ts
interface SecurityEvent {
  type: 'auth.failed' | 'api.error' | 'xss.attempt' | 'csrf.failed' | 'api.unauthorized';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details?: any;
  timestamp: string;
  url: string;
  userAgent: string;
}

async function reportSecurityEvent(event: SecurityEvent) {
  try {
    // Send to monitoring backend (separate endpoint)
    await fetch('/api/monitoring/security-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...event,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent
      })
    });
  } catch (error) {
    console.error('Failed to report security event:', error);
  }
}

// Use in API error handler
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      reportSecurityEvent({
        type: 'auth.failed',
        severity: 'high',
        message: 'Unauthorized - possible token theft',
        details: { endpoint: error.config?.url }
      });
    }
    // ... other handling
  }
);

// Use in security checks
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (!token && isProtectedRoute()) {
    reportSecurityEvent({
      type: 'auth.failed',
      severity: 'high',
      message: 'Protected route accessed without token'
    });
  }
  return config;
});
```

**References:**
- OWASP: Logging Cheat Sheet
- CWE-778: Insufficient Logging

---

### 12. NO RATE LIMITING IN FRONTEND

**Severity:** MEDIUM
**Category:** Lack of Rate Limiting
**Location:** Frontend

**Issue:**

No client-side rate limiting on API requests:

```typescript
// VULNERABLE: User can spam API requests
const { data } = await api.post('/users', userData); // No rate limiting
```

**Impact:**

- Brute force attacks possible
- Denial of service
- API abuse

**Remediation:**

```typescript
// rate-limiter.ts
class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  isAllowed(key: string, limit: number = 10, windowMs: number = 60000): boolean {
    const now = Date.now();
    const timestamps = this.requests.get(key) || [];

    // Remove old requests outside window
    const recent = timestamps.filter(time => now - time < windowMs);

    if (recent.length >= limit) {
      return false;
    }

    recent.push(now);
    this.requests.set(key, recent);
    return true;
  }
}

const rateLimiter = new RateLimiter();

// Add to API interceptor
api.interceptors.request.use((config) => {
  const endpoint = config.url || '';
  const method = config.method || 'get';
  const key = `${method}:${endpoint}`;

  // Different limits for different endpoints
  const limits: Record<string, number> = {
    'post:/auth/login': 5,
    'post:/auth/register': 3,
    'post:/users': 10,
    'default': 30
  };

  const limit = limits[key] || limits['default'];

  if (!rateLimiter.isAllowed(key, limit)) {
    return Promise.reject(new Error('Rate limit exceeded'));
  }

  return config;
});
```

**References:**
- OWASP: Rate Limiting Cheat Sheet
- CWE-770: Allocation of Resources Without Limits

---

### 13. WEAK RUFFLE PLAYER CONFIGURATION

**Severity:** MEDIUM
**Category:** Configuration Issue
**Location:** `frontend/src/components/player/RufflePlayer.tsx` (lines 151-167)

**Issue:**

Ruffle player configuration allows unsafe settings:

```typescript
// CURRENT: Permissive configuration
player.config = {
  autoplay: "auto",
  backgroundColor: "#000000",
  letterbox: "on",
  unmuteOverlay: "visible", // Users can bypass audio restrictions
  contextMenu: true,         // Right-click menu enabled
  showSwfDownload: false,
  upgradeToHttps: window.location.protocol === "https:",
  warnOnUnsupportedContent: true,
  logLevel: "error",
  publicPath: "/ruffle/",
  scale: scaleMode,
  forceScale: true,
  quality: "high",
  allowScriptAccess: "sameDomain", // Allow cross-domain access
  salign: "",
  wmode: "opaque",
};
```

**Issues:**

1. `contextMenu: true` - Users can access Ruffle context menu
2. `allowScriptAccess: "sameDomain"` - Too permissive
3. `autoplay: "auto"` - Could play unmuted audio

**Impact:**

- Users can inspect/modify game
- Audio could play unexpectedly

**Remediation:**

```typescript
// SECURE: Restrictive configuration
player.config = {
  autoplay: "muted",              // Mute by default
  backgroundColor: "#000000",
  letterbox: "on",
  unmuteOverlay: "visible",
  contextMenu: false,             // Disable right-click
  showSwfDownload: false,
  upgradeToHttps: window.location.protocol === "https:",
  warnOnUnsupportedContent: true,
  logLevel: process.env.NODE_ENV === "development" ? "info" : "error",
  publicPath: "/ruffle/",
  scale: scaleMode,
  forceScale: true,
  quality: "medium",              // Lower quality = smaller attack surface
  allowScriptAccess: "none",      // No external script access
  salign: "TL",                   // Top-left align
  wmode: "opaque",
};
```

**References:**
- Ruffle Security Documentation
- CWE-16: Configuration

---

## Low Issues (Consider Fixing)

### 14. CONSOLE LOGGING IN PRODUCTION

**Severity:** LOW
**Category:** Information Disclosure
**Location:** Multiple files

**Issue:**

Console.log statements throughout the codebase:

```typescript
console.log('[GamePlayer] Loading ${platform} game:', {...});
console.log('[Ruffle] Loading SWF:', swfUrl);
console.debug('Failed to load theme settings after login:', error);
```

**Impact:**

- Sensitive information in browser console
- Helps attackers understand application flow
- Unnecessary performance impact

**Remediation:**

```typescript
// logger.ts
const isDev = import.meta.env.DEV;
const isDebugEnabled = isDev || localStorage.getItem('DEBUG') === 'true';

export const logger = {
  debug: (msg: string, data?: any) => {
    if (isDebugEnabled) console.log(`[DEBUG] ${msg}`, data);
  },
  info: (msg: string, data?: any) => {
    if (isDev) console.log(`[INFO] ${msg}`, data);
  },
  warn: (msg: string, data?: any) => {
    console.warn(`[WARN] ${msg}`, data);
  },
  error: (msg: string, error?: any) => {
    console.error(`[ERROR] ${msg}`, error);
    // Also report to server
    reportError({ message: msg, error });
  }
};

// Use throughout app
logger.debug('[GamePlayer] Loading game', { platform, title });
```

**References:**
- CWE-532: Insertion of Sensitive Information into Log File

---

### 15. MISSING DEPENDENCY SECURITY CHECKS

**Severity:** LOW
**Category:** Using Components with Known Vulnerabilities
**Location:** package.json dependencies

**Issue:**

No npm audit configured in CI/CD pipeline:

```json
// package.json scripts missing security checks
"scripts": {
  "dev": "vite",
  "build": "tsc && vite build",
  "lint": "eslint ...",
  // Missing: security audit
}
```

**Impact:**

- Vulnerable dependencies could be installed
- Security patches missed
- Compliance issues

**Remediation:**

```bash
# Add security audit
npm audit
npm audit fix

# In package.json
"scripts": {
  "security:audit": "npm audit",
  "security:audit:fix": "npm audit fix",
  "build": "npm run security:audit && tsc && vite build"
}
```

**Or use GitHub Dependabot:**

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/frontend"
    schedule:
      interval: "daily"
    pull-requests:
      auto-merge: false
    security-updates-only: false
```

**References:**
- CWE-1035: Using Components with Known Vulnerabilities

---

## Security Checklist

### Authentication & Authorization
- [ ] JWT tokens moved to HTTP-only cookies
- [ ] CSRF tokens implemented
- [ ] Password validation strengthened
- [ ] Rate limiting on login/register
- [ ] Session timeout enforced
- [ ] Auto-logout on token expiration

### API Security
- [ ] All endpoints require authentication (except public)
- [ ] Input validation on all parameters
- [ ] Rate limiting per user/endpoint
- [ ] Error messages sanitized
- [ ] Sensitive data not in logs
- [ ] API versioning implemented

### Frontend Security
- [ ] Content-Security-Policy meta tag added
- [ ] X-Frame-Options header enforced
- [ ] X-Content-Type-Options: nosniff
- [ ] Referrer-Policy configured
- [ ] Permissions-Policy enforced
- [ ] No hardcoded secrets
- [ ] All external scripts have SRI checksums

### XSS Prevention
- [ ] All user input sanitized
- [ ] HTML output escaped
- [ ] Iframe sandbox minimized
- [ ] No dangerouslySetInnerHTML used
- [ ] CSP script-src restricted
- [ ] DOM manipulation safe

### Data Security
- [ ] Sensitive data not in localStorage
- [ ] PII encrypted at rest
- [ ] HTTPS enforced
- [ ] Sensitive cookies HttpOnly
- [ ] No sensitive data in URLs
- [ ] Clipboard access restricted

### Dependency Security
- [ ] npm audit clean
- [ ] No known vulnerabilities
- [ ] Dependencies up to date
- [ ] Security patches applied
- [ ] Supply chain risks assessed

### Logging & Monitoring
- [ ] Security events logged
- [ ] Errors sent to monitoring
- [ ] Failed auth attempts tracked
- [ ] API errors monitored
- [ ] Performance monitored
- [ ] Alerts configured

---

## Implementation Priority

### Phase 1: CRITICAL (Week 1)
1. Move JWT tokens to HTTP-only cookies (backend change)
2. Add Content-Security-Policy header
3. Minimize iframe sandbox attributes
4. Add SRI to Ruffle script
5. Implement CSRF protection

### Phase 2: HIGH (Week 2-3)
6. Enhance input validation
7. Add security headers (X-Frame-Options, etc.)
8. Implement error sanitization
9. Add security event logging
10. Set up monitoring dashboard

### Phase 3: MEDIUM (Week 3-4)
11. Add DOMPurify for XSS prevention
12. Implement client-side rate limiting
13. Harden Ruffle player config
14. Add comprehensive logging

### Phase 4: LOW (Ongoing)
15. Remove console logging
16. Set up npm audit in CI/CD
17. Security training for developers
18. Regular security reviews

---

## Testing Recommendations

### Security Testing Tools to Add

```bash
# Install security testing tools
npm install --save-dev @securitytesting/eslint-plugin-security
npm install --save-dev npm-audit-ci-wrapper

# Add to scripts
"scripts": {
  "security:lint": "eslint . --plugin security",
  "security:audit": "npm audit --audit-level=moderate",
  "test:security": "npm run security:lint && npm run security:audit"
}
```

### Manual Testing Checklist

1. **XSS Testing**
   - Test game titles with `<script>alert('xss')</script>`
   - Test image paths with malicious URLs
   - Verify CSP blocks inline scripts

2. **CSRF Testing**
   - Attempt requests from different origin
   - Verify CSRF tokens are required

3. **Authentication Testing**
   - Verify tokens not in localStorage (after fix)
   - Test token expiration
   - Verify refresh token rotation

4. **Iframe Sandbox Testing**
   - Try to access parent window from game iframe
   - Verify game cannot modify parent DOM
   - Test clickjacking prevention

5. **Input Validation Testing**
   - Test with oversized payloads
   - Test with special characters
   - Test with unicode/emoji
   - Test with SQL injection payloads

---

## References

### OWASP Resources
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- [Content Security Policy Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
- [Cross-Site Request Forgery Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)

### CWE (Common Weakness Enumeration)
- [CWE-352: Cross-Site Request Forgery (CSRF)](https://cwe.mitre.org/data/definitions/352.html)
- [CWE-79: Improper Neutralization of Input During Web Page Generation](https://cwe.mitre.org/data/definitions/79.html)
- [CWE-613: Insufficient Session Expiration](https://cwe.mitre.org/data/definitions/613.html)
- [CWE-522: Insufficiently Protected Credentials](https://cwe.mitre.org/data/definitions/522.html)

### MDN Resources
- [Content-Security-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy)
- [Iframe Sandbox](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#attr-sandbox)
- [SRI (Subresource Integrity)](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity)

---

## Conclusion

The Flashpoint Web frontend contains several critical security vulnerabilities that **must be addressed before production deployment**. The most critical issues involve:

1. Insecure token storage (localStorage instead of HTTP-only cookies)
2. Missing security headers and Content Security Policy
3. Overly permissive iframe sandbox attributes
4. Unsafe Ruffle script loading without integrity checking

Implementing the recommended fixes from **Phase 1** should be prioritized immediately. These changes will significantly improve the security posture of the application and protect user data from common web vulnerabilities.

All changes should be reviewed by a security specialist before deployment, and comprehensive security testing should be performed across the application.

---

**Report Generated:** 2026-01-25
**Reviewer:** Security Analysis Agent
**Next Review:** After Phase 1 implementation (1 week)
