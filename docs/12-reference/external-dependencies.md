# External Dependencies Reference

Reference for all npm packages used across the Flashpoint Web monorepo.

## Backend Dependencies

| Package               | Version | License      | Purpose                                                   |
| --------------------- | ------- | ------------ | --------------------------------------------------------- |
| axios                 | ^1.13.2 | MIT          | HTTP client for external requests                         |
| bcrypt                | ^6.0.0  | MIT          | Password hashing (cost factor: 10)                        |
| better-sqlite3        | ^12.6.0 | MIT          | Synchronous SQLite database driver                        |
| cheerio               | ^1.1.2  | MIT          | Server-side HTML parsing                                  |
| compression           | ^1.7.4  | MIT          | Gzip/deflate response compression                         |
| cors                  | ^2.8.5  | MIT          | CORS middleware for Express                               |
| dotenv                | ^16.4.5 | BSD-2-Clause | Load environment variables from .env                      |
| express               | ^4.18.3 | MIT          | Web framework and routing                                 |
| express-rate-limit    | ^7.1.5  | MIT          | Rate limiting middleware (login: 5/15min, API: 100/15min) |
| helmet                | ^7.1.0  | MIT          | Security headers (CSP, HSTS, X-Frame-Options)             |
| http-proxy-middleware | ^2.0.6  | MIT          | Proxy request handling for game content routes            |
| jsonwebtoken          | ^9.0.3  | MIT          | JWT implementation (HS256, 1hr expiration)                |
| node-stream-zip       | ^1.15.0 | MIT          | Stream files from ZIPs without extraction                 |

| winston | ^3.11.0 | MIT | Logging with multiple transports | | zod | ^3.22.4 |
MIT | TypeScript schema validation |

## Frontend Dependencies

| Package                  | Version        | License        | Purpose                                                  |
| ------------------------ | -------------- | -------------- | -------------------------------------------------------- |
| @hookform/resolvers      | ^5.2.2         | MIT            | Form validation resolvers for Zod                        |
| @radix-ui/react-\*       | latest         | MIT            | Accessible UI primitives (dialogs, menus, selects, etc.) |
| @ruffle-rs/ruffle        | ^0.2.0-nightly | MIT/Apache-2.0 | Flash emulator (WebAssembly)                             |
| @tanstack/react-query    | ^5.28.9        | MIT            | Server state caching and syncing                         |
| @tanstack/react-table    | ^8.21.3        | MIT            | Headless data table library                              |
| @tanstack/react-virtual  | ^3.2.0         | MIT            | Virtualization for large lists                           |
| axios                    | ^1.6.8         | MIT            | HTTP client with interceptors                            |
| class-variance-authority | ^0.7.1         | MIT            | Component variant styling                                |
| clsx                     | ^2.1.0         | MIT            | Conditional className construction                       |
| cmdk                     | ^1.1.1         | MIT            | Command palette interface                                |
| date-fns                 | ^3.6.0         | MIT            | Date utilities (formatting, parsing, relative time)      |
| lucide-react             | ^0.358.0       | ISC            | Icon library                                             |
| next-themes              | ^0.4.6         | MIT            | Theme management (dark/light mode, system detection)     |
| react                    | ^18.3.1        | MIT            | UI library with hooks                                    |
| react-dom                | ^18.3.1        | MIT            | React DOM rendering                                      |
| react-hook-form          | ^7.71.1        | MIT            | Performant form library with validation                  |
| react-router-dom         | ^6.22.3        | MIT            | Client-side routing with nested routes                   |
| recharts                 | ^3.6.0         | MIT            | Composable charting library                              |
| sonner                   | ^2.0.7         | MIT            | Toast notifications (keyboard dismissal, promises)       |
| tailwind-merge           | ^3.4.0         | MIT            | Merge Tailwind classes without conflicts                 |
| tailwindcss-animate      | ^1.0.7         | MIT            | Pre-built animations (fade, slide, scale, spin)          |
| zod                      | ^4.3.5         | MIT            | Schema validation                                        |
| zustand                  | ^4.5.2         | MIT            | Client state management (auth, theme, UI)                |

## Backend Game Module Dependencies

Game content serving is now integrated into the backend service and uses the
following additional dependencies (already listed in Backend Dependencies):

- **node-stream-zip** (^1.15.0) - ZIP streaming for mounted archives
- **cors** (^2.8.5) - CORS headers for game content routes
- **axios** (^1.13.2) - HTTP client for CDN fallback requests

## Development Dependencies

### Backend

| Package               | Purpose                                                                |
| --------------------- | ---------------------------------------------------------------------- |
| @types/\*             | TypeScript definitions for bcrypt, better-sqlite3, cors, express, etc. |
| @typescript-eslint/\* | TypeScript linting and ESLint parser                                   |
| concurrently          | Run multiple npm scripts concurrently                                  |
| eslint                | Code quality linting                                                   |
| tsx                   | TypeScript runner with watch mode                                      |
| typescript            | TypeScript compiler                                                    |
| vitest                | Fast unit test framework (Vite-powered, Jest API)                      |

### Frontend

| Package                 | Purpose                                       |
| ----------------------- | --------------------------------------------- |
| @types/react            | TypeScript definitions for React              |
| @types/react-dom        | TypeScript definitions for React DOM          |
| @vitejs/plugin-react    | React Fast Refresh and JSX transformation     |
| autoprefixer            | CSS vendor prefix injection                   |
| postcss                 | CSS transformation with plugins               |
| shx                     | Cross-platform shell commands for npm scripts |
| tailwindcss             | Utility-first CSS framework                   |
| typescript              | TypeScript compiler                           |
| vite                    | Frontend build tool with HMR                  |
| vite-plugin-static-copy | Copy static assets to build output            |


## License Summary

| License      | Count | Permissive | Copyleft |
| ------------ | ----- | ---------- | -------- |
| MIT          | ~95%  | Yes        | No       |
| Apache-2.0   | ~3%   | Yes        | No       |
| ISC          | ~1%   | Yes        | No       |
| BSD-2-Clause | ~1%   | Yes        | No       |

All dependencies use permissive open-source licenses. **No GPL/LGPL/AGPL
licenses** are used.

## Security Audits

```bash
npm audit              # Check for vulnerabilities
npm audit fix         # Fix automatically (review breaking changes)
npm update            # Update dependencies
```

## Related Documentation

- [Backend Services](../03-backend/services/README.md)
- [Environment Variables](../09-deployment/environment-variables.md)
- [Frontend Architecture](../04-frontend/README.md)
