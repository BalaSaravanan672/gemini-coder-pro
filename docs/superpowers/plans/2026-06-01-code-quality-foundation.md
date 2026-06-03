# Code Quality Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up Vitest, ESLint, and Prettier to establish a solid code quality foundation.

**Architecture:** Install standard TypeScript tooling and configure them to work together (ESLint + Prettier integration).

**Tech Stack:** Vitest, ESLint (v9+), Prettier, TypeScript.

---

### Task 1: Dependency Recruitment

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Install devDependencies**

Run: `npm install -D vitest eslint prettier @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-config-prettier`

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install quality foundation dependencies (Vitest, ESLint, Prettier)"
```

### Task 2: Setting up the Guard Posts (Configs)

**Files:**

- Create: `eslint.config.js`
- Create: `.prettierrc`
- Create: `vitest.config.ts`

- [ ] **Step 1: Create .prettierrc**

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

- [ ] **Step 2: Create eslint.config.js (Flat Config)**

```javascript
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import prettierConfig from 'eslint-config-prettier';

export default [
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      ...prettierConfig.rules,
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', 'temp-non-git/**'],
  },
];
```

- [ ] **Step 3: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    globals: true,
  },
});
```

- [ ] **Step 4: Commit**

```bash
git add eslint.config.js .prettierrc vitest.config.ts
git commit -m "chore: add ESLint, Prettier, and Vitest configurations"
```

### Task 3: Training the Crew (Scripts)

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Add lint, format, and test scripts**

```json
{
  "scripts": {
    "lint": "eslint src",
    "format": "prettier --write src",
    "test": "vitest run"
  }
}
```

- [ ] **Step 2: Verify scripts work**

Run: `npm run lint` (Expected: Success or warnings)
Run: `npm run format` (Expected: Files updated)

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore: add quality scripts to package.json"
```

### Task 4: First Guard Duty (Initial Tests)

**Files:**

- Create: `src/utils/math.test.ts` (Example)

- [ ] **Step 1: Create a simple test to verify Vitest**

```typescript
import { describe, it, expect } from 'vitest';

describe('Quality Foundation', () => {
  it('should pass a sanity check', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npm test`
Expected: 1 test passed

- [ ] **Step 3: Commit**

```bash
git add src/utils/math.test.ts
git commit -m "test: add sanity check for Vitest foundation"
```
