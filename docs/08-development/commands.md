# Commands Reference

Complete reference for all npm commands available in the Flashpoint Web monorepo.

## Table of Contents

- [Monorepo Commands](#monorepo-commands)
- [Backend Commands](#backend-commands)
- [Frontend Commands](#frontend-commands)
- [Game Service Commands](#game-service-commands)
- [Docker Commands](#docker-commands)
- [Common Workflows](#common-workflows)

---

## Monorepo Commands

Run these commands from the repository root.

### Development

```bash
# Start all services concurrently with colored output
npm run dev

# Start individual services
npm run dev:backend
npm run dev:frontend
npm run dev:game-service

# Alternative single-service commands
npm run dev:backend-only
npm run dev:frontend-only
npm run dev:game-service-only
```

**Output Example:**
```
[backend]     Server running on port 3100
[frontend]    Local: http://localhost:5173/
[game-service] Proxy server: http://localhost:22500
[game-service] GameZip server: http://localhost:22501
```

### Installation

```bash
# Install dependencies for all services
npm run install:all

# Install for individual services
npm run install:backend
npm run install:frontend
npm run install:game-service
```

**Use Cases:**
- Fresh clone setup
- After package.json changes
- CI/CD pipeline initialization

### Building

```bash
# Build all services for production
npm run build

# Build individual services
npm run build:backend
npm run build:frontend
npm run build:game-service
```

**Output Directories:**
- Backend: `backend/dist/`
- Frontend: `frontend/dist/`
- Game Service: `game-service/dist/`

### Type Checking

```bash
# Type check all services without emitting files
npm run typecheck

# Type check individual services
npm run typecheck:backend
npm run typecheck:frontend
npm run typecheck:game-service
```

**When to Use:**
- Before committing code
- In CI/CD pipelines
- When debugging type errors

### Production

```bash
# Start backend and game-service in production mode
# (Frontend is served statically via backend in production)
npm start

# Start individual services
npm run start:backend
npm run start:game-service
```

**Prerequisites:**
- Services must be built first: `npm run build`
- Environment variables configured in `.env` files

### Cleanup

```bash
# Remove all build artifacts and node_modules
npm run clean

# Clean individual services
npm run clean:backend
npm run clean:frontend
npm run clean:game-service
```

**Warning:** This removes all dependencies. Run `npm run install:all` afterwards.

---

## Backend Commands

Run these commands from the `backend/` directory.

```bash
cd backend
```

### Development

```bash
# Start development server with hot reload (tsx watch)
npm run dev

# Kill processes on port 3100 (Windows utility)
npm run kill-port

# Start backend + frontend together
npm run dev:all
```

**Features:**
- Automatic restart on file changes
- Source maps for debugging
- No compilation step needed

### Building

```bash
# Compile TypeScript to JavaScript
npm run build

# Output: backend/dist/
# - Compiled JavaScript files
# - Type declaration files (.d.ts)
# - Source maps (.js.map)
```

**Configuration:** `tsconfig.json`
- Target: ES2022
- Module: CommonJS
- Strict mode enabled

### Production

```bash
# Run compiled production build
npm start

# Equivalent to:
node dist/server.js
```

**Environment:** Requires production `.env` configuration

### Type Checking

```bash
# Type check without building
npm run typecheck

# Reports type errors but doesn't emit files
```

**Tip:** Faster than `npm run build` for quick validation

### Linting

```bash
# Lint TypeScript files in src/
npm run lint
```

**Configuration:** `.eslintrc.json`
- ESLint + TypeScript plugin
- Checks for code quality issues
- Enforces coding standards

### Testing

```bash
# Run tests with Vitest
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test src/services/GameService.test.ts
```

**Test Framework:** Vitest
- Fast unit testing
- Jest-compatible API
- Built-in TypeScript support

### Utilities

```bash
# Fix absolute path imports
npm run fix-paths
```

---

## Frontend Commands

Run these commands from the `frontend/` directory.

```bash
cd frontend
```

### Development

```bash
# Start Vite dev server with HMR
npm run dev

# Opens at http://localhost:5173
```

**Features:**
- Hot Module Replacement (HMR)
- Instant updates on save
- Vite proxy to backend API
- Fast cold start (<1s)

### Building

```bash
# Build for production
npm run build

# Steps:
# 1. TypeScript compilation check (tsc)
# 2. Vite build optimization
# 3. Output to frontend/dist/
```

**Output Includes:**
- Minified JavaScript bundles
- Optimized CSS
- Static assets (images, fonts)
- index.html entry point

**Build Optimizations:**
- Code splitting
- Tree shaking
- Asset hashing
- Compression

### Preview

```bash
# Preview production build locally
npm run preview

# Serves frontend/dist/ at http://localhost:4173
```

**Use Cases:**
- Test production build locally
- Verify build optimizations
- Check bundle sizes

### Type Checking

```bash
# Type check without emitting files
npm run typecheck
```

**Configuration:** `tsconfig.json`
- Target: ES2020
- Module: ESNext
- JSX: react-jsx
- Strict mode enabled

### Linting

```bash
# Lint TypeScript and TSX files
npm run lint

# Lint with auto-fix
npm run lint -- --fix
```

**Configuration:** `.eslintrc.json`
- React hooks rules
- React refresh plugin
- TypeScript rules

### Ruffle Management

```bash
# Copy Ruffle emulator files to public/
npm run copy-ruffle

# Automatically runs after npm install (postinstall hook)
```

**What It Does:**
- Copies from `node_modules/@ruffle-rs/ruffle/`
- To `public/ruffle/`
- Includes WebAssembly binaries and JS runtime

**When to Run Manually:**
- After Ruffle version upgrade
- If public/ruffle/ is missing
- When Ruffle fails to load

---

## Game Service Commands

Run these commands from the `game-service/` directory.

```bash
cd game-service
```

### Development

```bash
# Start with hot reload
npm run dev

# Starts two servers:
# - HTTP Proxy: http://localhost:22500
# - GameZip Server: http://localhost:22501
```

**Features:**
- Automatic restart on changes
- tsx watch mode
- Live log output

### Building

```bash
# Compile TypeScript
npm run build

# Output: game-service/dist/
```

**Configuration:** `tsconfig.json`
- Target: ES2022
- Module: CommonJS

### Production

```bash
# Run production build
npm start

# Equivalent to:
node dist/index.js
```

### Type Checking

```bash
# Validate types without building
npm run typecheck
```

---

## Docker Commands

Run these commands from the repository root.

### Prerequisites

```bash
# Set Flashpoint installation path
export FLASHPOINT_HOST_PATH=/path/to/Flashpoint

# Windows PowerShell
$env:FLASHPOINT_HOST_PATH = "D:\Flashpoint"

# Windows CMD
set FLASHPOINT_HOST_PATH=D:\Flashpoint
```

### Building

```bash
# Build all service images
docker-compose build

# Build specific service
docker-compose build backend
docker-compose build frontend
docker-compose build game-service

# Build with no cache (clean build)
docker-compose build --no-cache
```

### Running

```bash
# Start all services in background
docker-compose up -d

# Start specific service
docker-compose up -d backend

# Start with logs visible (foreground)
docker-compose up

# Start and rebuild
docker-compose up -d --build
```

### Monitoring

```bash
# View logs from all services
docker-compose logs -f

# View logs from specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f game-service

# View last 100 lines
docker-compose logs --tail=100 backend
```

### Management

```bash
# List running containers
docker-compose ps

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# Restart specific service
docker-compose restart backend

# Execute command in container
docker-compose exec backend sh
docker-compose exec backend npm run typecheck
```

### Cleanup

```bash
# Stop and remove containers
docker-compose down

# Remove images
docker-compose down --rmi all

# Full cleanup (containers, volumes, images)
docker-compose down -v --rmi all
```

---

## Common Workflows

### First Time Setup

```bash
# 1. Install dependencies
npm run install:all

# 2. Configure environment
cp backend/.env.example backend/.env
cp game-service/.env.example game-service/.env
# Edit .env files with your Flashpoint paths

# 3. Verify setup
npm run typecheck

# 4. Start development
npm run dev
```

### Daily Development

```bash
# Start all services
npm run dev

# In separate terminals, run individual services:
npm run dev:backend
npm run dev:frontend
npm run dev:game-service
```

### Before Committing

```bash
# Type check all services
npm run typecheck

# Lint backend
cd backend && npm run lint

# Lint frontend
cd frontend && npm run lint

# Run backend tests
cd backend && npm test

# Verify builds
npm run build
```

### Dependency Updates

```bash
# Update specific service
cd backend
npm update

# Update all services
npm run install:all
```

### Debugging Build Issues

```bash
# Clean everything
npm run clean

# Reinstall
npm run install:all

# Type check
npm run typecheck

# Build
npm run build
```

### Production Deployment

```bash
# 1. Install production dependencies
npm run install:all --production

# 2. Build all services
npm run build

# 3. Set production environment variables
export NODE_ENV=production

# 4. Start production servers
npm start
```

### Testing Individual Features

```bash
# Backend only
cd backend
npm run dev

# Frontend only (with backend mock)
cd frontend
npm run dev

# Game service only
cd game-service
npm run dev
```

### Performance Testing

```bash
# Build for production
npm run build

# Preview frontend build
cd frontend
npm run preview

# Run production backend
cd backend
npm start
```

---

## Command Aliases and Shortcuts

### Recommended Shell Aliases

Add to `.bashrc` or `.zshrc`:

```bash
# Flashpoint Web aliases
alias fp-dev='npm run dev'
alias fp-build='npm run build'
alias fp-check='npm run typecheck'
alias fp-clean='npm run clean && npm run install:all'
alias fp-backend='cd backend && npm run dev'
alias fp-frontend='cd frontend && npm run dev'
alias fp-game='cd game-service && npm run dev'
```

### VS Code Tasks

Create `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Start All Services",
      "type": "npm",
      "script": "dev",
      "problemMatcher": []
    },
    {
      "label": "Type Check All",
      "type": "npm",
      "script": "typecheck",
      "problemMatcher": []
    },
    {
      "label": "Build All",
      "type": "npm",
      "script": "build",
      "problemMatcher": []
    }
  ]
}
```

---

## Environment Variables

### Required for Commands

**Backend:**
- `FLASHPOINT_PATH`: Path to Flashpoint installation
- `FLASHPOINT_DB_PATH`: Path to flashpoint.sqlite
- `FLASHPOINT_HTDOCS_PATH`: Path to htdocs folder
- `GAME_SERVICE_PROXY_URL`: Game service proxy URL
- `GAME_SERVICE_GAMEZIP_URL`: Game service GameZip URL

**Game Service:**
- `FLASHPOINT_PATH`: Path to Flashpoint installation
- `FLASHPOINT_HTDOCS_PATH`: Path to htdocs folder
- `FLASHPOINT_GAMES_PATH`: Path to Games folder

**Frontend:**
- `VITE_API_URL`: Backend API URL (build time)

See [Configuration Documentation](../03-backend/configuration.md) for complete details.

---

## Troubleshooting Commands

### Port Already in Use

```bash
# Find process using port 3100 (backend)
lsof -i :3100
netstat -ano | findstr :3100  # Windows

# Kill process
kill -9 <PID>
taskkill /PID <PID> /F  # Windows

# Backend utility
cd backend
npm run kill-port
```

### Build Errors

```bash
# Clean and rebuild
npm run clean
npm run install:all
npm run build
```

### Type Errors

```bash
# Check each service individually
cd backend && npm run typecheck
cd frontend && npm run typecheck
cd game-service && npm run typecheck
```

### Dependency Issues

```bash
# Remove lock files and reinstall
rm -rf node_modules package-lock.json
rm -rf backend/node_modules backend/package-lock.json
rm -rf frontend/node_modules frontend/package-lock.json
rm -rf game-service/node_modules game-service/package-lock.json

npm run install:all
```

---

## Additional Resources

- [Project Structure](./project-structure.md) - Understanding the codebase
- [Debugging Guide](./debugging.md) - Debugging tips and tools
- [Common Pitfalls](./common-pitfalls.md) - Avoiding common mistakes
