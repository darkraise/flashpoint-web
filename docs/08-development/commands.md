# Commands Reference

All npm commands available in Flashpoint Web monorepo.

## Monorepo Commands

Run from repository root.

### Development
```bash
npm run dev                 # Start all services (concurrent)
npm run dev:backend        # Backend only
npm run dev:frontend       # Frontend only
npm run dev:game-service   # Game service only
```

### Installation
```bash
npm run install:all        # Install all service dependencies
npm run install:backend    # Backend only
npm run install:frontend   # Frontend only
npm run install:game-service # Game service only
```

### Building
```bash
npm run build              # Build all services for production
npm run build:backend
npm run build:frontend
npm run build:game-service
```

### Type Checking
```bash
npm run typecheck          # Type check all services
npm run typecheck:backend
npm run typecheck:frontend
npm run typecheck:game-service
```

### Production
```bash
npm start                  # Start backend + game-service in production
npm run start:backend
npm run start:game-service
```

### Code Formatting
```bash
npm run format             # Format all files with Prettier
npm run format:check       # Check without changes
npm run format:backend
npm run format:frontend
npm run format:game-service
```

### Cleanup
```bash
npm run clean              # Remove all build artifacts + node_modules
npm run clean:backend
npm run clean:frontend
npm run clean:game-service
```

---

## Backend Commands

Run from `backend/` directory.

### Development
```bash
npm run dev                # Start with hot reload
npm run kill-port          # Kill process on port 3100 (Windows)
```

### Building & Production
```bash
npm run build              # Compile TypeScript to dist/
npm start                  # Run production build
```

### Code Quality
```bash
npm run typecheck          # Type check only
npm run lint               # Check code with ESLint
npm run lint -- --fix      # Auto-fix issues
```

### Testing
```bash
npm test                   # Run all tests
npm test -- --watch        # Watch mode
npm test -- --coverage     # With coverage report
npm test src/services/GameService.test.ts  # Specific file
npm test -- --grep "pattern"  # Pattern matching
```

---

## Frontend Commands

Run from `frontend/` directory.

### Development
```bash
npm run dev                # Start Vite dev server (http://localhost:5173)
```

### Building & Preview
```bash
npm run build              # Build for production (frontend/dist/)
npm run preview            # Preview production build locally (http://localhost:4173)
```

### Code Quality
```bash
npm run typecheck          # Type check only
npm run lint               # Check code with ESLint
npm run lint -- --fix      # Auto-fix issues
```

### Utilities
```bash
npm run copy-ruffle        # Copy Ruffle emulator to public/ruffle/
```

---

## Game Service Commands

Run from `game-service/` directory.

### Development
```bash
npm run dev                # Start with hot reload
                           # Proxy: http://localhost:22500
                           # GameZip: http://localhost:22501
```

### Building & Production
```bash
npm run build              # Compile TypeScript to dist/
npm start                  # Run production build
```

### Code Quality
```bash
npm run typecheck          # Type check only
```

---

## Docker Commands

Run from repository root.

### Building
```bash
docker-compose build                # Build all services
docker-compose build backend        # Specific service
docker-compose build --no-cache     # Clean build
```

### Running
```bash
docker-compose up -d                # Start all (background)
docker-compose up                   # Start all (foreground)
docker-compose up -d backend        # Start specific service
docker-compose up -d --build        # Rebuild and restart
```

### Monitoring & Management
```bash
docker-compose logs -f              # View all logs
docker-compose logs -f backend      # Specific service
docker-compose ps                   # List running containers
docker-compose stop                 # Stop all
docker-compose down                 # Stop and remove
docker-compose down -v --rmi all    # Full cleanup
docker-compose restart backend      # Restart specific service
docker-compose exec backend npm test # Run command in container
```

### Prerequisites
```bash
# Set Flashpoint path before running Docker
export FLASHPOINT_HOST_PATH=/path/to/Flashpoint

# Windows PowerShell
$env:FLASHPOINT_HOST_PATH = "D:\Flashpoint"
```

---

## Common Workflows

### First Time Setup
```bash
npm run install:all
cp backend/.env.example backend/.env
cp game-service/.env.example game-service/.env
# Edit .env files with Flashpoint path
npm run typecheck
npm run dev
```

### Before Committing
```bash
npm run typecheck
cd backend && npm run lint && npm test
npm run build
```

### Debugging Build Issues
```bash
npm run clean
npm run install:all
npm run typecheck
npm run build
```

### Production Deployment
```bash
npm run build
export NODE_ENV=production
npm start
```

---

## Environment Variables

### Backend (.env)
| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `FLASHPOINT_PATH` | Yes | - | All other paths derived automatically |
| `JWT_SECRET` | Yes* | - | *Required in production |
| `DOMAIN` | No | http://localhost:5173 | Frontend URL for CORS |
| `GAME_SERVICE_HOST` | No | localhost | Game service hostname |
| `LOG_LEVEL` | No | info | error, warn, info, debug |
| `NODE_ENV` | No | development | production in production |

### Game Service (.env)
| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `FLASHPOINT_PATH` | Yes | - | All other paths derived automatically |
| `LOG_LEVEL` | No | info | error, warn, info, debug |
| `EXTERNAL_FALLBACK_URLS` | No | - | Comma-separated CDN URLs |

### Frontend
No environment variables required for local development. In production, Nginx proxies to backend.

---

## Additional Resources

- [Project Structure](./project-structure.md)
- [Setup Guide](./setup-guide.md)
- [Debugging Guide](./debugging.md)
- [Common Pitfalls](./common-pitfalls.md)
