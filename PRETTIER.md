# Prettier - Quick Reference

> **Comprehensive Guide**: See `docs/08-development/prettier-configuration.md`

## Quick Start

```bash
# Install Prettier (if not already installed)
npm install

# Format all files in project
npm run format

# Check formatting without changing files
npm run format:check

# Format individual workspace
npm run format:backend
npm run format:frontend
npm run format:game-service
```

## Our Configuration Summary

| Setting | Value | Why? |
|---------|-------|------|
| `printWidth` | 100 | Modern monitors, less line breaks |
| `tabWidth` | 2 | Industry standard for JS/TS |
| `useTabs` | false | Spaces for consistency |
| `semi` | true | Prevent ASI bugs |
| `singleQuote` | true | Less visual noise |
| `jsxSingleQuote` | false | HTML standard in JSX |
| `trailingComma` | "es5" | Better git diffs |
| `arrowParens` | "always" | Consistency, easier TypeScript |
| `endOfLine` | "lf" | Unix standard |

## IDE Setup

### VS Code (Recommended)

1. Install extension: **Prettier - Code formatter**
2. Add to `.vscode/settings.json`:
   ```json
   {
     "editor.defaultFormatter": "esbenp.prettier-vscode",
     "editor.formatOnSave": true
   }
   ```

### WebStorm / IntelliJ

1. Settings → Languages & Frameworks → JavaScript → Prettier
2. Enable "On save" and "On Reformat Code"

## Integration with ESLint

Prettier handles **formatting**, ESLint handles **code quality**.

They work together - no conflicts!

## What Gets Formatted?

✅ **Formatted**:
- All TypeScript/JavaScript files (`*.ts`, `*.tsx`, `*.js`, `*.jsx`)
- JSON files (`*.json`)
- CSS files (`*.css`)
- Markdown files (`*.md`)
- YAML files (`*.yml`, `*.yaml`)

❌ **Ignored**:
- `node_modules/`
- `dist/` and `build/` directories
- Database files (`*.db`, `*.sqlite`)
- Lock files (`package-lock.json`)
- Generated files

See `.prettierignore` for full list.

## Common Commands

```bash
# Format all files
npm run format

# Check if files are formatted correctly (CI/CD)
npm run format:check

# Format specific file
npx prettier --write src/App.tsx

# Format specific directory
npx prettier --write "src/components/**/*.tsx"

# Check specific files without writing
npx prettier --check "src/**/*.ts"
```

## Before You Commit

```bash
# 1. Format your code
npm run format

# 2. Check TypeScript types
npm run typecheck

# 3. Run linter
cd backend && npm run lint
cd frontend && npm run lint

# 4. Commit
git add .
git commit -m "feat: your changes"
```

## Pre-commit Hook (Optional)

Automatically format on commit:

```bash
npm install --save-dev husky lint-staged
npx husky install
npx husky add .husky/pre-commit "npx lint-staged"
```

Add to root `package.json`:
```json
{
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": ["prettier --write", "eslint --fix"],
    "*.{json,css,md}": ["prettier --write"]
  }
}
```

## Why Prettier?

✅ **No more debates** about code style
✅ **Consistent formatting** across entire team
✅ **Faster code reviews** (focus on logic, not style)
✅ **Auto-format on save** in your IDE
✅ **Works with ESLint** seamlessly

## Examples

### Before Prettier

```typescript
// Inconsistent formatting
function createUser(username,email,role){
const user={username,email,role,createdAt:new Date()}
return user
}

const users=[{name:'John',age:30},{name:'Jane',age:25}]
```

### After Prettier

```typescript
// Clean and consistent
function createUser(username, email, role) {
  const user = { username, email, role, createdAt: new Date() };
  return user;
}

const users = [
  { name: 'John', age: 30 },
  { name: 'Jane', age: 25 },
];
```

## Need Help?

- **Full Documentation**: `docs/08-development/prettier-configuration.md`
- **Prettier Docs**: https://prettier.io/docs/en/
- **Configuration File**: `.prettierrc.json`
- **Ignore File**: `.prettierignore`

---

**Following best practices from**: Airbnb, Google, Facebook/Meta, Microsoft
