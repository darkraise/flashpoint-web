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

## Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and
  [Docker Compose](https://docs.docker.com/compose/install/)
- [Flashpoint Archive](https://flashpointarchive.org/) installed locally

### 1. Create a project directory

```bash
mkdir flashpoint-web && cd flashpoint-web
```

### 2. Create `docker-compose.yml`

<!-- prettier-ignore -->
```yaml
services:
  backend:
    image: darkraise/flashpoint-backend:${IMAGE_TAG:-latest}
    container_name: flashpoint-backend
    restart: unless-stopped
    ports:
      - "${API_PORT:-3100}:3100"
    volumes:
      - ${FLASHPOINT_HOST_PATH:?FLASHPOINT_HOST_PATH is required}:/data/flashpoint:ro
      - ${DATA_PATH:-./data}:/app/data
      - ${LOGS_PATH:-./logs}:/app/logs
    environment:
      - PUID=${PUID:-1000}
      - PGID=${PGID:-1000}
      - NODE_ENV=production
      - TZ=${TZ:-UTC}
      - DOMAIN=${DOMAIN:-http://localhost:${WEB_PORT:-80}}
      - LOG_LEVEL=${LOG_LEVEL:-info}
      - JWT_SECRET=${JWT_SECRET:?JWT_SECRET is required}
      - ENABLE_LOCAL_DB_COPY=${ENABLE_LOCAL_DB_COPY:-false}
      - SQLITE_CACHE_SIZE=${SQLITE_CACHE_SIZE:--64000}
      - SQLITE_MMAP_SIZE=${SQLITE_MMAP_SIZE:-268435456}
      - ENABLE_CACHE_PREWARM=${ENABLE_CACHE_PREWARM:-true}
    healthcheck:
      test: ["CMD", "curl", "--fail", "http://localhost:3100/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  frontend:
    image: darkraise/flashpoint-frontend:${IMAGE_TAG:-latest}
    container_name: flashpoint-frontend
    restart: unless-stopped
    ports:
      - "${WEB_PORT:-80}:8080"
    environment:
      - PUID=${PUID:-1000}
      - PGID=${PGID:-1000}
      - TZ=${TZ:-UTC}
      - BACKEND_HOST=${BACKEND_HOST:-backend}
      - BACKEND_PORT=${BACKEND_PORT:-3100}
    depends_on:
      backend:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--spider", "http://localhost:8080/"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 10s
```

### 3. Create `.env`

```env
# Required — path to your Flashpoint installation on the host machine
FLASHPOINT_HOST_PATH=/path/to/Flashpoint

# Required — secret key for JWT authentication (use a long random string)
JWT_SECRET=your-secure-secret-key

# Optional — uncomment and edit as needed
# WEB_PORT=80              # Frontend port (default: 80)
# API_PORT=3100            # Backend API port (default: 3100)
# PUID=1000                # Host user ID (Linux — run 'id -u')
# PGID=1000                # Host group ID (Linux — run 'id -g')
# DOMAIN=http://localhost  # Public URL of the frontend
# LOG_LEVEL=info           # debug, info, warn, error
# TZ=UTC                   # Timezone
# DATA_PATH=./data         # Persistent app data
# LOGS_PATH=./logs         # Log files

# Database performance (for network storage / large collections)
# ENABLE_LOCAL_DB_COPY=false       # Copy flashpoint.sqlite to local storage
# SQLITE_CACHE_SIZE=-64000         # SQLite cache in KB (64MB default)
# SQLITE_MMAP_SIZE=268435456       # Memory-mapped I/O in bytes (256MB default)
# ENABLE_CACHE_PREWARM=true        # Pre-warm common queries on startup
```

### 4. Start the services

```bash
docker compose up -d
```

Open **http://localhost** in your browser. The first user to register
automatically becomes the **admin**.

### Default Ports

| Service  | URL                   |
| -------- | --------------------- |
| Frontend | http://localhost      |
| Backend  | http://localhost:3100 |

### Common Commands

```bash
docker compose up -d                # Start services
docker compose down                 # Stop services
docker compose logs -f              # View logs
docker compose logs -f backend      # Logs for a specific service
docker compose restart backend      # Restart a service
docker compose pull && docker compose up -d  # Update to latest images
```

## Documentation

For architecture details, API reference, development setup, contributing
guidelines, and more, visit the
**[Wiki](https://github.com/darkraise/flashpoint-web/wiki)**.

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

**[Wiki](https://github.com/darkraise/flashpoint-web/wiki)** |
**[Report Bug](https://github.com/darkraise/flashpoint-web/issues)** |
**[Request Feature](https://github.com/darkraise/flashpoint-web/issues)**

</div>
