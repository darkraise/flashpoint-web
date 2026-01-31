# Prettier Configuration Guide

This document explains the Prettier configuration used in the Flashpoint Web project and the rationale behind each setting.

## Overview

Prettier is an opinionated code formatter that enforces consistent code style across the entire codebase. Our configuration follows industry best practices from major tech companies including:

- **Airbnb**: JavaScript style guide used by millions of developers
- **Google**: JavaScript and TypeScript style guides
- **Facebook/Meta**: React and JavaScript best practices
- **Microsoft**: TypeScript conventions

## Configuration Files

### `.prettierrc.json`

Main Prettier configuration file at the project root.

### `.prettierignore`

Specifies files and directories that should not be formatted by Prettier.

### `.editorconfig`

Ensures consistent editor settings across different IDEs and text editors.

## Configuration Settings Explained

### Core Formatting Rules

#### `printWidth: 100`

**Default**: 80
**Our Choice**: 100

**Rationale**:
- Modern monitors easily accommodate 100 characters
- 80 characters is too restrictive for modern TypeScript/React code
- Google's style guide uses 100, Facebook uses 80-100
- Reduces unnecessary line breaks in complex JSX/TypeScript

**Example**:
```typescript
// With 100: Clean and readable
const user = await UserService.createUser({ username, email, password, role });

// With 80: Forced line break
const user = await UserService.createUser({
  username, email, password, role
});
```

---

#### `tabWidth: 2`

**Default**: 2
**Our Choice**: 2

**Rationale**:
- Industry standard across JavaScript, TypeScript, React, Vue, and Angular
- Used by Airbnb, Google, Facebook, Microsoft
- Reduces horizontal space usage
- Better for deeply nested code structures

---

#### `useTabs: false`

**Default**: false
**Our Choice**: false

**Rationale**:
- Spaces provide consistent appearance across all editors/viewers
- Prevents tab width inconsistencies (2 vs 4 vs 8 spaces)
- Recommended by all major JavaScript style guides
- Better for code reviews on GitHub/GitLab

---

#### `semi: true`

**Default**: true
**Our Choice**: true

**Rationale**:
- Prevents ASI (Automatic Semicolon Insertion) bugs
- Explicit semicolons make code intentions clear
- Airbnb and Google style guides require semicolons
- TypeScript compiler expects semicolons

**ASI Bug Example**:
```typescript
// Without semicolons - BROKEN CODE
const config = {}
[1, 2, 3].forEach(x => console.log(x))  // TypeError: Cannot read property 'forEach' of undefined

// With semicolons - WORKS
const config = {};
[1, 2, 3].forEach(x => console.log(x));
```

---

#### `singleQuote: true`

**Default**: false
**Our Choice**: true (for JS/TS files)

**Rationale**:
- Reduces visual noise
- Airbnb style guide uses single quotes
- Common in JavaScript/TypeScript ecosystem
- Easier to type (no Shift key)

**Exception**: JSX uses double quotes (see `jsxSingleQuote`)

```typescript
// Our style
const message = 'Hello, world!';
const Component = () => <div className="container">Content</div>;

// Double quotes only in JSX attributes
```

---

#### `jsxSingleQuote: false`

**Default**: false
**Our Choice**: false

**Rationale**:
- HTML standard uses double quotes for attributes
- Maintains consistency with HTML
- React documentation uses double quotes in JSX
- Visual distinction between JS and JSX

```tsx
// Correct
<Button className="primary" onClick={handleClick}>
  Submit
</Button>

// JSX attributes use double quotes
// But JavaScript strings use single quotes
const message = 'Click me';
```

---

#### `trailingComma: "es5"`

**Default**: "all"
**Our Choice**: "es5"

**Rationale**:
- Compatible with ES5 (objects and arrays)
- Prevents trailing commas in function parameters (cleaner diffs)
- Reduces git diff noise
- Prevents accidental syntax errors in older environments

