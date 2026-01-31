# Development Documentation Index

Complete index of all development documentation for Flashpoint Web.

## Quick Links

- **Getting Started**: [Setup Guide](./setup-guide.md)
- **Daily Development**: [Commands Reference](./commands.md)
- **Understanding Code**: [Project Structure](./project-structure.md)
- **Writing Code**: [Coding Standards](./coding-standards.md)
- **Quality Assurance**: [Testing Guide](./testing-guide.md)
- **Problem Solving**: [Debugging Guide](./debugging.md)
- **Avoid Mistakes**: [Common Pitfalls](./common-pitfalls.md)

---

## Documentation Overview

### 1. Setup Guide
**File**: [setup-guide.md](./setup-guide.md)

**Purpose**: Complete development environment setup from scratch

**Contents**:
- Prerequisites (Node.js, Git, Flashpoint)
- Initial repository setup
- Service configuration (Backend, Frontend, Game Service)
- Environment variables
- Verification steps
- IDE setup (VS Code, WebStorm)
- Optional tools
- Troubleshooting

**When to use**:
- First time setting up project
- Onboarding new developers
- Setting up on new machine
- After major dependency updates

---

### 2. Commands Reference
**File**: [commands.md](./commands.md)

**Purpose**: Comprehensive reference for all npm commands

**Contents**:
- Monorepo commands (dev, build, typecheck, clean)
- Backend commands (development, testing, production)
- Frontend commands (Vite dev server, build, preview)
- Game Service commands
- Docker commands
- Common workflows
- Troubleshooting commands

**When to use**:
- Daily development tasks
- CI/CD pipeline setup
- Production deployment
- Quick command lookup

**Key Workflows**:
- Starting development: `npm run dev`
- Type checking: `npm run typecheck`
- Building for production: `npm run build`
- Running tests: `cd backend && npm test`

---

### 3. Project Structure
**File**: [project-structure.md](./project-structure.md)

**Purpose**: Comprehensive guide to codebase organization

**Contents**:
- Repository overview
- Backend structure (services, routes, middleware)
- Frontend structure (components, views, hooks, stores)
- Game Service structure
- Documentation structure
- Configuration files
- Import path aliases
- Build output structure

**When to use**:
- Learning the codebase
- Finding where to add new features
- Understanding file organization
- Code reviews

**Key Sections**:
- Service layer patterns
- Component organization
- State management strategy
- Database schema location

---

### 4. Coding Standards
**File**: [coding-standards.md](./coding-standards.md)

**Purpose**: Code quality and consistency guidelines

**Contents**:
- TypeScript standards (strict mode, type annotations)
- Naming conventions (files, variables, functions, classes)
- Code organization (imports, exports, file structure)
- ESLint configuration
- Comment standards
- Error handling patterns
- Backend standards (database, services, routes)
- Frontend standards (React, Tailwind, state)
- Git commit standards

**When to use**:
- Writing new code
- Code reviews
- Refactoring existing code
- Team onboarding

**Key Rules**:
- Use TypeScript strict mode
- Prefer explicit return types
- Avoid `any` type
- Use descriptive names
- Follow file naming conventions
- Write tests for business logic

---

### 5. Testing Guide
**File**: [testing-guide.md](./testing-guide.md)

**Purpose**: Testing approach and best practices

**Contents**:
- Testing philosophy (pyramid, coverage goals)
- Backend testing with Vitest
- Frontend testing (planned)
- Test organization
- Testing patterns (async, errors, timers)
- Mocking strategies
- Coverage goals
- CI/CD integration

**When to use**:
- Writing new features
- Bug fixes (regression tests)
- Refactoring code
- Setting up CI/CD

**Key Concepts**:
- Unit tests (70%) - Individual functions/classes
- Integration tests (20%) - Service interactions
- E2E tests (10%) - Critical user flows
- 80% coverage target
- Arrange-Act-Assert pattern

---

### 6. Debugging Guide
**File**: [debugging.md](./debugging.md)

**Purpose**: Debugging techniques and tools for all services

**Contents**:
- Development tools (VS Code, browser DevTools)
- Backend debugging (Node inspector, logging, database)
- Frontend debugging (React DevTools, API calls, state)
- Game Service debugging (proxy, ZIP files)
- Database debugging (SQLite tools, queries)
- Network debugging (CORS, requests)
- Performance debugging

**When to use**:
- Investigating bugs
- Performance issues
- Understanding code flow
- Learning debugging tools

**Key Tools**:
- VS Code debugger
- Chrome DevTools
- React Query DevTools
- Winston logger
- DB Browser for SQLite

---

### 7. Common Pitfalls
**File**: [common-pitfalls.md](./common-pitfalls.md)

**Purpose**: Known issues, gotchas, and solutions

**Contents**:
- Environment setup issues (paths, Node version)
- Database issues (locks, migrations, read-only)
- Port conflicts
- Authentication issues (JWT, CORS)
- Game Service issues (files not loading, Ruffle)
- Frontend build issues (types, HMR, Tailwind)
- Performance issues
- Development workflow issues

**When to use**:
- Encountering errors
- Stuck on a problem
- Before asking for help
- Quick troubleshooting

**Quick Reference Table**:
- Error message → Likely cause → Quick fix

---

## Documentation by Use Case

### For New Developers

