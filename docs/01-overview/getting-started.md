# Getting Started

## Introduction

This guide will help you set up Flashpoint Web for development on your local machine. By the end of this guide, you'll have all three services running and be able to browse and play games from your Flashpoint Archive.

## Prerequisites

Before you begin, ensure you have the following installed and configured:

### Required Software

#### 1. Node.js (v20.0.0 or higher)

Flashpoint Web requires Node.js 20 or newer for all three services.

**Check your version**:
```bash
node --version
# Should output: v20.x.x or higher
```

**Installation**:
- Download from [nodejs.org](https://nodejs.org/)
- We recommend the LTS (Long-Term Support) version
- The installer includes npm automatically

#### 2. npm (v9.0.0 or higher)

npm comes bundled with Node.js, but verify the version:

```bash
npm --version
# Should output: 9.x.x or higher
```

**Update npm if needed**:
```bash
npm install -g npm@latest
```

#### 3. Git

Required for cloning the repository and version control.

```bash
git --version
# Should output: git version 2.x.x or higher
```

**Installation**:
- Windows: [git-scm.com](https://git-scm.com/)
- macOS: `brew install git` or Xcode Command Line Tools
- Linux: `sudo apt-get install git` (Debian/Ubuntu) or equivalent

### Required: Flashpoint Installation

Flashpoint Web requires a local Flashpoint installation to access game data and metadata.

**Download Flashpoint**:
1. Visit [flashpointarchive.org](https://flashpointarchive.org/)
2. Download Flashpoint Infinity or Ultimate
3. Install to a known location (e.g., `D:/Flashpoint` or `C:/Flashpoint`)
4. Note the installation path - you'll need it for configuration

**Verify Installation**:
Your Flashpoint installation should contain these directories:
```
D:/Flashpoint/
├── Data/
│   ├── flashpoint.sqlite    (Required: Game metadata database)
│   ├── Games/               (Game ZIP archives)
│   ├── Images/              (Game screenshots)
│   └── Logos/               (Platform logos)
└── Legacy/
    └── htdocs/              (Legacy web content)
```

### Optional Software

#### Docker (for containerized deployment)

If you plan to use Docker for deployment:

- **Docker Desktop** (Windows/macOS): [docker.com](https://www.docker.com/products/docker-desktop)
- **Docker Engine** (Linux): Follow [Docker installation guide](https://docs.docker.com/engine/install/)

Verify installation:
```bash
docker --version
docker-compose --version
```

#### Code Editor

We recommend **Visual Studio Code** with these extensions:
- ESLint - Code linting
- TypeScript and JavaScript Language Features
- Prettier - Code formatter
- React Developer Tools
- Tailwind CSS IntelliSense

## Installation

### Step 1: Clone the Repository

```bash
# Clone the repository
git clone https://github.com/your-org/flashpoint-web.git

# Navigate to project directory
cd flashpoint-web
```

### Step 2: Install Dependencies

Flashpoint Web is a monorepo with three services. You can install all dependencies at once or individually.

#### Option A: Install All Services (Recommended)

```bash
# Install dependencies for all three services
npm run install:all
```

This command runs:
- `npm install` in the root directory
- `npm install` in `backend/`
- `npm install` in `frontend/`
- `npm install` in `game-service/`

#### Option B: Install Services Individually

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install

# Game Service
cd ../game-service
npm install
```

**Expected Duration**: 2-5 minutes depending on your internet connection

**Troubleshooting**:
- If you encounter permission errors on Windows, run your terminal as Administrator
- If npm install fails, try clearing the npm cache: `npm cache clean --force`
- On Linux/macOS, you might need to use `sudo` for global installations

### Step 3: Configure Backend Environment

The backend requires environment variables to locate your Flashpoint installation and configure services.

#### Create Backend .env File

```bash
# Navigate to backend directory
cd backend

# Copy the example environment file
cp .env.example .env

# Open .env in your editor
# Windows: notepad .env
# macOS: open .env
# Linux: nano .env
```

#### Configure Required Variables

Edit the `.env` file and update these critical settings:

```bash
# =============================================================================
# CRITICAL: Only FLASHPOINT_PATH needs to be set
# All other paths are derived automatically!
# =============================================================================

# Base path to your Flashpoint installation
FLASHPOINT_PATH=D:/Flashpoint

# Game service host (use localhost for development)
GAME_SERVICE_HOST=localhost

# Frontend origin for CORS
DOMAIN=http://localhost:5173

# =============================================================================
# Optional: Customize if needed
# =============================================================================

# Server configuration
NODE_ENV=development
PORT=3100
HOST=0.0.0.0

# Logging level (error, warn, info, debug)
LOG_LEVEL=info

# Rate limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

**Important Path Notes**:

- **Windows**: Use forward slashes (`/`) or escaped backslashes (`\\`) in paths
  - ✅ Correct: `D:/Flashpoint` or `D:\\Flashpoint`
  - ❌ Incorrect: `D:\Flashpoint` (unescaped backslashes)

- **Linux/macOS**: Use absolute paths
  - Example: `/home/username/Flashpoint` or `/Users/username/Flashpoint`

**Path Derivation**:

All other paths are automatically derived from `FLASHPOINT_PATH`:
- Database: `${FLASHPOINT_PATH}/Data/flashpoint.sqlite`
- HTDOCS: `${FLASHPOINT_PATH}/Legacy/htdocs`
- Images: `${FLASHPOINT_PATH}/Data/Images`
- Logos: `${FLASHPOINT_PATH}/Data/Logos`
- Playlists: `${FLASHPOINT_PATH}/Data/Playlists`
- Games: `${FLASHPOINT_PATH}/Data/Games`

You do not need to set individual path environment variables.

### Step 4: Configure Game Service Environment

The game service also needs to know where Flashpoint is installed.

```bash
# Navigate to game-service directory
cd ../game-service

# Copy the example environment file
cp .env.example .env

# Edit the file
```

Update these variables in `game-service/.env`:

```bash
# Flashpoint path (HTDOCS and Games paths are derived automatically)
FLASHPOINT_PATH=D:/Flashpoint

# Server ports (defaults should work)
PROXY_PORT=22500
GAMEZIPSERVER_PORT=22501

# External fallback CDN (optional)
EXTERNAL_FALLBACK_URLS=http://infinity.flashpointarchive.org/Flashpoint/Legacy/htdocs,http://infinity.unstable.life/Flashpoint/Legacy/htdocs/

# Logging
LOG_LEVEL=info
```

### Step 5: Frontend Configuration (No Environment Variables Needed)

The frontend does not require any environment variable configuration. The Vite development server uses a proxy configuration in `vite.config.ts` to automatically route API requests to the backend at `http://localhost:3100`.

No `.env` file is needed for the frontend in development or production.

### Step 6: Verify Configuration

Before starting the services, verify your configuration:

#### Check Flashpoint Database Exists

```bash
# Windows
dir "D:\Flashpoint\Data\flashpoint.sqlite"

# Linux/macOS
ls -lh /path/to/Flashpoint/Data/flashpoint.sqlite
```

You should see a file that's several gigabytes in size.

#### Check Port Availability

Ensure these ports are not in use:
- **3100** - Backend API
- **5173** - Frontend dev server
- **22500** - Game service proxy
- **22501** - Game service GameZip

**Check on Windows**:
```powershell
netstat -ano | findstr "3100 5173 22500 22501"
```

**Check on Linux/macOS**:
```bash
lsof -i :3100 -i :5173 -i :22500 -i :22501
```

If ports are in use, either stop the conflicting services or change ports in the `.env` files.

## Running the Application

### Development Mode

Flashpoint Web provides several ways to run the development servers.

#### Option 1: Start All Services (Recommended)

From the **root directory** of the project:

```bash
npm run dev
```

This command starts all three services concurrently:
- Backend API (port 3100)
- Frontend dev server (port 5173)
- Game service proxy (ports 22500, 22501)

**Output**:
```
[backend] Server running on http://localhost:3100
[frontend] Local:   http://localhost:5173/
[game-service] Proxy server running on port 22500
[game-service] GameZip server running on port 22501
```

#### Option 2: Start Services Individually

If you need more control or want to debug a specific service:

**Terminal 1 - Backend**:
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend**:
```bash
cd frontend
npm run dev
```

**Terminal 3 - Game Service**:
```bash
cd game-service
npm run dev
```

#### Option 3: Start Specific Services

From the root directory:

```bash
# Backend only
npm run dev:backend

# Frontend only
npm run dev:frontend

# Game service only
npm run dev:game-service
```

### First-Time Startup

When you first start the backend, it will:

1. **Initialize User Database** (`user.db`)
2. **Run Database Migrations** (create tables)
3. **Create Default Admin User** (if configured)
4. **Connect to Flashpoint Database** (flashpoint.sqlite)
5. **Start File Watcher** (for database hot-reload)

**Expected Console Output**:

```
[backend] info: Starting Flashpoint Web Backend
[backend] info: Database migrations completed successfully
[backend] info: User database initialized
[backend] info: Connected to flashpoint.sqlite (70,532 games)
[backend] info: File watcher active for database hot-reload
[backend] info: Server running on http://localhost:3100
```

### Verifying Setup

#### 1. Backend Health Check

Open your browser or use curl:

```bash
# Browser
http://localhost:3100/health

# Command line
curl http://localhost:3100/health
```

**Expected Response**:
```json
{
  "status": "ok",
  "timestamp": "2026-01-18T10:30:00.000Z"
}
```

#### 2. Frontend Access

Open your browser:

```
http://localhost:5173
```

You should see the Flashpoint Web home page with the game library.

#### 3. Test Game Browsing

1. Navigate to **Browse** page
2. You should see a grid/list of games from your Flashpoint collection
3. Try filtering by platform (e.g., "Flash")
4. Search for a game title

#### 4. Test Game Service

Check if the proxy server is running:

```bash
curl http://localhost:22500/
```

You should receive a response (might be 404, which is normal without a valid path).

## Common Issues and Troubleshooting

### Issue: "Cannot find module" errors

**Cause**: Dependencies not installed properly

**Solution**:
```bash
# Clean install all dependencies
npm run clean
npm run install:all
```

### Issue: "ENOENT: no such file or directory" - Flashpoint paths

**Cause**: Backend can't find Flashpoint installation

**Solution**:
1. Verify Flashpoint installation exists
2. Check paths in `backend/.env`
3. Use forward slashes in Windows paths: `D:/Flashpoint`
4. Ensure `flashpoint.sqlite` exists at specified path

**Verify**:
```bash
# Check if database exists (Windows)
dir "D:\Flashpoint\Data\flashpoint.sqlite"

# Check if database exists (Linux/macOS)
ls -lh /path/to/Flashpoint/Data/flashpoint.sqlite
```

### Issue: "Port already in use" errors

**Cause**: Another application is using required ports

**Solution**:

**Find and kill process (Windows)**:
```powershell
# Find process using port 3100
netstat -ano | findstr :3100

# Kill process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

**Find and kill process (Linux/macOS)**:
```bash
# Find and kill process using port 3100
lsof -ti:3100 | xargs kill -9
```

**Or change ports in `.env` files**:
```bash
# backend/.env
PORT=3002

# game-service/.env
PROXY_PORT=22502
GAMEZIPSERVER_PORT=22503
```

### Issue: Frontend shows "Network Error" when fetching games

**Cause**: Backend not running or CORS misconfigured

**Solution**:
1. Verify backend is running: `curl http://localhost:3100/health`
2. Check `DOMAIN` in `backend/.env` matches frontend URL
3. Ensure Vite proxy is configured in `frontend/vite.config.ts`

### Issue: Games don't load or show 404 errors

**Cause**: Game service not running or paths misconfigured

**Solution**:
1. Verify game service is running on ports 22500 and 22501
2. Check `FLASHPOINT_PATH` in `game-service/.env` (paths are derived automatically)
3. Verify FLASHPOINT_PATH points to correct Flashpoint installation

### Issue: SQLite "database is locked" error

**Cause**: Flashpoint Launcher is using flashpoint.sqlite

**Solution**:
1. Close Flashpoint Launcher completely
2. Restart backend service
3. Backend uses read-only mode, so conflicts should be rare

### Issue: Ruffle emulator not loading

**Cause**: Ruffle files not copied to public directory

**Solution**:
```bash
cd frontend
npm run copy-ruffle
```

Ruffle files should be in `frontend/public/ruffle/`.

### Issue: TypeScript compilation errors

**Cause**: Type mismatches or outdated dependencies

**Solution**:
```bash
# Type check all services
npm run typecheck

# Update dependencies
cd backend && npm update
cd ../frontend && npm update
cd ../game-service && npm update
```

## Next Steps

Congratulations! You now have Flashpoint Web running locally. Here's what to explore next:

### 1. Create a User Account

If authentication is enabled:

1. Navigate to `http://localhost:5173`
2. Click "Register" or "Login"
3. Create an admin account (first user is typically admin)
4. Log in with your credentials

### 2. Browse Games

1. Go to the **Browse** view
2. Explore filtering options:
   - Platform (Flash, HTML5, Shockwave, etc.)
   - Developer, Publisher
   - Tags, Series
   - Release year
3. Try the search function
4. Switch between grid and list view modes

### 3. Play a Game

1. Find a Flash or HTML5 game
2. Click the "Play" button
3. The game should load in the player
4. Try fullscreen mode

### 4. Customize Theme

1. Go to **Settings**
2. Browse through 22+ color themes
3. Toggle between dark and light modes
4. Changes persist in localStorage

### 5. Explore Features

- **Playlists**: Create custom game collections
- **Favorites**: Mark games you like
- **Play Tracking**: View your play history and statistics
- **Search**: Advanced search with multiple filters

## Development Workflow

### Making Changes

#### Backend Changes

1. Edit files in `backend/src/`
2. The dev server (tsx) automatically restarts on file changes
3. Test your changes via API endpoints or frontend

#### Frontend Changes

1. Edit files in `frontend/src/`
2. Vite HMR updates the browser instantly (no refresh needed)
3. Check browser console for errors

#### Game Service Changes

1. Edit files in `game-service/src/`
2. The dev server restarts automatically
3. Test game loading in the frontend player

### Type Checking

Run TypeScript compiler without building:

```bash
# All services
npm run typecheck

# Individual services
cd backend && npm run typecheck
cd frontend && npm run typecheck
cd game-service && npm run typecheck
```

### Linting

Check code quality:

```bash
# Backend
cd backend && npm run lint

# Frontend
cd frontend && npm run lint
```

### Building for Production

```bash
# Build all services
npm run build

# Individual builds
npm run build:backend
npm run build:frontend
npm run build:game-service
```

Build outputs:
- Backend: `backend/dist/`
- Frontend: `frontend/dist/`
- Game Service: `game-service/dist/`

### Running Production Builds

```bash
# Backend
cd backend && npm start

# Game Service
cd game-service && npm start

# Frontend (requires a static file server)
cd frontend && npm run preview
# Or use any static file server:
# npx serve -s dist
```

## Docker Development

### Building Docker Images

```bash
# Build all services
docker-compose build

# Build specific service
docker-compose build backend
```

### Running with Docker Compose

```bash
# Set Flashpoint path (Windows)
set FLASHPOINT_HOST_PATH=D:/Flashpoint

# Set Flashpoint path (Linux/macOS)
export FLASHPOINT_HOST_PATH=/path/to/Flashpoint

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Access Dockerized Services

- Frontend: `http://localhost:80`
- Backend API: `http://localhost:3100`
- Game Proxy: `http://localhost:22500`
- GameZip: `http://localhost:22501`

## Additional Resources

### Documentation

- [Project Overview](project-overview.md) - High-level overview
- [Architecture Overview](architecture-overview.md) - System architecture
- [Technology Stack](technology-stack.md) - Detailed technology choices
- [Backend Guide](../02-backend/overview.md) - Backend development
- [Frontend Guide](../03-frontend/overview.md) - Frontend development
- [API Reference](../05-api/overview.md) - REST API documentation

### External Resources

- [Flashpoint Archive](https://flashpointarchive.org/) - Official preservation project
- [Ruffle Documentation](https://ruffle.rs/) - Flash emulator
- [React Documentation](https://react.dev/) - Frontend framework
- [Express Documentation](https://expressjs.com/) - Backend framework

### Community

- GitHub Issues - Bug reports and feature requests
- Discussions - Questions and community support
- Contributing Guide - How to contribute to the project

## Summary

You've successfully set up Flashpoint Web for development! Here's what you accomplished:

✅ Installed Node.js, npm, and Git
✅ Cloned the repository
✅ Installed dependencies for all services
✅ Configured backend and game service with Flashpoint paths
✅ Started all three services in development mode
✅ Verified the application is working

**Quick Start Commands**:

```bash
# Start development servers
npm run dev

# Type check all services
npm run typecheck

# Build for production
npm run build
```

**Access Points**:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3100`
- API Health: `http://localhost:3100/health`

Happy coding! If you encounter any issues not covered in this guide, please check the troubleshooting section or consult the detailed documentation in other sections.
