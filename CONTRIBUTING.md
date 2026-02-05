# Contributing to Flashpoint Web

Thank you for your interest in contributing to Flashpoint Web! This document
provides guidelines and instructions for contributing to this project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Testing](#testing)
- [Documentation](#documentation)
- [Community](#community)

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inspiring community for all. By
participating in this project, you agree to:

- Be respectful and inclusive
- Accept constructive criticism gracefully
- Focus on what is best for the community
- Show empathy towards other community members

### Unacceptable Behavior

- Harassment, discrimination, or offensive comments
- Trolling or insulting/derogatory comments
- Public or private harassment
- Publishing others' private information without permission

## Getting Started

### Prerequisites

Before contributing, ensure you have:

- [Node.js](https://nodejs.org/) 20.0.0 or higher
- [npm](https://www.npmjs.com/) 9.0.0 or higher
- [Git](https://git-scm.com/)
- [Flashpoint Archive](https://flashpointarchive.org/) installed locally
- A code editor (VS Code recommended)

### Fork and Clone

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/flashpoint-web.git
   cd flashpoint-web
   ```
3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/flashpoint-web.git
   ```

## Development Setup

### Quick Setup

```bash
# Install all dependencies
npm run install:all

# Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp game-service/.env.example game-service/.env

# Edit .env files with your Flashpoint paths
# See docs/08-development/setup-guide.md for details

# Start development servers
npm run dev
```

### Verify Setup

```bash
# Run type checking
npm run typecheck

# Run tests
cd backend && npm test
cd ../frontend && npm test
cd ../game-service && npm test
```

For detailed setup instructions, see
[Setup Guide](docs/08-development/setup-guide.md).

## How to Contribute

### Reporting Bugs

Before reporting a bug:

1. Search [existing issues](https://github.com/OWNER/flashpoint-web/issues) to
   avoid duplicates
2. Use the [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.md)
3. Include:
   - Clear description of the issue
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, Node version, browser)
   - Screenshots or logs if applicable

### Suggesting Features

1. Check if the feature has already been requested
2. Use the [Feature Request template](.github/ISSUE_TEMPLATE/feature_request.md)
3. Explain the use case and benefits
4. Consider how it fits with existing features

### Contributing Code

1. **Find an issue** to work on or create one
2. **Comment on the issue** to let others know you're working on it
3. **Create a branch** from `master`
4. **Make your changes** following our coding standards
5. **Write tests** for new functionality
6. **Submit a pull request**

### First-Time Contributors

Look for issues labeled:

- `good first issue` - Simple issues for newcomers
- `help wanted` - Issues where we need community help
- `documentation` - Documentation improvements

## Pull Request Process

### Before Submitting

1. **Sync with upstream**:

   ```bash
   git fetch upstream
   git rebase upstream/master
   ```

2. **Run all checks**:

   ```bash
   npm run typecheck
   npm run format:check
   cd backend && npm test
   ```

3. **Update documentation** if needed

### PR Requirements

- [ ] Branch is up-to-date with `master`
- [ ] Code follows project coding standards
- [ ] All tests pass
- [ ] TypeScript has no errors
- [ ] Documentation is updated (if applicable)
- [ ] Commit messages follow guidelines
- [ ] PR description explains the changes

### Branch Naming

Use descriptive branch names:

```
feature/add-playlist-export
fix/game-search-pagination
docs/update-api-reference
refactor/auth-service-cleanup
```

### PR Title Format

```
type: short description

Examples:
feat: add game export to playlist
fix: resolve pagination bug in game search
docs: update Docker deployment guide
refactor: simplify authentication middleware
```

## Coding Standards

### TypeScript

- Use TypeScript for all code
- Enable strict mode
- Define interfaces for all data structures
- Avoid `any` type - use `unknown` if type is truly unknown

```typescript
// Good
interface GameFilters {
  platform?: string;
  search?: string;
  limit: number;
}

function searchGames(filters: GameFilters): Promise<Game[]> {
  // ...
}

// Avoid
function searchGames(filters: any): Promise<any> {
  // ...
}
```

### React Components

- Use functional components with hooks
- Define prop types with TypeScript interfaces
- Keep components focused and single-purpose

```typescript
// Good
interface GameCardProps {
  game: Game;
  onPlay: (id: string) => void;
}

export function GameCard({ game, onPlay }: GameCardProps) {
  return (
    <Card onClick={() => onPlay(game.id)}>
      <CardTitle>{game.title}</CardTitle>
    </Card>
  );
}
```

### API Endpoints

- Use RESTful conventions
- Add typed API methods to `frontend/src/lib/api.ts`
- Never use raw `fetch()` for backend calls

```typescript
// In api.ts
export const gamesApi = {
  getById: async (id: string): Promise<Game> => {
    const { data } = await api.get<ApiResponse<Game>>(`/games/${id}`);
    return data.data;
  },
};

// In component - CORRECT
const game = await gamesApi.getById(id);

// In component - WRONG (no auth headers)
const response = await fetch(`/api/games/${id}`);
```

### Styling

- Use Tailwind CSS utility classes
- Follow existing component patterns
- Use Shadcn UI components when available

### File Organization

```
src/
├── components/     # Reusable UI components
│   ├── ui/         # Base UI components (Shadcn)
│   └── [domain]/   # Domain-specific components
├── views/          # Page components
├── lib/            # Utilities and API client
├── hooks/          # Custom React hooks
├── store/          # Zustand stores
└── types/          # TypeScript type definitions
```

## Commit Guidelines

### Commit Message Format

```
type(scope): subject

body (optional)

footer (optional)
```

### Types

| Type       | Description                                 |
| ---------- | ------------------------------------------- |
| `feat`     | New feature                                 |
| `fix`      | Bug fix                                     |
| `docs`     | Documentation changes                       |
| `style`    | Code style changes (formatting, semicolons) |
| `refactor` | Code refactoring                            |
| `test`     | Adding or updating tests                    |
| `chore`    | Maintenance tasks                           |
| `perf`     | Performance improvements                    |

### Examples

```bash
feat(games): add advanced search filters

- Add platform filter dropdown
- Add year range selector
- Update API to support new parameters

Closes #123

---

fix(auth): resolve token refresh race condition

Multiple simultaneous requests could trigger multiple refresh
calls. Added mutex lock to prevent duplicate refreshes.

---

docs: update API reference for v2 endpoints
```

### Commit Best Practices

- Keep commits atomic (one logical change per commit)
- Write meaningful commit messages
- Reference issues when applicable (`Fixes #123`, `Closes #456`)

## Testing

### Backend Tests

```bash
cd backend
npm test              # Run all tests
npm test -- --watch   # Watch mode
npm test -- --coverage # Coverage report
```

### Frontend Tests

```bash
cd frontend
npm test              # Run all tests
npm test -- --ui      # Open Vitest UI
```

### Writing Tests

- Write tests for new features
- Include edge cases
- Mock external dependencies

```typescript
// Example test
import { describe, it, expect, vi } from 'vitest';
import { GameService } from './GameService';

describe('GameService', () => {
  it('should return games matching search query', async () => {
    const games = await GameService.search({ query: 'mario' });

    expect(games).toHaveLength(10);
    expect(games[0].title).toContain('Mario');
  });

  it('should handle empty results gracefully', async () => {
    const games = await GameService.search({ query: 'nonexistent12345' });

    expect(games).toHaveLength(0);
  });
});
```

## Documentation

### When to Update Docs

Update documentation when you:

- Add new features
- Change API endpoints
- Modify configuration options
- Change architecture or patterns

### Documentation Structure

```
docs/
├── 01-overview/        # Project introduction
├── 02-architecture/    # System design
├── 03-backend/         # Backend service docs
├── 04-frontend/        # Frontend service docs
├── 05-game-service/    # Game service docs
├── 06-api-reference/   # API documentation
├── 07-design-system/   # UI/UX guidelines
├── 08-development/     # Development guides
├── 09-deployment/      # Deployment guides
├── 10-features/        # Feature documentation
└── 12-reference/       # Reference materials
```

### Documentation Standards

- Use clear, concise language
- Include code examples
- Keep content up-to-date with code changes
- Add diagrams for complex concepts

## Project Structure

```
flashpoint-web/
├── backend/           # Express REST API
│   ├── src/
│   │   ├── routes/    # API route handlers
│   │   ├── services/  # Business logic
│   │   ├── middleware/# Express middleware
│   │   └── utils/     # Utility functions
│   └── package.json
│
├── frontend/          # React application
│   ├── src/
│   │   ├── components/# UI components
│   │   ├── views/     # Page components
│   │   ├── lib/       # API client & utilities
│   │   ├── hooks/     # Custom hooks
│   │   └── store/     # State management
│   └── package.json
│
├── game-service/      # Game file server
│   ├── src/
│   │   ├── servers/   # HTTP servers
│   │   └── utils/     # Utilities
│   └── package.json
│
├── docs/              # Documentation
└── package.json       # Root package
```

## Community

### Getting Help

- Check the [documentation](docs/)
- Search [existing issues](https://github.com/OWNER/flashpoint-web/issues)
- Join discussions in issues or PRs

### Communication

- Be patient - maintainers are volunteers
- Provide context and details in discussions
- Be open to feedback and alternative approaches

## Recognition

Contributors are recognized in:

- GitHub contributors list
- Release notes for significant contributions
- README acknowledgments section

---

## Quick Reference

| Task                 | Command                   |
| -------------------- | ------------------------- |
| Install dependencies | `npm run install:all`     |
| Start dev servers    | `npm run dev`             |
| Type check           | `npm run typecheck`       |
| Format code          | `npm run format`          |
| Run backend tests    | `cd backend && npm test`  |
| Run frontend tests   | `cd frontend && npm test` |
| Build all            | `npm run build`           |

---

Thank you for contributing to Flashpoint Web! Your efforts help preserve gaming
history for future generations.
