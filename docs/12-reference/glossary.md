# Glossary

This document defines technical terms, project-specific terminology, and architectural concepts used throughout the Flashpoint Web application.

## Table of Contents

- [Project-Specific Terms](#project-specific-terms)
- [Technical Terms](#technical-terms)
- [Architecture Terms](#architecture-terms)
- [Database Terms](#database-terms)
- [Authentication & Authorization](#authentication--authorization)
- [Frontend Terms](#frontend-terms)
- [Game & Emulation Terms](#game--emulation-terms)
- [Development Terms](#development-terms)

---

## Project-Specific Terms

### Flashpoint

**Definition:** The Flashpoint Archive is a community-driven preservation project for web games and animations, primarily Flash content that is no longer accessible due to Adobe Flash Player's end-of-life.

**Usage:** "Flashpoint contains over 100,000 games and animations preserved from the early web era."

**Reference:** https://flashpointarchive.org/

---

### Flashpoint Launcher

**Definition:** The official desktop application for browsing and playing content from the Flashpoint Archive. It manages the flashpoint.sqlite database and game files.

**Usage:** "The Flashpoint Launcher updates the game database automatically when new content is added."

**Repository:** D:\Repositories\Community\launcher

---

### Flashpoint Database

**Definition:** The read-only SQLite database (`flashpoint.sqlite`) containing metadata for all games and animations in the Flashpoint Archive.

**Usage:** "The backend watches the Flashpoint database for changes and hot-reloads connections when updates occur."

**Location:** `D:/Flashpoint/Data/flashpoint.sqlite`

**See Also:** [Database Schema Reference](./database-schema-reference.md)

---

### htdocs

**Definition:** Directory containing legacy web content and assets required for serving Flash games. Mirrors the structure of historical web servers.

**Usage:** "The game-service proxy server serves files from htdocs when games request historical web resources."

**Location:** `D:/Flashpoint/Legacy/htdocs`

---

### Library

**Definition:** Top-level categorization of Flashpoint content. Main libraries include "arcade" (games) and "theatre" (animations).

**Usage:** "Filter games by library to separate playable games from animations."

**Values:**
- `arcade` - Playable games
- `theatre` - Animations (non-interactive)

---

### Game Data

**Definition:** The actual game files, assets, and launch information stored in the `game_data` table. A single game may have multiple data entries.

**Usage:** "When launching a game, the backend selects the game_data entry with presentOnDisk = 1."

**See Also:** game_data table in [Database Schema Reference](./database-schema-reference.md)

---

### Present on Disk

**Definition:** Status indicator for whether game files are downloaded locally. Values: NULL (no data needed), 0 (needs download), 1 (downloaded).

**Usage:** "Games with presentOnDisk = 1 can be played immediately without downloading."

---

### Archive State

**Definition:** Indicator of the game's archival status within Flashpoint, related to content availability and preservation state.

**Usage:** "Archive state helps identify which games are fully preserved versus partially documented."

---

### Order Title

**Definition:** Normalized version of a game's title used for alphabetical sorting, typically lowercase and stripped of leading articles ("The", "A").

**Usage:** "Games are sorted alphabetically using orderTitle to ensure consistent ordering."

**Example:** "The Legend of Zelda" → "legend of zelda"

---

### Curation

**Definition:** The process of adding, verifying, and preserving games for inclusion in the Flashpoint Archive. Community members create curations containing game metadata and files.

**Usage:** "Each game in Flashpoint has gone through the curation process to ensure quality and accuracy."

---

## Technical Terms

### JWT (JSON Web Token)

**Definition:** A compact, URL-safe token format used for securely transmitting authentication claims between parties. Contains a header, payload, and signature.

**Usage:** "The backend generates a JWT access token upon successful login."

**Components:**
- Header: Token type and signing algorithm
- Payload: User claims (userId, username, role)
- Signature: HMAC SHA-256 signature for verification

**Token Types:**
- **Access Token:** Short-lived (default 1 hour) JWT for API authentication
- **Refresh Token:** Long-lived (default 7 days) random string for obtaining new access tokens

**See Also:** [JWT.io](https://jwt.io/)

---

### RBAC (Role-Based Access Control)

**Definition:** Authorization model where permissions are assigned to roles, and users are assigned roles. Enables granular access control without managing permissions per user.

**Usage:** "RBAC allows administrators to control feature access by assigning users to roles."

**Hierarchy:**
- **Permissions:** Atomic access rights (e.g., "games.play", "users.create")
- **Roles:** Collections of permissions (e.g., "admin", "user", "guest")
- **Users:** Assigned to one role, inherit all role permissions

**See Also:** [Role-Based Access Control](../10-features/07-role-permissions.md)

---

### CORS (Cross-Origin Resource Sharing)

**Definition:** Browser security mechanism that controls how web pages from one origin can access resources from another origin.

**Usage:** "The backend configures CORS to allow the frontend origin to make API requests."

**Configuration:**
- Backend: Restricts to frontend origin (http://localhost:5173 in development)
- Game-service: Allows all origins (required for cross-domain game content)

**See Also:** [MDN CORS Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)

---

### bcrypt

**Definition:** Password hashing function based on the Blowfish cipher, designed to be computationally expensive to resist brute-force attacks.

**Usage:** "User passwords are hashed with bcrypt before storage in the database."

**Properties:**
- **Cost Factor:** 10 (default) - number of hashing rounds (2^10 = 1024 rounds)
- **Salt:** Automatically generated and embedded in the hash
- **One-way:** Hashes cannot be reversed, only verified

**Example Hash:** `$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy`

---

### SQLite

**Definition:** Self-contained, serverless, zero-configuration SQL database engine. Used for both Flashpoint metadata and user data storage.

**Usage:** "Flashpoint Web uses two SQLite databases: flashpoint.sqlite (read-only) and user.db (read-write)."

**Advantages:**
- No separate database server required
- Single-file databases
- ACID compliant
- Fast for read-heavy workloads

**Libraries:**
- **BetterSqlite3:** Synchronous Node.js SQLite library used in backend

**See Also:** [SQLite Documentation](https://www.sqlite.org/docs.html)

---

### Hot-Reload

**Definition:** Automatic reloading of database connections or code when files change, without requiring server restart.

**Usage:** "The DatabaseService implements hot-reload for flashpoint.sqlite using file watching."

**Implementation:**
- Watches file modification time using `fs.watchFile()`
- Closes existing connection
- Opens new connection to updated file
- Prevents stale data from being served

---

### Middleware

**Definition:** Functions that execute during the request-response cycle, with access to the request object, response object, and next middleware function.

**Usage:** "Authentication middleware validates JWT tokens before passing requests to route handlers."

**Common Middleware:**
- **Authentication:** Verifies JWT and attaches user to request
- **RBAC:** Checks user permissions for protected endpoints
- **Activity Logger:** Logs user actions for audit trail
- **Rate Limiting:** Prevents abuse by limiting request frequency
- **Error Handler:** Catches and formats errors

**See Also:** [Express.js Middleware](https://expressjs.com/en/guide/using-middleware.html)

---

### Prepared Statements

**Definition:** Parameterized SQL queries that separate query structure from data values, preventing SQL injection attacks.

**Usage:** "All database queries use prepared statements to ensure security."

**Example:**
```typescript
// Safe: uses prepared statement
db.prepare('SELECT * FROM users WHERE username = ?').get(username);

// Unsafe: vulnerable to SQL injection
db.prepare(`SELECT * FROM users WHERE username = '${username}'`).get();
```

---

### Proxy Server

**Definition:** Intermediate server that forwards requests from clients to other servers, often modifying requests or responses.

**Usage:** "The game-service proxy server forwards game content requests and provides CDN fallback."

**Features:**
- Request forwarding to local files or external CDNs
- MIME type detection and headers
- Caching of external resources
- CORS header injection

**See Also:** [HTTP Proxy Server](../05-game-service/proxy-server.md)

---

### MIME Type

**Definition:** Standard identifier for file format and content type, used in HTTP Content-Type headers.

**Usage:** "The game-service detects MIME types based on file extensions to serve content correctly."

**Common Types:**
- `application/x-shockwave-flash` - SWF files
- `text/html` - HTML files
- `application/javascript` - JavaScript files
- `image/png` - PNG images

**See Also:** [MIME Types](../05-game-service/mime-types.md)

---

### Rate Limiting

**Definition:** Technique to control the rate of requests from clients to prevent abuse and ensure fair resource allocation.

**Usage:** "The backend implements rate limiting on authentication endpoints to prevent brute-force attacks."

**Configuration:**
- Login endpoint: 5 requests per 15 minutes per IP
- API endpoints: 100 requests per 15 minutes per IP

**Library:** express-rate-limit

---

### Singleton

**Definition:** Design pattern ensuring a class has only one instance, providing a global point of access.

**Usage:** "The DatabaseService uses a singleton pattern to maintain a single database connection."

**Examples:**
- `DatabaseService` instance
- `UserDatabaseService` instance
- `CachedSystemSettingsService` instance

---

## Architecture Terms

### Monorepo

**Definition:** Software development strategy where code for multiple projects is stored in a single repository.

**Usage:** "Flashpoint Web is a monorepo containing backend, frontend, and game-service packages."

**Structure:**
```
flashpoint-web/
├── backend/        # Express API server
├── frontend/       # React SPA
├── game-service/   # Game content proxy
└── package.json    # Root workspace configuration
```

**Benefits:**
- Shared dependencies and tooling
- Atomic commits across services
- Simplified development workflow

---

### Service Layer Pattern

**Definition:** Architectural pattern separating business logic into dedicated service classes, decoupling it from HTTP routes and controllers.

**Usage:** "The backend uses the service layer pattern with services in src/services/ and routes in src/routes/."

**Layers:**
1. **Routes:** HTTP request handling, validation, response formatting
2. **Services:** Business logic, database operations, data transformation
3. **Database:** Data access layer (DatabaseService, UserDatabaseService)

**Example Services:**
- `GameService` - Game metadata queries
- `AuthService` - Authentication and token management
- `PlayTrackingService` - Play session tracking

---

### Separation of Concerns

**Definition:** Design principle dividing a system into distinct sections, each addressing a separate concern.

**Usage:** "Flashpoint Web separates game metadata (backend), game file serving (game-service), and UI (frontend)."

**Separation:**
- **Backend:** Game metadata, user management, authentication
- **Game-service:** Game file serving, proxy, ZIP mounting
- **Frontend:** User interface, state management, routing

---

### API Gateway

**Definition:** Server that acts as an entry point for a collection of microservices, routing requests and aggregating responses.

**Usage:** "The backend acts as an API gateway, delegating game file requests to the game-service."

**Responsibilities:**
- Request routing
- Authentication/authorization
- Response aggregation
- Protocol translation

---

### File Watching

**Definition:** Monitoring file system events (modification, creation, deletion) to trigger actions automatically.

**Usage:** "DatabaseService uses file watching to detect when Flashpoint Launcher updates the game database."

**Implementation:**
- `fs.watchFile()` polls file modification time
- Triggers reconnection when mtime changes
- Prevents stale data from being served

---

### State Management

**Definition:** Approach to managing application data that changes over time, ensuring consistency between UI and underlying data.

**Usage:** "The frontend uses Zustand for client state and React Query for server state management."

**State Types:**
- **Server State:** Data from API (games, users, playlists) - managed by React Query
- **Client State:** UI state (sidebar, theme, view mode) - managed by Zustand
- **URL State:** Route parameters and query strings - managed by React Router

**See Also:** [State Management](../04-frontend/state-management/zustand-stores.md)

---

### Lazy Loading

**Definition:** Design pattern that defers initialization of an object or resource until it's needed.

**Usage:** "React Router lazy loads route components to reduce initial bundle size."

**Benefits:**
- Faster initial page load
- Reduced memory usage
- Better code splitting

---

### Code Splitting

**Definition:** Technique of dividing code into smaller bundles that can be loaded on demand.

**Usage:** "Vite automatically code-splits routes for optimal loading performance."

**Implementation:**
- Route-based splitting (React.lazy)
- Dynamic imports
- Vendor bundle separation

---

### Server-Side Rendering (SSR)

**Definition:** Rendering web pages on the server and sending HTML to the client, rather than relying on client-side JavaScript.

**Usage:** "Flashpoint Web uses client-side rendering (CSR), not SSR, for a fully interactive SPA."

**Note:** Flashpoint Web is a Single-Page Application (SPA) with client-side rendering. SSR is not currently implemented.

---

## Database Terms

### Migration

**Definition:** Versioned database schema changes that can be applied sequentially to evolve the database structure over time.

**Usage:** "Migrations are stored in backend/src/migrations/ and run automatically on server startup."

**Format:** `00X_description.sql` (e.g., `001_user-schema.sql`)

**Best Practices:**
- Never modify existing migrations
- Always create new migrations for schema changes
- Use `IF NOT EXISTS` clauses
- Test on database copies first

**See Also:** [Database Schema](../03-backend/database/schema.md)

---

### Foreign Key

**Definition:** Database constraint establishing a link between two tables, ensuring referential integrity.

**Usage:** "The users.role_id column is a foreign key referencing roles.id."

**Constraints:**
- `ON DELETE CASCADE` - Delete child records when parent is deleted
- `ON DELETE SET NULL` - Set child column to NULL when parent is deleted
- `ON DELETE RESTRICT` - Prevent deletion of parent if children exist

---

### Index

**Definition:** Database structure that improves query performance by creating a sorted copy of selected columns.

**Usage:** "An index on users.username enables fast username lookups during login."

**Types:**
- **Primary Key Index:** Automatically created for primary keys
- **Unique Index:** Ensures column values are unique
- **Composite Index:** Index on multiple columns
- **Full-Text Index:** For text search (not used in SQLite)

**Trade-offs:**
- **Benefits:** Faster queries on indexed columns
- **Costs:** Slower writes, increased storage

---

### Transaction

**Definition:** Sequence of database operations treated as a single unit of work, ensuring atomicity (all or nothing).

**Usage:** "User creation wraps INSERT statements in a transaction to ensure data consistency."

**Properties (ACID):**
- **Atomicity:** All operations succeed or all fail
- **Consistency:** Database remains in valid state
- **Isolation:** Concurrent transactions don't interfere
- **Durability:** Committed changes persist

**Example:**
```typescript
db.transaction(() => {
  db.prepare('INSERT INTO users ...').run(userData);
  db.prepare('INSERT INTO user_stats ...').run(statsData);
})();
```

---

### Schema

**Definition:** Structure of a database, defining tables, columns, data types, constraints, and relationships.

**Usage:** "The user database schema includes tables for users, roles, permissions, and activity logs."

**Components:**
- **Tables:** Collections of related data
- **Columns:** Individual data fields
- **Data Types:** INTEGER, TEXT, BOOLEAN, REAL
- **Constraints:** PRIMARY KEY, FOREIGN KEY, UNIQUE, NOT NULL, CHECK

**See Also:** [Database Schema Reference](./database-schema-reference.md)

---

### Normalization

**Definition:** Process of organizing database schema to reduce redundancy and improve data integrity.

**Usage:** "The user database uses normalization to separate permissions from roles."

**Normal Forms:**
- **1NF:** Atomic values, no repeating groups
- **2NF:** 1NF + no partial dependencies
- **3NF:** 2NF + no transitive dependencies

**Example:** Instead of storing permissions as comma-separated strings in roles, we use a separate permissions table with role_permissions mapping.

---

### Denormalization

**Definition:** Intentionally introducing redundancy into a database to improve read performance.

**Usage:** "The game.tagsStr field denormalizes tags for faster searching without joins."

**Trade-offs:**
- **Benefits:** Faster reads, simpler queries
- **Costs:** Data redundancy, potential inconsistency, slower writes

---

### Collation

**Definition:** Set of rules for comparing and sorting strings in a database.

**Usage:** "Username and email fields use NOCASE collation for case-insensitive uniqueness."

**SQLite Collations:**
- `BINARY` - Case-sensitive byte comparison
- `NOCASE` - Case-insensitive ASCII comparison
- `RTRIM` - Trailing space ignoring comparison

---

## Authentication & Authorization

### Access Token

**Definition:** Short-lived JWT token used to authenticate API requests. Contains user claims and expires after a set duration.

**Usage:** "The frontend includes the access token in the Authorization header for all API requests."

**Properties:**
- **Type:** JWT (JSON Web Token)
- **Lifetime:** 1 hour (default)
- **Storage:** Memory and localStorage
- **Transmission:** Authorization: Bearer {token}

**Payload:**
```json
{
  "userId": 1,
  "username": "admin",
  "role": "admin",
  "iat": 1234567890,
  "exp": 1234571490
}
```

---

### Refresh Token

**Definition:** Long-lived random token used to obtain new access tokens without re-authentication.

**Usage:** "When an access token expires, the frontend uses the refresh token to obtain a new one."

**Properties:**
- **Type:** Random hex string (64 bytes)
- **Lifetime:** 7 days (default)
- **Storage:** Database, localStorage
- **Single-Use:** Revoked after generating new access token

**Flow:**
1. Access token expires
2. Frontend sends refresh token to `/api/auth/refresh`
3. Backend validates refresh token
4. Backend generates new access token
5. Backend revokes old refresh token
6. Backend creates new refresh token
7. Frontend receives new token pair

---

### Permission

**Definition:** Atomic access right to perform a specific action on a resource.

**Usage:** "The games.play permission allows users to launch games in the browser."

**Format:** `{resource}.{action}`

**Examples:**
- `games.read` - View game metadata
- `games.play` - Play games in browser
- `users.create` - Create new user accounts
- `roles.update` - Modify role permissions

**See Also:** [Role Permissions](../10-features/07-role-permissions.md)

---

### Guest Mode

**Definition:** Limited access mode allowing users to browse content without authentication.

**Usage:** "Guest mode enables anonymous browsing while restricting access to play features."

**Permissions:**
- `games.read` - Browse games
- `playlists.read` - View playlists

**Limitations:**
- Cannot play games (requires `games.play` permission)
- Cannot create playlists
- Session expires when browser closes (sessionStorage)

---

### Session

**Definition:** Period of user interaction with the application, tracked by authentication tokens.

**Usage:** "User sessions expire after 1 hour of inactivity, requiring re-authentication."

**Types:**
- **Authentication Session:** JWT access token validity period
- **Play Session:** Individual game play session tracked in user_game_plays table

---

## Frontend Terms

### SPA (Single-Page Application)

**Definition:** Web application that loads a single HTML page and dynamically updates content as the user interacts with the app.

**Usage:** "Flashpoint Web is an SPA built with React and React Router."

**Characteristics:**
- Client-side routing
- No full page reloads
- Dynamic content updates
- State management in JavaScript

**See Also:** [React SPA](https://reactjs.org/)

---

### HMR (Hot Module Replacement)

**Definition:** Development feature that updates JavaScript modules in the browser without full page reload, preserving application state.

**Usage:** "Vite provides HMR for instant feedback during frontend development."

**Benefits:**
- Faster development iteration
- Preserved component state
- Instant UI updates

---

### React Query (TanStack Query)

**Definition:** Data synchronization library for managing server state in React applications, handling caching, revalidation, and background updates.

**Usage:** "React Query manages game data fetching, caching, and automatic revalidation."

**Features:**
- Automatic caching
- Background refetching
- Optimistic updates
- Pagination support
- Stale-while-revalidate pattern

**See Also:** [React Query Documentation](../04-frontend/state-management/react-query.md)

---

### Zustand

**Definition:** Minimalist state management library for React, providing a simple API for managing global client state.

**Usage:** "Zustand stores manage UI state like sidebar visibility and theme preferences."

**Stores:**
- `useAuthStore` - Authentication state
- `useThemeStore` - Theme and color preferences
- `useUIStore` - UI state (sidebar, view mode, card size)

**See Also:** [Zustand Stores](../04-frontend/state-management/zustand-stores.md)

---

### Tailwind CSS

**Definition:** Utility-first CSS framework providing low-level utility classes for building custom designs.

**Usage:** "The frontend uses Tailwind CSS for styling with custom theme configuration."

**Features:**
- Utility-first approach
- Responsive design utilities
- Dark mode support
- Custom theme configuration
- JIT (Just-In-Time) compilation

**See Also:** [Tailwind CSS](https://tailwindcss.com/)

---

### Radix UI

**Definition:** Unstyled, accessible component library for building high-quality design systems and web applications.

**Usage:** "The frontend uses Radix UI primitives for accessible dropdowns, dialogs, and form components."

**Components:**
- Dialog / Alert Dialog
- Dropdown Menu
- Select
- Switch / Checkbox
- Tooltip / Popover

**See Also:** [Radix UI](https://www.radix-ui.com/)

---

### shadcn/ui

**Definition:** Collection of reusable components built with Radix UI and Tailwind CSS, copied into your project rather than installed as a dependency.

**Usage:** "UI components are based on shadcn/ui patterns with custom styling."

**Philosophy:**
- Components are copied, not installed
- Full control over component code
- Tailwind CSS for styling
- Radix UI for accessibility

**See Also:** [shadcn/ui](https://ui.shadcn.com/)

---

### Virtualization

**Definition:** Technique of rendering only visible items in a large list, improving performance by reducing DOM nodes.

**Usage:** "TanStack Virtual provides virtualization for efficiently rendering large game lists."

**Benefits:**
- Constant rendering time regardless of list size
- Reduced memory usage
- Smooth scrolling
- Handles thousands of items

**Library:** @tanstack/react-virtual

---

## Game & Emulation Terms

### Flash

**Definition:** Multimedia software platform for animation, games, and rich internet applications, discontinued by Adobe in December 2020.

**Usage:** "Flash games are preserved and played using the Ruffle emulator."

**File Format:** SWF (Shockwave Flash)

**History:**
- Created by Macromedia (1996)
- Acquired by Adobe (2005)
- End-of-life announced (2017)
- Discontinued (December 31, 2020)

---

### Ruffle

**Definition:** Flash Player emulator written in Rust, compiled to WebAssembly for running Flash content in modern browsers without plugins.

**Usage:** "Ruffle enables browser-based playback of Flash games without Adobe Flash Player."

**Features:**
- WebAssembly-based
- No plugin required
- ActionScript 1, 2, and partial 3 support
- Active development and improvement

**Integration:**
- Files copied from npm package to `public/ruffle/`
- Loaded dynamically in GamePlayer component
- Supports multiple scale modes

**See Also:** [Ruffle Player](../04-frontend/player-implementation/ruffle-player.md)

---

### SWF (Shockwave Flash)

**Definition:** File format for multimedia, vector graphics, and ActionScript used by Adobe Flash Player and Ruffle.

**Usage:** "SWF files are mounted and served by the game-service for Flash game playback."

**MIME Type:** `application/x-shockwave-flash`

**Properties:**
- Vector graphics
- Embedded ActionScript code
- Timeline-based animation
- Compressed format

---

### ActionScript

**Definition:** Object-oriented programming language used in Adobe Flash for creating interactive content and games.

**Usage:** "Flash games use ActionScript for game logic and interactivity."

**Versions:**
- **ActionScript 1:** Basic scripting (1999)
- **ActionScript 2:** Object-oriented features (2003)
- **ActionScript 3:** Performance improvements, modern OOP (2006)

---

### Shockwave

**Definition:** Multimedia platform by Adobe (formerly Macromedia) for creating interactive content, predating Flash.

**Usage:** "Shockwave games are preserved in Flashpoint but require different playback methods."

**File Format:** DCR (Director file)

**Note:** Distinct from Flash, though often confused. Shockwave is not currently supported in Flashpoint Web.

---

### HTML5 Games

**Definition:** Games built using standard web technologies (HTML, CSS, JavaScript) without requiring plugins.

**Usage:** "HTML5 games are served directly by the game-service without emulation."

**Technologies:**
- Canvas API for graphics
- Web Audio API for sound
- WebGL for 3D graphics
- Native browser APIs

**See Also:** [HTML5 Player](../04-frontend/player-implementation/html5-player.md)

---

### ZIP Mounting

**Definition:** Technique of serving files directly from ZIP archives without extracting them to disk.

**Usage:** "The game-service uses ZIP mounting to serve game files from Data/Games/ archives."

**Benefits:**
- No disk space for extraction
- Faster startup (no extraction delay)
- Reduced I/O operations

**Library:** node-stream-zip

**See Also:** [ZIP Manager](../05-game-service/zip-manager.md)

---

### Scale Mode

**Definition:** Method for fitting game content into the player viewport, affecting aspect ratio and sizing.

**Usage:** "Ruffle supports multiple scale modes including showall, exactfit, noborder, and noscale."

**Modes:**
- **showall:** Fit entire content, maintain aspect ratio (letterbox/pillarbox)
- **noborder:** Fill viewport, maintain aspect ratio (crop edges)
- **exactfit:** Fill viewport, ignore aspect ratio (distort)
- **noscale:** Original size, no scaling

**Default:** showall

---

### Polyfill

**Definition:** Code that implements a feature on web browsers that do not support the feature natively.

**Usage:** "The game-service injects polyfills for modern browser APIs into legacy Flash games."

**Examples:**
- XMLHttpRequest shims
- Console.log for debugging
- HTML5 API compatibility layers

**See Also:** [HTML Polyfills](../05-game-service/html-polyfills.md)

---

## Development Terms

### Monorepo Workspace

**Definition:** Configuration allowing a single repository to manage multiple packages with shared dependencies.

**Usage:** "The root package.json defines workspaces for backend, frontend, and game-service."

**Benefits:**
- Shared node_modules
- Centralized dependency management
- Atomic commits across packages

**Configuration:**
```json
{
  "workspaces": [
    "backend",
    "frontend",
    "game-service"
  ]
}
```

---

### TypeScript

**Definition:** Typed superset of JavaScript that compiles to plain JavaScript, adding static type checking.

**Usage:** "All three services are written in TypeScript for type safety and better developer experience."

**Benefits:**
- Compile-time type checking
- Better IDE support
- Self-documenting code
- Refactoring safety

**Configuration:** `tsconfig.json` in each service

---

### tsx

**Definition:** Node.js runner for TypeScript files with automatic compilation and watch mode.

**Usage:** "Development servers use tsx watch for hot-reloading TypeScript code."

**Features:**
- No separate build step
- Watch mode for development
- Fast compilation with esbuild

**Commands:**
- `tsx src/server.ts` - Run once
- `tsx watch src/server.ts` - Watch mode

---

### Vite

**Definition:** Modern frontend build tool providing fast development server with HMR and optimized production builds.

**Usage:** "The frontend uses Vite for development server and production builds."

**Features:**
- Instant server start
- Lightning-fast HMR
- Optimized production builds
- Plugin ecosystem

**See Also:** [Vite](https://vitejs.dev/)

---

### ESLint

**Definition:** Pluggable linting utility for JavaScript and TypeScript, enforcing code quality and style rules.

**Usage:** "ESLint ensures code quality and consistency across all three services."

**Configuration:** `.eslintrc.json` in each service

**Rules:**
- TypeScript-specific rules
- React hooks rules (frontend)
- Import rules
- Code style enforcement

---

### Concurrently

**Definition:** npm package for running multiple npm scripts simultaneously with colored output.

**Usage:** "The root npm dev script uses concurrently to start all services together."

**Example:**
```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\" \"npm run dev:game-service\""
  }
}
```

---

### Docker

**Definition:** Platform for developing, shipping, and running applications in containers.

**Usage:** "Docker Compose orchestrates all three services for production deployment."

**Files:**
- `Dockerfile` (each service)
- `docker-compose.yml` (root)

**See Also:** [Docker Deployment](../09-deployment/docker-deployment.md)

---

### Environment Variables

**Definition:** Configuration values stored outside the code, loaded at runtime based on the environment.

**Usage:** "Each service has a .env file for environment-specific configuration."

**Files:**
- `.env` - Local environment variables
- `.env.example` - Template with all variables
- `.env.production` - Production configuration

**Loading:** dotenv package loads .env files on startup

**See Also:** [Environment Variables](../09-deployment/environment-variables.md)

---

### ACID

**Definition:** Set of properties guaranteeing database transactions are processed reliably.

**Usage:** "SQLite provides ACID guarantees for user database transactions."

**Properties:**
- **Atomicity:** All or nothing execution
- **Consistency:** Valid state before and after
- **Isolation:** Concurrent transactions don't interfere
- **Durability:** Committed changes persist

---

### REST (Representational State Transfer)

**Definition:** Architectural style for designing networked applications using HTTP methods for CRUD operations.

**Usage:** "The backend provides a RESTful API for game metadata and user management."

**Principles:**
- Stateless communication
- Resource-based URLs
- Standard HTTP methods (GET, POST, PUT, DELETE)
- JSON representation

**Example Endpoints:**
- `GET /api/games` - List games
- `GET /api/games/:id` - Get game details
- `POST /api/auth/login` - Login
- `PUT /api/users/:id` - Update user

---

## Related Documentation

- [Database Schema Reference](./database-schema-reference.md)
- [Type Definitions Reference](./type-definitions.md)
- [External Dependencies](./external-dependencies.md)
- [API Reference](../06-api-reference/README.md)
