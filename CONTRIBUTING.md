# Contributing to Flashpoint Web

Thanks for your interest in contributing! We welcome bug fixes, features, documentation improvements, and questions.

## What is Flashpoint Web?

A self-hosted web application for browsing and playing games from [Flashpoint Archive](https://flashpointarchive.org/).

**Tech Stack:** Node.js 20+, Express, React 18, TypeScript, SQLite, TanStack Query, Tailwind CSS

## Table of Contents

- [Where to Start](#where-to-start)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Running Tests](#running-tests)
- [Making Changes](#making-changes)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Code Style](#code-style)
- [Reporting Bugs](#reporting-bugs)
- [License](#license)

## Where to Start

- Browse issues labeled [`good first issue`](../../labels/good%20first%20issue) or [`help wanted`](../../labels/help%20wanted)
- Check the [project documentation](docs/) for architecture and patterns

## Getting Started

```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/flashpoint-web.git
cd flashpoint-web

# Add upstream remote
git remote add upstream https://github.com/ORIGINAL_OWNER/flashpoint-web.git

# Keep your fork synced
git fetch upstream
git rebase upstream/master
```

## Development Setup

### Project Structure

```
backend/    # Express REST API + game content serving (:3100)
frontend/   # React + Vite application (:5173)
docs/       # Documentation
```

### Option 1: Docker

```bash
# Configure environment
cp .env.example .env
# Edit .env - set FLASHPOINT_HOST_PATH and JWT_SECRET (required)

# Build and start (development)
docker compose -f docker-compose.dev.yml up -d --build

# View logs
docker compose -f docker-compose.dev.yml logs -f

# Rebuild specific service
docker compose -f docker-compose.dev.yml up -d --build backend
```

Frontend runs on `http://localhost:80`, backend API on `http://localhost:3100`.

### Option 2: Manual Setup (Recommended for Development)

**Prerequisites:**
- Node.js 20+
- Flashpoint Archive installed locally

```bash
# Install dependencies
npm run install:all

# Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env - set FLASHPOINT_PATH to your Flashpoint installation

# Start development servers
npm run dev
```

Frontend runs on `http://localhost:5173`, backend on `http://localhost:3100`.

## Running Tests

```bash
# Run all tests
npm test

# Backend tests with coverage
cd backend && npm test -- --coverage

# Frontend tests
cd frontend && npm test
```

## Making Changes

### Branch Naming

```
feat/add-playlist-export
fix/game-search-pagination
refactor/auth-service
docs/update-api-reference
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

feat(games): add advanced search filters
fix(auth): resolve token refresh race condition
docs: update deployment guide
refactor(api): simplify error handling
```

**Types:** `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`

### Workflow

1. Create a branch from `master`
2. Make your changes
3. Run `npm run typecheck` and `npm test`
4. Update documentation if needed
5. Submit a pull request

## Submitting a Pull Request

### Before Submitting

```bash
git fetch upstream
git rebase upstream/master
npm run typecheck
npm run format
npm test
```

### PR Guidelines

- Keep PRs focused and reasonably sized
- Reference related issues (`Fixes #123`)
- Include a clear description of changes
- Update documentation for new features

## Code Style

See [CLAUDE.md](CLAUDE.md) for detailed coding standards. Key points:

- **TypeScript:** No `any` types, use `unknown` or proper interfaces
- **Backend:** Wrap async handlers with `asyncHandler()`, static routes before parameterized
- **Frontend:** Use `@/` imports, all API calls through `lib/api.ts`, use theme tokens
- **General:** Validate inputs, handle errors properly, clean up resources

Run `npm run format` before committing.

## Reporting Bugs

Before reporting, search [existing issues](../../issues) to avoid duplicates.

Include:
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Node version, browser)
- Screenshots or logs if applicable

## License

This project is licensed under [GPL-3.0](LICENSE). By contributing, you agree that your contributions will be licensed under the same license.