**Day 1: Setup**
1. [Setup Guide](./setup-guide.md) - Complete environment setup
2. [Commands Reference](./commands.md) - Learn basic commands
3. [Project Structure](./project-structure.md) - Understand codebase

**Day 2-7: Learning**
1. [Coding Standards](./coding-standards.md) - Learn code style
2. [Testing Guide](./testing-guide.md) - Understand testing approach
3. [Debugging Guide](./debugging.md) - Learn debugging tools

**Ongoing: Reference**
1. [Common Pitfalls](./common-pitfalls.md) - Troubleshooting
2. [Commands Reference](./commands.md) - Command lookup

### For Feature Development

**Planning**:
1. [Project Structure](./project-structure.md) - Where to add code
2. [Coding Standards](./coding-standards.md) - How to write code

**Implementation**:
1. [Commands Reference](./commands.md) - Development workflow
2. [Debugging Guide](./debugging.md) - Testing locally

**Quality Assurance**:
1. [Testing Guide](./testing-guide.md) - Writing tests
2. [Coding Standards](./coding-standards.md) - Code review checklist

### For Bug Fixes

**Investigation**:
1. [Debugging Guide](./debugging.md) - Debugging techniques
2. [Common Pitfalls](./common-pitfalls.md) - Known issues

**Resolution**:
1. [Testing Guide](./testing-guide.md) - Regression tests
2. [Commands Reference](./commands.md) - Verification

### For Code Review

**Review Checklist**:
1. [Coding Standards](./coding-standards.md) - Style compliance
2. [Testing Guide](./testing-guide.md) - Test coverage
3. [Project Structure](./project-structure.md) - Proper organization

### For Troubleshooting

**Quick Checks**:
1. [Common Pitfalls](./common-pitfalls.md) - Known issues first
2. [Debugging Guide](./debugging.md) - Debugging tools
3. [Commands Reference](./commands.md) - Verify setup

---

## Documentation Maintenance

### Updating Documentation

When making significant code changes:

1. **Update relevant documentation**:
   - New commands → [commands.md](./commands.md)
   - New structure → [project-structure.md](./project-structure.md)
   - New patterns → [coding-standards.md](./coding-standards.md)
   - New issues → [common-pitfalls.md](./common-pitfalls.md)

2. **Keep examples current**:
   - Code snippets should match actual code
   - Update version numbers
   - Verify all commands work

3. **Document breaking changes**:
   - Update [setup-guide.md](./setup-guide.md) for setup changes
   - Add migration guides if needed
   - Update [common-pitfalls.md](./common-pitfalls.md) with new issues

### Documentation Review

Quarterly review of documentation:
- [ ] Verify all commands still work
- [ ] Update dependency versions
- [ ] Add newly discovered pitfalls
- [ ] Update code examples
- [ ] Fix broken links
- [ ] Improve unclear sections

---

## Related Documentation

### Service-Specific Documentation

- **Backend**: [docs/03-backend/](../03-backend/)
  - [Architecture](../03-backend/architecture.md)
  - [API Routes](../03-backend/api-routes.md)
  - [Services](../03-backend/services/)
  - [Database Schema](../03-backend/database/schema.md)

- **Frontend**: [docs/04-frontend/](../04-frontend/)
  - [Architecture](../04-frontend/architecture.md)
  - [Components](../04-frontend/components/)
  - [State Management](../04-frontend/state-management/)
  - [Views & Routing](../04-frontend/views-routing.md)

- **Game Service**: [docs/05-game-service/](../05-game-service/)
  - [Architecture](../05-game-service/architecture.md)
  - [Proxy Server](../05-game-service/proxy-server.md)
  - [GameZip Server](../05-game-service/gamezip-server.md)

### Architecture Documentation

- [System Architecture](../02-architecture/system-architecture.md)
- [Service Communication](../02-architecture/service-communication.md)
- [Authentication Flow](../02-architecture/authentication-flow.md)
- [Game Launch Flow](../02-architecture/game-launch-flow.md)

### Getting Started

- [Project Overview](../01-overview/project-overview.md)
- [Technology Stack](../01-overview/technology-stack.md)
- [Getting Started](../01-overview/getting-started.md)

---

## Quick Command Reference

### First Time Setup
```bash
npm run install:all
npm run typecheck
npm run build
```

### Daily Development
```bash
npm run dev                # Start all services
npm run typecheck          # Check types
cd backend && npm test     # Run tests
```

### Before Commit
```bash
npm run typecheck          # Type check
cd backend && npm run lint # Lint backend
cd frontend && npm run lint # Lint frontend
cd backend && npm test     # Run tests
```

### Production Build
```bash
npm run build              # Build all services
npm start                  # Start production
```

---

## Feedback and Contributions

### Improving Documentation

Found an issue or have a suggestion?

1. **Small fixes**: Submit a PR directly
2. **Major changes**: Open an issue first
3. **Unclear sections**: Add comments for improvement

### Documentation Standards

When contributing to documentation:
- Use clear, concise language
- Include practical examples
- Add code snippets with syntax highlighting
- Cross-reference related documentation
- Update table of contents
- Test all commands before documenting

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-18 | Initial comprehensive documentation |

---

## Contact and Support

- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions
- **Documentation**: This directory
- **Main Guide**: [CLAUDE.md](../../CLAUDE.md)
