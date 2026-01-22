# Development Setup Guide

Complete guide to setting up the Flashpoint Web development environment.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Service Configuration](#service-configuration)
- [Verification](#verification)
- [IDE Setup](#ide-setup)
- [Optional Tools](#optional-tools)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

**1. Node.js (v20.0.0 or higher)**

Check if installed:
```bash
node --version
```

Installation:
- **Linux/Mac**: Use [nvm](https://github.com/nvm-sh/nvm)
  ```bash
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
  nvm install 20
  nvm use 20
  ```

- **Windows**: Use [nvm-windows](https://github.com/coreybutler/nvm-windows) or download from [nodejs.org](https://nodejs.org/)
  ```cmd
  nvm install 20.0.0
  nvm use 20.0.0
  ```

**2. npm (v9.0.0 or higher)**

Included with Node.js. Verify:
```bash
npm --version
```

Update if needed:
```bash
npm install -g npm@latest
```

**3. Git**

Check if installed:
```bash
git --version
```

Installation:
- **Linux**: `sudo apt-get install git`
- **Mac**: `brew install git` or install Xcode Command Line Tools
- **Windows**: Download from [git-scm.com](https://git-scm.com/)

**4. Flashpoint Archive**

Download and install Flashpoint from [flashpointarchive.org](https://flashpointarchive.org/)

Recommended installation path:
- **Windows**: `D:\Flashpoint`
- **Linux/Mac**: `~/Flashpoint` or `/opt/flashpoint`

Verify installation:
```bash
# Windows
dir D:\Flashpoint\Data\flashpoint.sqlite

# Linux/Mac
ls ~/Flashpoint/Data/flashpoint.sqlite
```

---

## Initial Setup

### 1. Clone Repository

```bash
# Clone the repository
git clone https://github.com/your-username/flashpoint-web.git

# Navigate to project directory
cd flashpoint-web

# Verify structure
ls -la
# Should see: backend/, frontend/, game-service/, docs/, package.json
```

### 2. Install Dependencies

```bash
# Install dependencies for all services
npm run install:all

# This runs:
# - npm install (root)
# - npm install in backend/
# - npm install in frontend/
# - npm install in game-service/
```

**Expected output:**
```
Installing backend dependencies...
Installing frontend dependencies...
Installing game-service dependencies...
All dependencies installed successfully!
```

**If errors occur**, see [Troubleshooting](#troubleshooting).

---

## Service Configuration

### Backend Configuration

**1. Create environment file:**

```bash
cd backend
cp .env.example .env
```

**2. Edit `.env` file:**

```bash
# Windows paths (use forward slashes or escaped backslashes)
FLASHPOINT_PATH=D:/Flashpoint
FLASHPOINT_DB_PATH=D:/Flashpoint/Data/flashpoint.sqlite
FLASHPOINT_HTDOCS_PATH=D:/Flashpoint/Legacy/htdocs
FLASHPOINT_IMAGES_PATH=D:/Flashpoint/Data/Images
FLASHPOINT_LOGOS_PATH=D:/Flashpoint/Data/Logos
FLASHPOINT_PLAYLISTS_PATH=D:/Flashpoint/Data/Playlists
FLASHPOINT_GAMES_PATH=D:/Flashpoint/Data/Games

# Linux/Mac paths
# FLASHPOINT_PATH=/home/user/Flashpoint
# FLASHPOINT_DB_PATH=/home/user/Flashpoint/Data/flashpoint.sqlite
# ... etc

# Game service URLs
GAME_SERVICE_PROXY_URL=http://localhost:22500
GAME_SERVICE_GAMEZIP_URL=http://localhost:22501

# Server configuration
PORT=3100
CORS_ORIGIN=http://localhost:5173

# JWT secret (change in production!)
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Logging
LOG_LEVEL=info
```

**3. Verify paths:**

```bash
# Test that paths are accessible
ls $FLASHPOINT_DB_PATH

# Windows CMD
dir %FLASHPOINT_DB_PATH%

# Windows PowerShell
Test-Path $env:FLASHPOINT_DB_PATH
```

### Frontend Configuration

**1. Create environment file:**

```bash
cd frontend
cp .env.example .env
```

**2. Edit `.env` file:**

```bash
# Backend API URL
VITE_API_URL=http://localhost:3100
```

### Game Service Configuration

**1. Create environment file:**

```bash
cd game-service
cp .env.example .env
```

**2. Edit `.env` file:**

```bash
# Server ports
PROXY_PORT=22500
GAMEZIPSERVER_PORT=22501

# Flashpoint paths (must match backend)
FLASHPOINT_PATH=D:/Flashpoint
FLASHPOINT_HTDOCS_PATH=D:/Flashpoint/Legacy/htdocs
FLASHPOINT_GAMES_PATH=D:/Flashpoint/Data/Games

# External fallback CDNs
EXTERNAL_FALLBACK_URLS=http://infinity.flashpointarchive.org/Flashpoint/Legacy/htdocs,http://infinity.unstable.life/Flashpoint/Legacy/htdocs/

# Logging
LOG_LEVEL=info
```

---

## Verification

### 1. Type Check All Services

```bash
# From repository root
npm run typecheck

# Expected output:
# Backend: No errors
# Frontend: No errors
# Game Service: No errors
```

### 2. Build All Services

```bash
# From repository root
npm run build

# Expected output:
# Backend: Built successfully
# Frontend: Built successfully
# Game Service: Built successfully
```

### 3. Start Development Servers

**Option A: Start all services together (recommended)**

```bash
# From repository root
npm run dev

# Expected output (with colors):
# [backend]     Server running on port 3100
# [frontend]    Local: http://localhost:5173/
# [game-service] Proxy server: http://localhost:22500
# [game-service] GameZip server: http://localhost:22501
```

**Option B: Start services individually**

```bash
# Terminal 1: Backend
npm run dev:backend

# Terminal 2: Frontend
npm run dev:frontend

# Terminal 3: Game Service
npm run dev:game-service
```

### 4. Verify Services Running

**Backend:**
```bash
curl http://localhost:3100/health
# Expected: {"status":"ok"}
```

**Frontend:**
```bash
# Open browser to http://localhost:5173
# Should see Flashpoint Web interface
```

**Game Service:**
```bash
curl http://localhost:22500/health
# Expected: {"status":"ok"}
```

### 5. Test Basic Functionality

1. **Open Frontend**: Navigate to http://localhost:5173
2. **Browse Games**: Should see game library
3. **Search**: Try searching for a game
4. **View Game Details**: Click on a game
5. **Create Account**: Register a test user
6. **Login**: Log in with test user
7. **Play Game**: Try playing a Flash game (requires Ruffle)

---

## IDE Setup

### Visual Studio Code (Recommended)

**1. Install VS Code:**
- Download from [code.visualstudio.com](https://code.visualstudio.com/)

**2. Install Recommended Extensions:**

```json
// .vscode/extensions.json (create if missing)
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense",
    "usernamehw.errorlens",
    "alexcvzz.vscode-sqlite"
  ]
}
```

**3. Configure Settings:**

```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "files.associations": {
    "*.css": "tailwindcss"
  },
  "tailwindCSS.experimental.classRegex": [
    ["clsx\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ]
}
```

**4. Setup Debug Configuration:**

See [Debugging Guide](./debugging.md) for complete VS Code debug setup.

**5. Install TypeScript SDK:**

```bash
# In VS Code
# Press Ctrl+Shift+P
# Type: "TypeScript: Select TypeScript Version"
# Choose: "Use Workspace Version"
```

### WebStorm/IntelliJ IDEA

**1. Install IDE:**
- Download from [jetbrains.com](https://www.jetbrains.com/)

**2. Configure Node Interpreter:**
- File > Settings > Languages & Frameworks > Node.js
- Set Node interpreter to your Node 20+ installation

**3. Enable ESLint:**
- File > Settings > Languages & Frameworks > JavaScript > Code Quality Tools > ESLint
- Enable "Automatic ESLint configuration"

**4. Configure Run Configurations:**

Create run configurations for:
- Backend: `npm run dev` in `backend/`
- Frontend: `npm run dev` in `frontend/`
- Game Service: `npm run dev` in `game-service/`

---

## Optional Tools

### Database Management

**DB Browser for SQLite** (Free)
- Download from [sqlitebrowser.org](https://sqlitebrowser.org/)
- Use to inspect `flashpoint.sqlite` and `user.db`

**TablePlus** (Paid, better UX)
- Download from [tableplus.com](https://tableplus.com/)

### API Testing

**Postman**
- Download from [postman.com](https://www.postman.com/)
- Import API collection (if available)

**HTTPie** (CLI)
```bash
npm install -g httpie
http GET http://localhost:3100/api/games
```

### Git GUI

**GitKraken** (Recommended)
- Download from [gitkraken.com](https://www.gitkraken.com/)

**GitHub Desktop**
- Download from [desktop.github.com](https://desktop.github.com/)

### Docker (Optional)

If you want to run services in containers:

```bash
# Install Docker Desktop
# Download from docker.com

# Set Flashpoint path
export FLASHPOINT_HOST_PATH=/path/to/Flashpoint

# Build and start
docker-compose up -d

# View logs
docker-compose logs -f
```

---

## Troubleshooting

### Common Issues

**Issue: Port Already in Use**

```bash
# Find process using port
lsof -i :3100  # Linux/Mac
netstat -ano | findstr :3100  # Windows

# Kill process
kill -9 <PID>  # Linux/Mac
taskkill /PID <PID> /F  # Windows

# Or use backend utility
cd backend
npm run kill-port
```

**Issue: Database Not Found**

```bash
# Verify Flashpoint installation
ls D:/Flashpoint/Data/flashpoint.sqlite

# Check .env file
cat backend/.env | grep FLASHPOINT_DB_PATH

# Ensure path matches
```

**Issue: Dependencies Won't Install**

```bash
# Clear caches
npm cache clean --force

# Delete all node_modules
npm run clean

# Reinstall
npm run install:all

# If still fails
npm run install:all -- --legacy-peer-deps
```

**Issue: TypeScript Errors**

```bash
# Check for errors
npm run typecheck

# Update TypeScript
npm install -g typescript@latest

# Restart TypeScript server in VS Code
# Ctrl+Shift+P > "Restart TypeScript Server"
```

**Issue: Ruffle Not Loading**

```bash
# Copy Ruffle files
cd frontend
npm run copy-ruffle

# Verify files exist
ls public/ruffle/

# Should see: ruffle.js, ruffle.wasm, etc.
```

### Getting Help

1. Check [Common Pitfalls](./common-pitfalls.md)
2. Check [Debugging Guide](./debugging.md)
3. Review service-specific documentation:
   - [Backend Documentation](../03-backend/README.md)
   - [Frontend Documentation](../04-frontend/README.md)
   - [Game Service Documentation](../05-game-service/README.md)
4. Open an issue on GitHub

---

## Next Steps

After completing setup:

1. **Read Documentation**:
   - [Project Structure](./project-structure.md)
   - [Commands Reference](./commands.md)
   - [Coding Standards](./coding-standards.md)

2. **Explore Codebase**:
   - Review backend services
   - Explore frontend components
   - Understand game service architecture

3. **Make First Contribution**:
   - Pick a simple issue
   - Create a feature branch
   - Submit a pull request

4. **Setup Development Workflow**:
   - Configure Git hooks
   - Setup code formatters
   - Learn debugging tools

---

## Development Checklist

Use this checklist to verify your setup:

- [ ] Node.js 20+ installed
- [ ] npm 9+ installed
- [ ] Git installed
- [ ] Flashpoint Archive installed
- [ ] Repository cloned
- [ ] Dependencies installed (`npm run install:all`)
- [ ] Backend `.env` configured
- [ ] Frontend `.env` configured
- [ ] Game Service `.env` configured
- [ ] All services type check pass (`npm run typecheck`)
- [ ] All services build successfully (`npm run build`)
- [ ] Backend starts successfully (port 3100)
- [ ] Frontend starts successfully (port 5173)
- [ ] Game Service starts successfully (ports 22500, 22501)
- [ ] Can browse games in frontend
- [ ] Can register/login users
- [ ] Can play Flash games
- [ ] VS Code configured with extensions
- [ ] Debugger configured and working
- [ ] Git configured with user info

---

## Environment Variables Reference

### Backend (.env)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FLASHPOINT_PATH` | Yes | - | Path to Flashpoint installation |
| `FLASHPOINT_DB_PATH` | Yes | - | Path to flashpoint.sqlite |
| `FLASHPOINT_HTDOCS_PATH` | Yes | - | Path to htdocs folder |
| `FLASHPOINT_IMAGES_PATH` | Yes | - | Path to Images folder |
| `FLASHPOINT_LOGOS_PATH` | Yes | - | Path to Logos folder |
| `FLASHPOINT_PLAYLISTS_PATH` | Yes | - | Path to Playlists folder |
| `FLASHPOINT_GAMES_PATH` | Yes | - | Path to Games folder |
| `GAME_SERVICE_PROXY_URL` | Yes | - | Game service proxy URL |
| `GAME_SERVICE_GAMEZIP_URL` | Yes | - | Game service GameZip URL |
| `PORT` | No | 3100 | Backend server port |
| `CORS_ORIGIN` | Yes | - | Frontend URL for CORS |
| `JWT_SECRET` | No | auto | JWT signing secret |
| `JWT_EXPIRES_IN` | No | 7d | JWT expiration |
| `LOG_LEVEL` | No | info | Logging level |

### Frontend (.env)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | Yes | - | Backend API URL |

### Game Service (.env)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PROXY_PORT` | No | 22500 | Proxy server port |
| `GAMEZIPSERVER_PORT` | No | 22501 | GameZip server port |
| `FLASHPOINT_PATH` | Yes | - | Path to Flashpoint installation |
| `FLASHPOINT_HTDOCS_PATH` | Yes | - | Path to htdocs folder |
| `FLASHPOINT_GAMES_PATH` | Yes | - | Path to Games folder |
| `EXTERNAL_FALLBACK_URLS` | No | - | Comma-separated CDN URLs |
| `LOG_LEVEL` | No | info | Logging level |

---

## Additional Resources

- [Commands Reference](./commands.md)
- [Project Structure](./project-structure.md)
- [Coding Standards](./coding-standards.md)
- [Debugging Guide](./debugging.md)
- [Common Pitfalls](./common-pitfalls.md)
- [Main Documentation](../../CLAUDE.md)
