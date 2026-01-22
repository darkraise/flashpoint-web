# Flashpoint Web Backend

Node.js/Express API server for the Flashpoint Archive web application.

## Features

- RESTful API for game metadata
- Direct SQLite database access (read-only)
- Proxy to Flashpoint Game Server
- Image and logo serving
- Playlist management
- Platform and tag endpoints

## Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Start development server
npm run dev
```

Server runs on http://localhost:3100

## API Endpoints

See `../../api-specification.md` for complete API documentation.

### Core Endpoints

- `GET /health` - Health check
- `GET /api/games` - List games
- `GET /api/games/:id` - Get game details
- `GET /api/platforms` - List platforms
- `GET /api/tags` - List tags
- `GET /api/playlists` - List playlists

## Architecture

```
src/
├── routes/          # Express route handlers
├── services/        # Business logic layer
├── middleware/      # Express middleware
├── utils/           # Helper functions
├── config.ts        # Configuration management
└── server.ts        # Application entry point
```

## Database

Uses sql.js (pure JavaScript SQLite) for direct read-only access to:
- `D:\Flashpoint\Data\flashpoint.sqlite`

**No native compilation required!** sql.js is a WebAssembly-based SQLite implementation that works without Visual Studio or build tools.

Schema includes tables for games, platforms, tags, and more.

## Development

```bash
npm run dev        # Start with hot reload (tsx)
npm run build      # Compile TypeScript
npm run start      # Run compiled version
npm run typecheck  # Type checking only
npm run lint       # ESLint
```

## Environment Variables

Required:
- `FLASHPOINT_PATH` - Path to Flashpoint installation
- `FLASHPOINT_DB_PATH` - Path to SQLite database

Optional:
- `PORT` - Server port (default: 3100)
- `NODE_ENV` - Environment (development/production)
- `GAME_SERVER_URL` - Game Server URL (default: http://localhost:22500)
- `CORS_ORIGIN` - Frontend origin (default: http://localhost:5173)

See `.env.example` for all options.
