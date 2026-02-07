# Glossary

Technical terms and project-specific terminology used throughout Flashpoint Web.

## Project-Specific Terms

**Flashpoint** - Community-driven preservation project for web games and
animations. Primarily Flash content.

**Flashpoint Launcher** - Official desktop application for browsing and playing
Flashpoint content. Manages flashpoint.sqlite database.

**Flashpoint Database** - Read-only SQLite database (flashpoint.sqlite)
containing all game metadata. Located at D:/Flashpoint/Data/flashpoint.sqlite.

**htdocs** - Directory containing legacy web content and assets for Flash games.
Located at D:/Flashpoint/Legacy/htdocs.

**Library** - Top-level categorization: "arcade" (games) or "theatre"
(animations).

**Game Data** - Individual game file entries in game_data table. A single game
may have multiple entries.

**Present on Disk** - Status indicator: NULL (no data needed), 0 (needs
download), 1 (downloaded).

**Archive State** - Game's archival status within Flashpoint (fully preserved vs
partially documented).

**Order Title** - Normalized, lowercase game title for sorting (e.g., "legend of
zelda").

**Curation** - Community process of adding, verifying, and preserving games in
Flashpoint Archive.

## Technical Terms

**JWT (JSON Web Token)** - Compact token format for authentication. Contains
header, payload (user claims), and HMAC SHA-256 signature. Access tokens: 1
hour; Refresh tokens: 7 days.

**RBAC (Role-Based Access Control)** - Authorization model where permissions are
assigned to roles, users inherit role permissions.

**CORS (Cross-Origin Resource Sharing)** - Browser security mechanism. Backend
API restricts to configured origins; game content routes on backend allow all
origins for public game embedding.

**bcrypt** - Password hashing function based on Blowfish cipher. Cost factor 10
(2^10 = 1024 rounds). Automatically salts and one-way hashes.

**SQLite** - Serverless SQL database. Flashpoint Web uses two: flashpoint.sqlite
(read-only) and user.db (read-write). No separate server required.

**Hot-Reload** - Automatic reloading when database files change. DatabaseService
uses fs.watchFile() to detect changes from Flashpoint Launcher.

**Middleware** - Functions executing during request-response cycle with access
to request, response, and next function.

**Prepared Statements** - Parameterized SQL queries separating structure from
data values, preventing SQL injection.

**Proxy Server** - Intermediate server forwarding requests with optional
modification. Backend game module proxies game content to CDN fallback.

**MIME Type** - File format identifier for HTTP Content-Type headers (e.g.,
application/x-shockwave-flash for SWF).

**Rate Limiting** - Request frequency control to prevent abuse. Login: 5/15min,
API: 100/15min.

**Singleton** - Design pattern ensuring only one class instance exists globally.

## Architecture Terms

**Monorepo** - Single repository for multiple projects: backend (Express with
integrated game module), frontend (React).

**Service Layer Pattern** - Separating business logic into dedicated services,
decoupling from HTTP routes.

**Separation of Concerns** - Backend API (metadata/auth) and game module (file
serving), frontend (UI).

**API Gateway** - Entry point routing requests and aggregating responses.
Backend routes game file requests to integrated game module.

**File Watching** - Monitoring filesystem events to trigger actions.
DatabaseService watches flashpoint.sqlite for changes.

**State Management** - Managing application data over time. Frontend: Zustand
(client), React Query (server), React Router (URL).

**Lazy Loading** - Deferring initialization until needed. React Router
lazy-loads route components.

**Code Splitting** - Dividing code into smaller bundles loaded on demand.
Route-based splitting via React.lazy and dynamic imports.

## Database Terms

**Migration** - Versioned database schema changes (backend/src/migrations/).
Format: 00X_description.sql. Always idempotent.

**Foreign Key** - Database constraint linking tables for referential integrity.
Can cascade delete, set NULL, or restrict.

**Index** - Sorted column copy improving query performance. Trade-off: faster
reads vs slower writes.

**Transaction** - Multi-operation unit treated atomically (all or nothing). ACID
compliant: Atomicity, Consistency, Isolation, Durability.

**Schema** - Database structure: tables, columns, data types, constraints,
relationships.

**Normalization** - Organizing schema to reduce redundancy (1NF, 2NF, 3NF
forms).

**Denormalization** - Intentional redundancy for read performance. Example:
game.tagsStr denormalizes tags for faster search.

**Collation** - String comparison and sorting rules. BINARY (case-sensitive),
NOCASE (case-insensitive), RTRIM.

## Authentication & Authorization

**Access Token** - Short-lived JWT (1 hour). Sent in Authorization: Bearer
header for API requests.

**Refresh Token** - Long-lived random hex string (7 days). Used to obtain new
access tokens without re-authentication.

**Permission** - Atomic access right (format: resource.action, e.g., games.play,
users.create).

**Guest Mode** - Limited access without authentication. Can browse and play but
cannot create playlists.

**Session** - User interaction period tracked by JWT validity. Auth session: JWT
lifetime; Play session: individual game session.

## Frontend Terms

**SPA (Single-Page Application)** - Web app loading single HTML page with
dynamic content updates. Client-side routing, no full reloads.

**HMR (Hot Module Replacement)** - Development feature updating modules in
browser without full reload, preserving state.

**React Query** - Server state library handling caching, revalidation,
background updates. Stale-while-revalidate pattern.

**Zustand** - Minimalist client state library. Stores: useAuthStore,
useThemeStore, useUIStore.

**Tailwind CSS** - Utility-first CSS framework with responsive design, dark
mode, custom theme.

**Radix UI** - Unstyled accessible component primitives (dialogs, dropdowns,
selects). Keyboard navigation, screen reader support.

**shadcn/ui** - Reusable components built from Radix UI and Tailwind CSS.
Components copied into project, not installed.

**Virtualization** - Rendering only visible list items for performance. TanStack
Virtual handles thousands of items.

## Game & Emulation Terms

**Flash** - Multimedia platform (1996-2020). Played via Ruffle emulator in
browser. File format: SWF.

**Ruffle** - Flash Player emulator in Rust, compiled to WebAssembly. Supports
ActionScript 1, 2, partial 3.

**SWF (Shockwave Flash)** - Flash file format. Vector graphics, embedded
ActionScript, timeline animation. MIME: application/x-shockwave-flash.

**ActionScript** - Programming language for Flash. Versions: 1 (basic), 2 (OOP),
3 (performance/modern OOP).

**Shockwave** - Predecessor to Flash by Adobe/Macromedia. File format: DCR. Not
currently supported in Flashpoint Web.

**HTML5 Games** - Games using standard web tech (HTML, CSS, JavaScript). Canvas,
Web Audio, WebGL APIs.

**ZIP Mounting** - Serving files directly from ZIP archives without extraction.
Saves disk space, reduces I/O.

**Scale Mode** - Game content fitting into viewport: showall (letterbox),
noborder (crop), exactfit (distort), noscale (original).

**Polyfill** - Code implementing browser features not natively supported.
Injects compatibility layers into legacy games.

## Development Terms

**TypeScript** - Typed superset of JavaScript. Compile-time type checking,
better IDE support, self-documenting code.

**tsx** - Node.js TypeScript runner. No separate build step, watch mode for
development.

**Vite** - Modern frontend build tool. Instant server start, lightning-fast HMR,
optimized production builds.

**ESLint** - Linting utility enforcing code quality and style rules across
services.

**Docker** - Container platform. docker-compose orchestrates all three services
for production.

**Environment Variables** - Configuration outside code. Each service has .env
file loaded via dotenv.

**ACID** - Database transaction properties: Atomicity (all/nothing), Consistency
(valid state), Isolation (no interference), Durability (persists).

**REST** - Architectural style using HTTP methods (GET, POST, PUT, DELETE) on
resource-based URLs with JSON representation.

## Related Documentation

- [Type Definitions](./type-definitions.md)
- [Database Schema](./database-schema-reference.md)
- [External Dependencies](./external-dependencies.md)
- [API Reference](../06-api-reference/README.md)
