# Flashpoint Web

<div align="center">

**A modern web interface for the Flashpoint Archive**

Browse and play 200,000+ preserved Flash games and animations directly in your
browser.

<!-- Tech Stack Badges -->
<p>
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
</p>

<!-- Project Badges -->
<p>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-GPL--3.0-blue?style=flat-square" alt="License" /></a>
  <img src="https://img.shields.io/badge/Node.js-20%2B-339933?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node.js 20+" />
  <img src="https://img.shields.io/badge/PRs-Welcome-brightgreen?style=flat-square" alt="PRs Welcome" />
</p>

[Features](#key-features) | [Quick Start](#quick-start) |
[Docker](#docker-deployment) | [Documentation](#documentation) |
[Contributing](#contributing)

</div>

---

## What is Flashpoint Web?

Flashpoint Web is a self-hosted web application for accessing your local
[Flashpoint Archive](https://flashpointarchive.org/) collection. It provides a
modern, browser-based alternative to the Flashpoint Launcher with multi-user
support, play tracking, and an intuitive interface.

### Key Features

- **Browse & Search** - Fast search across 200,000+ games with advanced
  filtering by platform, developer, tags, and more
- **Play in Browser** - Flash games via [Ruffle](https://ruffle.rs/) emulator,
  HTML5 games natively
- **Multi-User Support** - Individual accounts with role-based permissions
  (admin, moderator, user, guest)
- **Play Tracking** - Track playtime, completion status, and view play
  statistics
- **Playlists & Favorites** - Organize your game collection with custom
  playlists
- **22 Theme Palettes** - Customizable dark/light modes with multiple color
  schemes
- **Responsive Design** - Works on desktop and mobile devices
- **Database Hot-Reload** - Automatically syncs when Flashpoint Launcher updates
  metadata

## Architecture

Flashpoint Web consists of two independent services:

| Service      | Port | Description                                                     |
| ------------ | ---- | --------------------------------------------------------------- |
| **Backend**  | 3100 | REST API for metadata, users, auth, and game content serving   |
| **Frontend** | 5173 | React web application                                           |

Game content is served directly by the backend via `/game-proxy/*` and
`/game-zip/*` routes, enabling efficient file serving and ZIP archive mounting.

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 20+ and npm 9+
- [Flashpoint Archive](https://flashpointarchive.org/) installed locally

### Installation

```bash
# Clone the repository
git clone https://github.com/darkraise/flashpoint-web.git
cd flashpoint-web

# Install dependencies for all services
npm run install:all
```

### Configuration

**1. Backend** (`backend/.env`)

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```env
# Required
FLASHPOINT_PATH=D:/Flashpoint
JWT_SECRET=your-secure-random-string

# Optional
DOMAIN=http://localhost:5173
LOG_LEVEL=info
```

> **Note:** All database, asset, and game content paths are automatically
> derived from `FLASHPOINT_PATH`. Frontend requires no `.env` file for local
> development - API calls are proxied through Vite.

### Run Development Servers

```bash
# Start all services concurrently
npm run dev

# Or start individually
npm run dev:backend  # http://localhost:3100
npm run dev:frontend # http://localhost:5173
```

Open http://localhost:5173 in your browser.

## Docker Deployment

For production or easier setup, use Docker Compose:

```bash
# Set required environment variables
export FLASHPOINT_HOST_PATH=/path/to/Flashpoint  # Linux/Mac
export JWT_SECRET="your-secure-secret-key"       # Required for auth

# Windows PowerShell
$env:FLASHPOINT_HOST_PATH="D:\Flashpoint"
$env:JWT_SECRET="your-secure-secret-key"

# Start all services (uses pre-built images)
docker compose up -d

# Or build locally for development
docker compose -f docker-compose.dev.yml up -d --build

# View logs
docker compose logs -f
```

**Default ports:**

| Service | URL |
| --- | --- |
| Frontend | http://localhost (port 80) |
| Backend API | http://localhost:3100 |
| Game Content Routes | http://localhost:3100/game-proxy/* and /game-zip/* |

See [Docker Deployment Guide](docs/09-deployment/docker-deployment.md) for
advanced configuration.

## Development Commands

| Command             | Description                             |
| ------------------- | --------------------------------------- |
| `npm run dev`       | Start all services in development mode  |
| `npm run build`     | Build all services for production       |
| `npm run typecheck` | Run TypeScript type checking            |
| `npm run format`    | Format code with Prettier               |
| `npm run clean`     | Remove build artifacts and node_modules |

See [Commands Reference](docs/08-development/commands.md) for the complete list.

## Documentation

Comprehensive documentation is available in the [`docs/`](docs/) directory:

### Getting Started

- [Project Overview](docs/01-overview/project-overview.md) - What is Flashpoint
  Web
- [Setup Guide](docs/08-development/setup-guide.md) - Complete development setup
- [Commands Reference](docs/08-development/commands.md) - All available commands

### Architecture

- [System Architecture](docs/02-architecture/system-architecture.md) - Service
  design overview
- [Authentication Flow](docs/02-architecture/authentication-flow.md) - JWT-based
  auth system
- [Game Launch Flow](docs/02-architecture/game-launch-flow.md) - How games are
  served

### Services

- [Backend](docs/03-backend/README.md) - REST API documentation
- [Frontend](docs/04-frontend/README.md) - React application guide
- [Game Service](docs/05-game-service/README.md) - File serving architecture

### API Reference

- [Authentication API](docs/06-api-reference/authentication-api.md)
- [Games API](docs/06-api-reference/games-api.md)
- [Playlists API](docs/06-api-reference/playlists-api.md)
- [Full API Reference](docs/06-api-reference/README.md)

### Deployment

- [Docker Deployment](docs/09-deployment/docker-deployment.md)
- [Production Setup](docs/09-deployment/production-setup.md)
- [Environment Variables](docs/08-development/setup-guide.md#environment-variables-reference)

### Features

- [Authentication & Authorization](docs/10-features/01-authentication-authorization.md)
- [Game Browsing & Filtering](docs/10-features/02-game-browsing-filtering.md)
- [Play Session Tracking](docs/10-features/04-play-session-tracking.md)
- [All Features](docs/10-features/README.md)

## Technology Stack

<table>
<tr>
<td align="center" width="33%">

### Backend

<p>
  <img src="https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
</p>

- Express 4.18
- BetterSqlite3 12.6
- JWT + bcrypt
- Winston logging
- Zod validation

</td>
<td align="center" width="33%">

### Frontend

<p>
  <img src="https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind" />
</p>

- React 18.3 + TypeScript
- TanStack Query 5.28
- Zustand 4.5
- Shadcn UI + Radix
- Ruffle Flash Emulator

</td>
</tr>
</table>

See [Technology Stack](docs/01-overview/technology-stack.md) for detailed
explanations of each choice.

## Troubleshooting

### Common Issues

**Port already in use:**

```bash
# Find and kill process on port
lsof -i :3100  # Linux/Mac
netstat -ano | findstr :3100  # Windows
```

**Database not found:**

- Verify `FLASHPOINT_PATH` points to a valid Flashpoint installation
- Check that `$FLASHPOINT_PATH/Data/flashpoint.sqlite` exists

**Ruffle not loading:**

```bash
cd frontend
npm run copy-ruffle
```

**Games not loading:**

- Ensure backend is running on port 3100
- Check backend logs: `npm run dev:backend`
- Verify game content routes are accessible at `/game-proxy/*` and `/game-zip/*`

See [Common Pitfalls](docs/08-development/common-pitfalls.md) for more
solutions.

## Contributing

We welcome contributions! Here's how to get started:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Make** your changes and ensure tests pass: `npm run typecheck`
4. **Commit** your changes following our
   [commit guidelines](CONTRIBUTING.md#commit-guidelines)
5. **Push** to the branch: `git push origin feature/amazing-feature`
6. **Open** a Pull Request

Please read our [Contributing Guide](CONTRIBUTING.md) for detailed instructions,
coding standards, and development setup.

## Related Projects

- [Flashpoint Archive](https://flashpointarchive.org/) - The game preservation
  project
- [Flashpoint Launcher](https://github.com/FlashpointProject/launcher) -
  Official desktop launcher
- [Ruffle](https://ruffle.rs/) - Flash Player emulator

## License

This project is licensed under the GNU General Public License v3.0 - see the
[LICENSE](LICENSE) file for details.

## Acknowledgments

- **Flashpoint Team** - For preserving web gaming history
- **Ruffle Contributors** - For making Flash playable in modern browsers
- **Community** - For testing, feedback, and contributions

---

<div align="center">

**[Documentation](docs/)** |
**[Report Bug](https://github.com/darkraise/flashpoint-web/issues)** |
**[Request Feature](https://github.com/darkraise/flashpoint-web/issues)**

</div>