```typescript
// With "es5"
const obj = {
  name: 'John',
  age: 30,  // ✓ Trailing comma
};

function greet(
  name: string,
  age: number  // ✗ No trailing comma
) {
  // ...
}
```

---

#### `bracketSpacing: true`

**Default**: true
**Our Choice**: true

**Rationale**:
- Improves readability with whitespace
- Industry standard
- Aligns with JSON formatting conventions

```typescript
// With bracketSpacing: true
const obj = { name: 'John', age: 30 };

// With bracketSpacing: false (harder to read)
const obj = {name: 'John', age: 30};
```

---

#### `bracketSameLine: false`

**Default**: false
**Our Choice**: false

**Rationale**:
- Opening bracket on same line, closing bracket on new line
- Standard in React/JSX community
- Clearer structure for complex JSX

```tsx
// With bracketSameLine: false (our style)
<MyComponent
  prop1="value1"
  prop2="value2"
>
  Content
</MyComponent>

// With bracketSameLine: true
<MyComponent
  prop1="value1"
  prop2="value2">
  Content
</MyComponent>
```

---

#### `arrowParens: "always"`

**Default**: "always"
**Our Choice**: "always"

**Rationale**:
- Consistency: always use parentheses around arrow function parameters
- Easier to add type annotations in TypeScript
- Prevents confusion with object destructuring
- Recommended by TypeScript style guide

```typescript
// With arrowParens: "always"
const increment = (x) => x + 1;
const identity = (x) => x;

// TypeScript: easier to add types
const increment = (x: number): number => x + 1;

// With arrowParens: "avoid" (inconsistent)
const increment = x => x + 1;
const add = (x, y) => x + y;  // Must use parens here anyway
```

---

#### `endOfLine: "lf"`

**Default**: "lf"
**Our Choice**: "lf"

**Rationale**:
- Unix/Linux/macOS standard (LF - Line Feed)
- Git normalizes to LF on checkout (via `.gitattributes`)
- Prevents CRLF issues in cross-platform development
- Docker containers use LF

**Windows Users**: Git automatically converts to CRLF locally, LF in repository.

---

#### `embeddedLanguageFormatting: "auto"`

**Default**: "auto"
**Our Choice**: "auto"

**Rationale**:
- Automatically formats code inside template literals, markdown code blocks
- Useful for GraphQL, SQL, styled-components
- Maintains consistency in embedded languages

```typescript
// Formats GraphQL inside template literal
const query = gql`
  query GetUser($id: ID!) {
    user(id: $id) {
      name
      email
    }
  }
`;
```

---

## File-Specific Overrides

### Markdown Files (*.md)

```json
{
  "printWidth": 80,
  "proseWrap": "always"
}
```

**Rationale**:
- 80 characters for better readability in documentation
- `proseWrap: "always"` wraps markdown prose at printWidth
- Standard for technical documentation (GitHub README, etc.)

---

### JSON Files (*.json)

```json
{
  "printWidth": 120,
  "trailingComma": "none"
}
```

**Rationale**:
- 120 characters allows longer package.json dependency lines
- `trailingComma: "none"` - JSON spec doesn't allow trailing commas
- Prevents JSON parsing errors

---

### YAML Files (*.yml, *.yaml)

```json
{
  "printWidth": 80,
  "singleQuote": false
}
```

**Rationale**:
- 80 characters for CI/CD config files (GitHub Actions, Docker Compose)
- Double quotes are YAML convention
- Consistency with YAML standards

---

## Usage

### Format Entire Project

```bash
# From project root
npm run format

# Check formatting without writing
npm run format:check
```

### Format Individual Workspace

```bash
# Backend
npm run format:backend
# or
cd backend && npm run format

# Frontend
npm run format:frontend
# or
cd frontend && npm run format

# Game Service
npm run format:game-service
# or
cd game-service && npm run format
```

### Format Specific Files

```bash
# Single file
npx prettier --write src/components/MyComponent.tsx

# Multiple files
npx prettier --write "src/**/*.{ts,tsx}"

# Check specific file
npx prettier --check src/App.tsx
```

