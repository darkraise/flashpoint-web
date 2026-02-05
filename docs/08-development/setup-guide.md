# Development Setup Guide

Complete guide to setting up Flashpoint Web development environment.

## Prerequisites

### Required Software

**Node.js v20.0.0+**

```bash
node --version  # Verify
nvm install 20 && nvm use 20  # Install with nvm
```

**npm v9.0.0+** (included with Node.js)

```bash
npm --version  # Verify
```

**Git**

```bash
git --version  # Verify
```

**Flashpoint Archive**

- Download from [flashpointarchive.org](https://flashpointarchive.org/)
- Default path: `D:\Flashpoint` (Windows) or `~/Flashpoint` (Linux/Mac)
- Verify: `ls D:/Flashpoint/Data/flashpoint.sqlite`

---

## Initial Setup

### 1. Clone Repository

```bash
git clone https://github.com/darkraise/flashpoint-web.git
cd flashpoint-web
```

### 2. Install Dependencies

```bash
npm run install:all

# This runs npm install in root, backend/, frontend/, and game-service/
```

### 3. Configure Backend

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```bash
FLASHPOINT_PATH=D:/Flashpoint
JWT_SECRET=change-this-in-production

# Optional
DOMAIN=http://localhost:5173
GAME_SERVICE_HOST=localhost
LOG_LEVEL=info
NODE_ENV=development
```

**Note:** All paths (database, images, logos, htdocs, games) are automatically
derived from `FLASHPOINT_PATH`.

### 4. Configure Game Service

```bash
cd game-service
cp .env.example .env
```

Edit `game-service/.env`:

```bash
FLASHPOINT_PATH=D:/Flashpoint
LOG_LEVEL=info
EXTERNAL_FALLBACK_URLS=http://infinity.flashpointarchive.org/Flashpoint/Legacy/htdocs
```

### 5. Verify Setup

```bash
npm run typecheck   # Type check all services
npm run build       # Build all services
```

---

## Start Development

### Option A: All Services Together

```bash
npm run dev

# Expected output:
# [backend]     Server running on port 3100
# [frontend]    Local: http://localhost:5173/
# [game-service] Proxy: http://localhost:22500, GameZip: http://localhost:22501
```

### Option B: Individual Services

```bash
# Terminal 1: Backend
npm run dev:backend

# Terminal 2: Frontend
npm run dev:frontend

# Terminal 3: Game Service
npm run dev:game-service
```

### Verify Services

```bash
# Backend
curl http://localhost:3100/health  # Should return {"status":"ok"}

# Frontend
# Open http://localhost:5173 in browser

# Game Service
curl http://localhost:22500/health
```

---

## Test Basic Functionality

1. Open http://localhost:5173
2. Browse games in library
3. Search for a game
4. Register a test user
5. Login
6. Try playing a Flash game

---

## IDE Setup (Optional)

### Visual Studio Code

**Install Recommended Extensions:**

- ESLint
- Prettier
- TypeScript Language Features
- Tailwind CSS IntelliSense
- REST Client
- SQLite Viewer

**Settings (.vscode/settings.json):**

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

**Debug Configuration (.vscode/launch.json):** See
[Debugging Guide](./debugging.md) for complete setup.

### WebStorm/IntelliJ

1. Set Node interpreter to Node 20+
2. Enable ESLint (File > Settings > ESLint)
3. Create run configurations for backend, frontend, game-service

---

## Before First Commit

```bash
npm run typecheck        # Check types
npm run build            # Build all
cd backend && npm run lint && npm test  # Lint and test
```

---

## Troubleshooting

### Port Already in Use

```bash
cd backend
npm run kill-port  # Windows utility
```

### Database Not Found

```bash
# Verify Flashpoint path
ls D:/Flashpoint/Data/flashpoint.sqlite

# Check backend/.env
cat backend/.env | grep FLASHPOINT_PATH
```

### Dependencies Won't Install

```bash
npm cache clean --force
npm run clean
npm run install:all
```

### Ruffle Not Loading

```bash
cd frontend
npm run copy-ruffle

# Verify files exist
ls public/ruffle/
```

See [Common Pitfalls](./common-pitfalls.md) for more issues.

---

## Environment Variables Reference

### Backend (.env)

| Variable            | Required | Default               |
| ------------------- | -------- | --------------------- |
| `FLASHPOINT_PATH`   | Yes      | -                     |
| `JWT_SECRET`        | Yes\*    | -                     |
| `DOMAIN`            | No       | http://localhost:5173 |
| `GAME_SERVICE_HOST` | No       | localhost             |
| `LOG_LEVEL`         | No       | info                  |
| `NODE_ENV`          | No       | development           |

### Game Service (.env)

| Variable                 | Required | Default |
| ------------------------ | -------- | ------- |
| `FLASHPOINT_PATH`        | Yes      | -       |
| `LOG_LEVEL`              | No       | info    |
| `EXTERNAL_FALLBACK_URLS` | No       | -       |

### Frontend

No environment variables required for local development.

---

## Next Steps

1. Read [Project Structure](./project-structure.md)
2. Read [Commands Reference](./commands.md)
3. Read [Coding Standards](./coding-standards.md)
4. Read [Common Pitfalls](./common-pitfalls.md)
5. Start making contributions!

---

## Development Checklist

- [ ] Node.js 20+ installed
- [ ] npm 9+ installed
- [ ] Flashpoint Archive installed
- [ ] Repository cloned
- [ ] Dependencies installed (`npm run install:all`)
- [ ] Backend .env configured
- [ ] Game Service .env configured
- [ ] All services type check pass (`npm run typecheck`)
- [ ] All services build successfully (`npm run build`)
- [ ] Backend starts successfully
- [ ] Frontend accessible at http://localhost:5173
- [ ] Game Service running
- [ ] Can browse and play games

---

## Additional Resources

- [Commands Reference](./commands.md)
- [Debugging Guide](./debugging.md)
- [Testing Guide](./testing-guide.md)
- [Coding Standards](./coding-standards.md)
- [Common Pitfalls](./common-pitfalls.md)
