# External Dependencies Reference

This document provides a comprehensive reference for all external npm packages used across the Flashpoint Web monorepo, including their purposes, licenses, and alternatives considered.

## Table of Contents

- [Backend Dependencies](#backend-dependencies)
- [Frontend Dependencies](#frontend-dependencies)
- [Game Service Dependencies](#game-service-dependencies)
- [Shared Development Dependencies](#shared-development-dependencies)
- [License Summary](#license-summary)

---

## Backend Dependencies

### Production Dependencies

#### axios (^1.13.2)

**Purpose:** HTTP client for making external requests to CDN fallbacks and Flashpoint update servers.

**License:** MIT

**Usage:**
- External CDN fallback requests
- Flashpoint metadata update checks
- Community playlist synchronization

**Alternatives Considered:**
- `node-fetch` - Chose axios for better error handling and interceptors
- `got` - Chose axios for familiarity and community support

**Documentation:** https://axios-http.com/

---

#### bcrypt (^6.0.0)

**Purpose:** Password hashing library for secure password storage.

**License:** MIT

**Usage:**
- Hash passwords during user registration
- Verify passwords during login
- Cost factor: 10 (2^10 = 1024 rounds)

**Alternatives Considered:**
- `argon2` - More modern but requires native compilation
- `scrypt` - Chose bcrypt for better ecosystem support

**Security Notes:**
- Industry-standard password hashing
- Automatically salts passwords
- Resistant to rainbow table attacks

**Documentation:** https://github.com/kelektiv/node.bcrypt.js

---

#### better-sqlite3 (^12.6.0)

**Purpose:** Synchronous SQLite database driver for Node.js.

**License:** MIT

**Usage:**
- Database access for flashpoint.sqlite (read-only)
- Database access for user.db (read-write)
- Prepared statements for security
- Transactions for data consistency

**Alternatives Considered:**
- `sqlite3` (async) - Chose better-sqlite3 for better performance with synchronous operations
- `sql.js` - Chose better-sqlite3 for native performance

**Performance Benefits:**
- Faster than async wrappers for read-heavy workloads
- No callback/promise overhead
- Better suited for SQLite's architecture

**Documentation:** https://github.com/WiseLibs/better-sqlite3

---

#### cheerio (^1.1.2)

**Purpose:** Server-side HTML parsing and manipulation library (jQuery-like API).

**License:** MIT

**Usage:**
- Parse HTML responses from external CDN
- Extract metadata from game pages
- HTML polyfill injection for legacy games

**Alternatives Considered:**
- `jsdom` - Chose cheerio for lighter weight and faster parsing
- `node-html-parser` - Chose cheerio for jQuery-like API familiarity

**Documentation:** https://cheerio.js.org/

---

#### compression (^1.7.4)

**Purpose:** Express middleware for gzip/deflate compression of HTTP responses.

**License:** MIT

**Usage:**
- Compress API responses
- Reduce bandwidth usage
- Improve API performance

**Configuration:**
- Threshold: 1KB minimum
- Compression level: 6 (default)

**Documentation:** https://github.com/expressjs/compression

---

#### cors (^2.8.5)

**Purpose:** Express middleware for enabling Cross-Origin Resource Sharing.

**License:** MIT

**Usage:**
- Allow frontend origin to access backend API
- Configure allowed origins, methods, headers
- Enable credentials for cookie/auth support

**Configuration:**
```javascript
{
  origin: process.env.CORS_ORIGIN,
  credentials: true,
  optionsSuccessStatus: 200
}
```

**Documentation:** https://github.com/expressjs/cors

---

#### dotenv (^16.4.5)

**Purpose:** Load environment variables from .env files.

**License:** BSD-2-Clause

**Usage:**
- Load configuration from .env files
- Separate configuration from code
- Environment-specific settings

**Best Practices:**
- Never commit .env to version control
- Use .env.example as template
- Validate required variables at startup

**Documentation:** https://github.com/motdotla/dotenv

---

#### express (^4.18.3)

**Purpose:** Fast, unopinionated web framework for Node.js.

**License:** MIT

**Usage:**
- HTTP server and routing
- Middleware pipeline
- API endpoint handling
- Request/response processing

**Alternatives Considered:**
- `fastify` - Chose Express for ecosystem maturity
- `koa` - Chose Express for middleware compatibility
- `hapi` - Chose Express for simplicity

**Documentation:** https://expressjs.com/

---

#### express-rate-limit (^7.1.5)

**Purpose:** Rate limiting middleware for Express.

**License:** MIT

**Usage:**
- Prevent brute-force attacks on login endpoint
- API abuse prevention
- Fair resource allocation

**Configuration:**
- Login: 5 requests per 15 minutes per IP
- API: 100 requests per 15 minutes per IP

**Documentation:** https://github.com/express-rate-limit/express-rate-limit

---

#### helmet (^7.1.0)

**Purpose:** Security middleware setting various HTTP headers.

**License:** MIT

**Usage:**
- Set Content-Security-Policy headers
- Enable HSTS (HTTP Strict Transport Security)
- Prevent clickjacking with X-Frame-Options
- XSS protection headers

**Headers Set:**
- Content-Security-Policy
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- Strict-Transport-Security

**Documentation:** https://helmetjs.github.io/

---

#### http-proxy-middleware (^2.0.6)

**Purpose:** Proxy middleware for delegating requests to other servers.

**License:** MIT

**Usage:**
- Proxy game file requests to game-service
- Proxy legacy content requests
- Request transformation

**Configuration:**
- Target: Game-service URLs
- Path rewriting
- Error handling

**Documentation:** https://github.com/chimurai/http-proxy-middleware

---

#### jsonwebtoken (^9.0.3)

**Purpose:** JSON Web Token (JWT) implementation for authentication.

**License:** MIT

**Usage:**
- Generate access tokens
- Verify and decode tokens
- Token expiration handling

**Configuration:**
- Algorithm: HS256 (HMAC SHA-256)
- Expiration: 1 hour (default)
- Secret: Environment variable

**Security Notes:**
- Use strong secret (32+ characters)
- Validate signature on every request
- Check expiration before use

**Documentation:** https://github.com/auth0/node-jsonwebtoken

---

#### node-stream-zip (^1.15.0)

**Purpose:** Read ZIP files without extracting to disk.

**License:** MIT

**Usage:**
- Mount game ZIP archives
- Stream files from ZIPs
- List ZIP contents
- No extraction required

**Benefits:**
- No disk space for extraction
- Faster game loading
- Reduced I/O operations

**Documentation:** https://github.com/antelle/node-stream-zip

---

#### redis (^4.6.13)

**Purpose:** Redis client for caching and session storage (optional).

**License:** MIT

**Usage:**
- Cache game metadata queries
- Distributed rate limiting
- Session storage

**Note:** Currently optional, not required for basic operation.

**Documentation:** https://github.com/redis/node-redis

---

#### winston (^3.11.0)

**Purpose:** Logging library with multiple transports.

**License:** MIT

**Usage:**
- Application logging
- Error logging
- Access logs
- Multiple log levels (error, warn, info, debug)

**Configuration:**
- Console transport for development
- File transport for production
- Configurable log levels

**Documentation:** https://github.com/winstonjs/winston

---

#### zod (^3.22.4)

**Purpose:** TypeScript-first schema validation library.

**License:** MIT

**Usage:**
- API request validation
- Configuration validation
- Type-safe data parsing

**Benefits:**
- TypeScript integration
- Runtime validation
- Detailed error messages

**Alternatives Considered:**
- `joi` - Chose Zod for TypeScript-first approach
- `yup` - Chose Zod for better TypeScript support

**Documentation:** https://zod.dev/

---

### Development Dependencies

#### @types/* packages

**Purpose:** TypeScript type definitions for JavaScript libraries.

**License:** MIT

**Packages:**
- `@types/bcrypt`
- `@types/better-sqlite3`
- `@types/compression`
- `@types/cors`
- `@types/express`
- `@types/jsonwebtoken`
- `@types/node`

**Documentation:** https://github.com/DefinitelyTyped/DefinitelyTyped

---

#### @typescript-eslint/* (^7.1.1)

**Purpose:** TypeScript linting and parser for ESLint.

**License:** MIT

**Packages:**
- `@typescript-eslint/eslint-plugin` - TypeScript-specific rules
- `@typescript-eslint/parser` - TypeScript parser for ESLint

**Documentation:** https://typescript-eslint.io/

---

#### concurrently (^8.2.2)

**Purpose:** Run multiple npm scripts concurrently with colored output.

**License:** MIT

**Usage:**
- Start all services in development
- Colored output per service
- Process management

**Documentation:** https://github.com/open-cli-tools/concurrently

---

#### eslint (^8.57.0)

**Purpose:** JavaScript and TypeScript linting utility.

**License:** MIT

**Usage:**
- Enforce code quality rules
- Catch common errors
- Maintain code consistency

**Documentation:** https://eslint.org/

---

#### tsx (^4.7.1)

**Purpose:** TypeScript runner with watch mode.

**License:** MIT

**Usage:**
- Run TypeScript files without compilation
- Watch mode for development
- Fast esbuild-based compilation

**Documentation:** https://github.com/esbuild-kit/tsx

---

#### typescript (^5.4.2)

**Purpose:** TypeScript language and compiler.

**License:** Apache-2.0

**Usage:**
- Type checking
- Transpilation to JavaScript
- IDE integration

**Configuration:** `tsconfig.json`

**Documentation:** https://www.typescriptlang.org/

---

#### vitest (^1.3.1)

**Purpose:** Fast unit test framework powered by Vite.

**License:** MIT

**Usage:**
- Unit testing
- Integration testing
- Test coverage

**Features:**
- Vite-powered
- Jest-compatible API
- TypeScript support

**Documentation:** https://vitest.dev/

---

## Frontend Dependencies

### Production Dependencies

#### @hookform/resolvers (^5.2.2)

**Purpose:** Validation resolvers for React Hook Form.

**License:** MIT

**Usage:**
- Zod validation integration
- Form schema validation
- Type-safe form validation

**Documentation:** https://github.com/react-hook-form/resolvers

---

#### @radix-ui/react-* (various versions)

**Purpose:** Unstyled, accessible UI component primitives.

**License:** MIT

**Components:**
- `react-alert-dialog` - Modal dialogs
- `react-avatar` - User avatars
- `react-checkbox` - Checkboxes
- `react-dialog` - Dialogs
- `react-dropdown-menu` - Dropdown menus
- `react-label` - Form labels
- `react-popover` - Popovers
- `react-scroll-area` - Custom scrollbars
- `react-select` - Select inputs
- `react-separator` - Visual separators
- `react-slot` - Component composition
- `react-switch` - Toggle switches
- `react-toast` - Toast notifications
- `react-toggle` - Toggle buttons
- `react-tooltip` - Tooltips

**Benefits:**
- Full keyboard navigation
- Screen reader support
- Focus management
- Unstyled (style with Tailwind)

**Documentation:** https://www.radix-ui.com/

---

#### @ruffle-rs/ruffle (^0.2.0-nightly.2026.1.9)

**Purpose:** Flash Player emulator compiled to WebAssembly.

**License:** MIT / Apache-2.0 (dual license)

**Usage:**
- Play Flash (SWF) games in browser
- No plugin required
- WebAssembly-based emulation

**Integration:**
- Files copied to `public/ruffle/` on install
- Loaded dynamically in GamePlayer component
- Supports ActionScript 1, 2, and partial 3

**Documentation:** https://ruffle.rs/

---

#### @tanstack/react-query (^5.28.9)

**Purpose:** Data synchronization and caching library.

**License:** MIT

**Usage:**
- Fetch and cache game data
- Automatic background refetching
- Optimistic updates
- Pagination support

**Configuration:**
- Stale time: 5 minutes
- Cache time: 10 minutes
- Retry: 3 attempts

**Alternatives Considered:**
- `swr` - Chose React Query for more features
- `rtk-query` - Chose React Query for flexibility

**Documentation:** https://tanstack.com/query/latest

---

#### @tanstack/react-table (^8.21.3)

**Purpose:** Headless table library for building data tables.

**License:** MIT

**Usage:**
- Game list tables
- User management tables
- Sorting and filtering
- Pagination

**Documentation:** https://tanstack.com/table/latest

---

#### @tanstack/react-virtual (^3.2.0)

**Purpose:** Headless virtualization library for large lists.

**License:** MIT

**Usage:**
- Virtualize game lists
- Handle thousands of games efficiently
- Smooth scrolling performance

**Benefits:**
- Constant rendering time
- Reduced memory usage
- Dynamic row heights

**Documentation:** https://tanstack.com/virtual/latest

---

#### axios (^1.6.8)

**Purpose:** HTTP client for API requests.

**License:** MIT

**Usage:**
- API requests to backend
- Request/response interceptors
- Automatic token refresh
- Error handling

**Configuration:**
- Base URL: `/api`
- Timeout: 30 seconds
- Auth token injection

**Documentation:** https://axios-http.com/

---

#### class-variance-authority (^0.7.1)

**Purpose:** Utility for creating component variant styles.

**License:** MIT

**Usage:**
- Define component variants
- Conditional class names
- Type-safe variant props

**Example:**
```typescript
const button = cva('btn', {
  variants: {
    size: { sm: 'text-sm', lg: 'text-lg' },
    color: { primary: 'bg-blue', secondary: 'bg-gray' }
  }
});
```

**Documentation:** https://cva.style/docs

---

#### clsx (^2.1.0)

**Purpose:** Utility for constructing className strings conditionally.

**License:** MIT

**Usage:**
- Conditional class names
- Merge class strings
- Clean syntax

**Example:**
```typescript
clsx('btn', { 'btn-active': isActive }, className)
```

**Documentation:** https://github.com/lukeed/clsx

---

#### cmdk (^1.1.1)

**Purpose:** Command palette component (Command+K interface).

**License:** MIT

**Usage:**
- Search games with keyboard shortcuts
- Navigation shortcuts
- Accessible command menu

**Documentation:** https://cmdk.paco.me/

---

#### date-fns (^3.6.0)

**Purpose:** Modern JavaScript date utility library.

**License:** MIT

**Usage:**
- Format timestamps
- Calculate durations
- Parse dates
- Relative time formatting

**Alternatives Considered:**
- `moment` - Chose date-fns for tree-shaking and smaller size
- `dayjs` - Chose date-fns for better TypeScript support

**Documentation:** https://date-fns.org/

---

#### lucide-react (^0.358.0)

**Purpose:** Icon library for React.

**License:** ISC

**Usage:**
- UI icons throughout application
- Consistent icon system
- Fully customizable

**Benefits:**
- Tree-shakeable
- TypeScript support
- Large icon collection

**Documentation:** https://lucide.dev/

---

#### next-themes (^0.4.6)

**Purpose:** Theme management for Next.js and React apps.

**License:** MIT

**Usage:**
- Dark/light mode support
- System theme detection
- Theme persistence
- No flash on load

**Note:** Despite the name, works with any React app, not just Next.js.

**Documentation:** https://github.com/pacocoursey/next-themes

---

#### react (^18.3.1)

**Purpose:** JavaScript library for building user interfaces.

**License:** MIT

**Usage:**
- Component-based UI development
- Virtual DOM for performance
- Hooks for state management

**Documentation:** https://react.dev/

---

#### react-dom (^18.3.1)

**Purpose:** React package for working with the DOM.

**License:** MIT

**Usage:**
- Render React components to DOM
- Event system
- Portal support

**Documentation:** https://react.dev/

---

#### react-hook-form (^7.71.1)

**Purpose:** Performant form library for React.

**License:** MIT

**Usage:**
- Login/registration forms
- Settings forms
- Form validation
- Integration with Zod

**Benefits:**
- Minimal re-renders
- Easy validation
- TypeScript support

**Alternatives Considered:**
- `formik` - Chose React Hook Form for better performance

**Documentation:** https://react-hook-form.com/

---

#### react-router-dom (^6.22.3)

**Purpose:** Declarative routing for React applications.

**License:** MIT

**Usage:**
- Client-side routing
- URL state management
- Nested routes
- Route protection

**Features:**
- Data loading
- Code splitting
- Navigation guards

**Documentation:** https://reactrouter.com/

---

#### recharts (^3.6.0)

**Purpose:** Composable charting library built on React components.

**License:** MIT

**Usage:**
- Play statistics charts
- Activity graphs
- Platform distribution charts

**Chart Types:**
- Line charts for activity over time
- Bar charts for comparisons
- Pie charts for distributions

**Documentation:** https://recharts.org/

---

#### sonner (^2.0.7)

**Purpose:** Opinionated toast notification library for React.

**License:** MIT

**Usage:**
- Success/error notifications
- Loading states
- Action toasts
- Accessible notifications

**Features:**
- Beautiful defaults
- Keyboard dismissal
- Promise-based API

**Documentation:** https://sonner.emilkowal.ski/

---

#### tailwind-merge (^3.4.0)

**Purpose:** Utility for merging Tailwind CSS classes without conflicts.

**License:** MIT

**Usage:**
- Merge component class names
- Resolve Tailwind conflicts
- Clean className composition

**Example:**
```typescript
twMerge('p-4 text-red-500', 'p-2') // => 'p-2 text-red-500'
```

**Documentation:** https://github.com/dcastil/tailwind-merge

---

#### tailwindcss-animate (^1.0.7)

**Purpose:** Tailwind CSS plugin for animations.

**License:** MIT

**Usage:**
- Pre-built animation utilities
- Keyframe animations
- Transition utilities

**Animations:**
- Fade in/out
- Slide in/out
- Scale
- Spin

**Documentation:** https://github.com/jamiebuilds/tailwindcss-animate

---

#### zod (^4.3.5)

**Purpose:** TypeScript-first schema validation.

**License:** MIT

**Usage:**
- Form validation
- API response validation
- Type-safe data parsing

**Documentation:** https://zod.dev/

---

#### zustand (^4.5.2)

**Purpose:** Small, fast state management library.

**License:** MIT

**Usage:**
- Authentication state
- Theme preferences
- UI state (sidebar, view mode)

**Benefits:**
- No boilerplate
- Direct state mutation
- Built-in persistence
- TypeScript support

**Alternatives Considered:**
- `redux` - Chose Zustand for simplicity
- `jotai` - Chose Zustand for familiarity

**Documentation:** https://zustand-demo.pmnd.rs/

---

### Frontend Development Dependencies

#### @types/react (^18.2.66)

**Purpose:** TypeScript type definitions for React.

**License:** MIT

**Documentation:** https://github.com/DefinitelyTyped/DefinitelyTyped

---

#### @types/react-dom (^18.2.22)

**Purpose:** TypeScript type definitions for React DOM.

**License:** MIT

**Documentation:** https://github.com/DefinitelyTyped/DefinitelyTyped

---

#### @vitejs/plugin-react (^4.2.1)

**Purpose:** Official Vite plugin for React.

**License:** MIT

**Usage:**
- React Fast Refresh
- JSX transformation
- React DevTools support

**Documentation:** https://github.com/vitejs/vite-plugin-react

---

#### autoprefixer (^10.4.19)

**Purpose:** PostCSS plugin to add vendor prefixes automatically.

**License:** MIT

**Usage:**
- Automatic CSS vendor prefixes
- Browser compatibility
- Works with Tailwind CSS

**Documentation:** https://github.com/postcss/autoprefixer

---

#### postcss (^8.4.38)

**Purpose:** Tool for transforming CSS with JavaScript plugins.

**License:** MIT

**Usage:**
- Tailwind CSS processing
- Autoprefixer
- CSS optimization

**Documentation:** https://postcss.org/

---

#### shx (^0.3.4)

**Purpose:** Cross-platform shell commands for npm scripts.

**License:** MIT

**Usage:**
- Copy Ruffle files to public/
- Cross-platform file operations
- npm script compatibility

**Commands Used:**
- `mkdir -p` - Create directories
- `cp -r` - Copy files recursively

**Documentation:** https://github.com/shelljs/shx

---

#### tailwindcss (^3.4.1)

**Purpose:** Utility-first CSS framework.

**License:** MIT

**Usage:**
- Styling system
- Responsive design
- Dark mode
- Custom theme

**Configuration:** `tailwind.config.js`

**Documentation:** https://tailwindcss.com/

---

#### typescript (^5.4.2)

**Purpose:** TypeScript language and compiler.

**License:** Apache-2.0

**Usage:**
- Type checking
- Transpilation
- IDE integration

**Documentation:** https://www.typescriptlang.org/

---

#### vite (^5.2.0)

**Purpose:** Next-generation frontend build tool.

**License:** MIT

**Usage:**
- Development server with HMR
- Production builds
- Code splitting
- Asset optimization

**Benefits:**
- Instant server start
- Lightning-fast HMR
- Optimized builds
- Plugin ecosystem

**Alternatives Considered:**
- `webpack` - Chose Vite for speed
- `parcel` - Chose Vite for better control

**Documentation:** https://vitejs.dev/

---

#### vite-plugin-static-copy (^3.1.4)

**Purpose:** Vite plugin for copying static assets to build output.

**License:** MIT

**Usage:**
- Copy Ruffle files to dist/
- Copy public assets
- Build-time file copying

**Documentation:** https://github.com/sapphi-red/vite-plugin-static-copy

---

## Game Service Dependencies

### Production Dependencies

#### axios (^1.6.8)

**Purpose:** HTTP client for CDN fallback requests.

**License:** MIT

**Usage:**
- Fetch files from external CDN
- Cache downloaded content
- Error handling

**Documentation:** https://axios-http.com/

---

#### cors (^2.8.5)

**Purpose:** Enable CORS for cross-domain game content.

**License:** MIT

**Usage:**
- Allow all origins (required for game content)
- Enable CORS headers
- Preflight request handling

**Documentation:** https://github.com/expressjs/cors

---

#### dotenv (^16.4.5)

**Purpose:** Load environment variables.

**License:** BSD-2-Clause

**Usage:**
- Configuration management
- Environment-specific settings

**Documentation:** https://github.com/motdotla/dotenv

---

#### express (^4.18.3)

**Purpose:** Web framework for HTTP servers.

**License:** MIT

**Usage:**
- Proxy server (port 22500)
- GameZip server (port 22501)
- Middleware pipeline
- Request routing

**Documentation:** https://expressjs.com/

---

#### node-stream-zip (^1.15.0)

**Purpose:** Stream files from ZIP archives without extraction.

**License:** MIT

**Usage:**
- Mount game ZIP archives
- Stream individual files
- List ZIP contents
- No disk extraction required

**Benefits:**
- Instant access to ZIP contents
- No disk space for extraction
- Reduced I/O operations

**Documentation:** https://github.com/antelle/node-stream-zip

---

#### winston (^3.11.0)

**Purpose:** Logging library.

**License:** MIT

**Usage:**
- Request logging
- Error logging
- Debug logging
- Configurable log levels

**Documentation:** https://github.com/winstonjs/winston

---

### Game Service Development Dependencies

#### @types/cors (^2.8.17)

**Purpose:** TypeScript definitions for cors.

**License:** MIT

**Documentation:** https://github.com/DefinitelyTyped/DefinitelyTyped

---

#### @types/express (^4.17.21)

**Purpose:** TypeScript definitions for Express.

**License:** MIT

**Documentation:** https://github.com/DefinitelyTyped/DefinitelyTyped

---

#### @types/node (^20.11.19)

**Purpose:** TypeScript definitions for Node.js.

**License:** MIT

**Documentation:** https://github.com/DefinitelyTyped/DefinitelyTyped

---

#### tsx (^4.7.1)

**Purpose:** TypeScript runner for development.

**License:** MIT

**Usage:**
- Development server with watch mode
- Fast compilation

**Documentation:** https://github.com/esbuild-kit/tsx

---

#### typescript (^5.3.3)

**Purpose:** TypeScript compiler.

**License:** Apache-2.0

**Usage:**
- Type checking
- Compilation to JavaScript

**Documentation:** https://www.typescriptlang.org/

---

## Shared Development Dependencies

### Root-Level Dependencies

These dependencies are used for managing the monorepo and running all services.

#### concurrently (^8.2.2)

**Purpose:** Run multiple services concurrently.

**License:** MIT

**Usage:**
- Start all services in development
- Colored output per service

**Documentation:** https://github.com/open-cli-tools/concurrently

---

## License Summary

### License Distribution

| License | Count | Packages |
|---------|-------|----------|
| MIT | ~95% | Most packages |
| Apache-2.0 | ~3% | TypeScript, some Ruffle components |
| ISC | ~1% | lucide-react |
| BSD-2-Clause | ~1% | dotenv |

### License Compatibility

All dependencies use permissive open-source licenses compatible with commercial and private use:

- **MIT:** Permissive, allows commercial use, modification, distribution
- **Apache-2.0:** Permissive, includes patent grant
- **ISC:** Permissive, similar to MIT
- **BSD-2-Clause:** Permissive, requires attribution

**No copyleft licenses (GPL, LGPL, AGPL) are used**, ensuring maximum flexibility for deployment and modification.

---

## Dependency Management Best Practices

### Version Pinning

- **Production:** Use caret ranges (^) for automatic minor/patch updates
- **Critical:** Pin exact versions for security-sensitive packages (bcrypt, jsonwebtoken)
- **Review:** Regularly review and update dependencies

### Security Audits

Run security audits regularly:

```bash
# Check for vulnerabilities
npm audit

# Fix automatically (careful with breaking changes)
npm audit fix

# Update dependencies
npm update
```

### Bundle Size Monitoring

Monitor frontend bundle size:

```bash
# Analyze bundle
npm run build -- --analyze

# Check bundle size
ls -lh frontend/dist/assets/*.js
```

**Target:** Keep main bundle under 500KB gzipped.

---

## Alternative Considerations

### Considered but Not Used

#### State Management

- **Redux Toolkit:** Too much boilerplate for project size
- **MobX:** Less TypeScript-friendly than Zustand
- **Recoil:** Still experimental, less mature ecosystem

#### UI Components

- **Material-UI:** Too opinionated, larger bundle size
- **Ant Design:** Less customizable than Radix + Tailwind
- **Chakra UI:** Chose Tailwind for more control

#### Database

- **PostgreSQL:** Overkill for project scale, requires separate server
- **MySQL:** Same as PostgreSQL
- **MongoDB:** Not suitable for relational data structure

#### ORM/Query Builder

- **Prisma:** Adds complexity, better-sqlite3 is sufficient
- **TypeORM:** Too heavy for SQLite use case
- **Knex.js:** Unnecessary for prepared statement approach

---

## Updating Dependencies

### Update Process

1. **Check for updates:**
   ```bash
   npm outdated
   ```

2. **Review changelogs** for breaking changes

3. **Update one service at a time:**
   ```bash
   cd backend
   npm update
   npm test
   ```

4. **Test thoroughly** before updating other services

5. **Commit updates** with clear messages:
   ```bash
   git commit -m "chore(backend): update dependencies"
   ```

### Major Version Updates

For major version updates:

1. Read migration guide
2. Update TypeScript types
3. Fix breaking changes
4. Run full test suite
5. Test in production-like environment

---

## Related Documentation

- [Database Schema Reference](./database-schema-reference.md)
- [Type Definitions](./type-definitions.md)
- [Glossary](./glossary.md)
- [Development Setup](../08-development/setup-guide.md)
