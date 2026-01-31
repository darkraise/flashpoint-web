# Development Documentation

This directory contains comprehensive documentation for developers working on the Flashpoint Web application.

## Contents

1. **[Setup Guide](./setup-guide.md)** - Complete development environment setup
2. **[Commands Reference](./commands.md)** - All npm commands for monorepo and services
3. **[Project Structure](./project-structure.md)** - Directory structure explained
4. **[Coding Standards](./coding-standards.md)** - TypeScript conventions and style guide
5. **[Testing Guide](./testing-guide.md)** - Testing approach and best practices
6. **[Debugging Guide](./debugging.md)** - Debugging tips and troubleshooting
7. **[Common Pitfalls](./common-pitfalls.md)** - Known issues and solutions

## Quick Start

```bash
# Install dependencies for all services
npm run install:all

# Start all services in development mode
npm run dev

# Run type checking across all services
npm run typecheck

# Build all services for production
npm run build
```

## Development Workflow

1. **Initial Setup**: Follow the [Setup Guide](./setup-guide.md)
2. **Learn Commands**: Review [Commands Reference](./commands.md)
3. **Understand Structure**: Read [Project Structure](./project-structure.md)
4. **Follow Standards**: Apply [Coding Standards](./coding-standards.md)
5. **Write Tests**: Use [Testing Guide](./testing-guide.md)
6. **Debug Issues**: Reference [Debugging Guide](./debugging.md)
7. **Avoid Pitfalls**: Check [Common Pitfalls](./common-pitfalls.md)

## Architecture Overview

The project is a monorepo with three independent services:

- **Backend** (port 3100): REST API with Express + TypeScript
- **Frontend** (port 5173): React SPA with Vite + TypeScript
- **Game Service** (ports 22500, 22501): Game content proxy and ZIP server

Each service can be developed, tested, and deployed independently.

## Getting Help

- Review existing documentation in this directory
- Check the main [CLAUDE.md](../../CLAUDE.md) for project overview
- Consult service-specific docs in `docs/03-backend`, `docs/04-frontend`, and `docs/05-game-service`
- Review architecture documentation in `docs/02-architecture`

## Contributing

When adding new features or fixing bugs:

1. Follow the coding standards outlined in this documentation
2. Write tests for new functionality
3. Update relevant documentation
4. Ensure all type checks pass (`npm run typecheck`)
5. Verify no build errors (`npm run build`)