### Pre-commit Hook (Recommended)

Install husky and lint-staged for automatic formatting on commit:

```bash
npm install --save-dev husky lint-staged
npx husky install
npx husky add .husky/pre-commit "npx lint-staged"
```

**package.json**:
```json
{
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": [
      "prettier --write",
      "eslint --fix"
    ],
    "*.{json,css,md}": [
      "prettier --write"
    ]
  }
}
```

---

## IDE Integration

### VS Code

**Install Extension**:
- [Prettier - Code formatter](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

**Settings** (`.vscode/settings.json`):
```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.formatOnPaste": true,
  "prettier.requireConfig": true,
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

### WebStorm / IntelliJ IDEA

1. Go to **Settings** → **Languages & Frameworks** → **JavaScript** → **Prettier**
2. Set **Prettier package**: `<project>/node_modules/prettier`
3. Enable **On save** and **On Reformat Code**
4. Set **Run for files**: `{**/*,*}.{js,ts,jsx,tsx,css,json}`

### Sublime Text

**Install Package Control**:
- Install **JsPrettier** package
- Configure to run on save

---

## Integration with ESLint

Prettier and ESLint work together:

- **Prettier**: Code formatting (whitespace, quotes, semicolons)
- **ESLint**: Code quality (unused variables, best practices)

**Install ESLint-Prettier Integration**:

```bash
npm install --save-dev eslint-config-prettier eslint-plugin-prettier
```

**ESLint Config** (`.eslintrc.json`):
```json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier"  // Must be last to override formatting rules
  ],
  "plugins": ["prettier"],
  "rules": {
    "prettier/prettier": "error"  // Show Prettier issues as ESLint errors
  }
}
```

This ensures ESLint doesn't conflict with Prettier formatting rules.

---

## Common Issues & Solutions

### Issue: "No parser could be inferred"

**Solution**: Specify file extension in command
```bash
npx prettier --write "**/*.{ts,tsx,js,jsx,json}"
```

### Issue: Mixed line endings (CRLF/LF)

**Solution**: Configure Git to handle line endings
```bash
git config --global core.autocrlf input  # Unix/Mac
git config --global core.autocrlf true   # Windows
```

### Issue: Prettier not running on save in VS Code

**Solution**:
1. Verify Prettier extension is installed and enabled
2. Check `editor.defaultFormatter` is set to `esbenp.prettier-vscode`
3. Ensure workspace has `.prettierrc.json`
4. Restart VS Code

### Issue: Conflicting ESLint and Prettier rules

**Solution**:
```bash
npm install --save-dev eslint-config-prettier
```

Add `"prettier"` to ESLint extends (must be last).

---

## Ignored Files

See `.prettierignore` for complete list. Key exclusions:

- **Dependencies**: `node_modules/`
- **Build outputs**: `dist/`, `build/`
- **Generated files**: `*.d.ts` (except in src/)
- **Database files**: `*.db`, `*.sqlite`
- **Lock files**: `package-lock.json`, `yarn.lock`
- **External assets**: Flashpoint data directories

---

## Best Practices

1. **Run format before committing**:
   ```bash
   npm run format
   git add .
   git commit -m "feat: add new feature"
   ```

2. **Use format:check in CI/CD**:
   ```yaml
   # .github/workflows/ci.yml
   - name: Check code formatting
     run: npm run format:check
   ```

3. **Don't mix formatting and logic changes**:
   - Format existing code in separate commit
   - Then make logic changes in new commit
   - Easier for code review

4. **Team consistency**:
   - Everyone uses same Prettier version
   - IDE auto-format on save enabled
   - Pre-commit hooks enforce formatting

---

## References

- [Prettier Official Documentation](https://prettier.io/docs/en/)
- [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- [Google JavaScript Style Guide](https://google.github.io/styleguide/jsguide.html)
- [TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)
- [EditorConfig](https://editorconfig.org/)

---

**Last Updated**: 2026-01-27
