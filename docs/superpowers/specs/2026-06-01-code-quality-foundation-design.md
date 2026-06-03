# Design Spec: Shipshape Code Quality Foundation

## Goal

Establish a robust code quality and testing foundation using industry-standard tooling to ensure maintainability, consistency, and reliability of the Gemini Coder Pro codebase.

## Tooling Stack (Approach 1)

### 1. Testing: Vitest

- **Purpose**: Fast, modern unit testing with native TypeScript support.
- **Config**: `vitest.config.ts` in the root.
- **Integration**: `npm test` script in `package.json`.
- **Target**: Initial coverage for `src/core/services/` and `src/utils/`.

### 2. Linting: ESLint (Flat Config)

- **Purpose**: Enforce TypeScript best practices and catch potential bugs early.
- **Config**: `eslint.config.js` using the modern Flat Config format.
- **Plugins**: `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`.
- **Integration**: `npm run lint` script.

### 3. Formatting: Prettier

- **Purpose**: Guarantee a consistent code style (spacing, quotes, etc.) across the entire deck.
- **Config**: `.prettierrc` (2 spaces, single quotes, trailing commas).
- **Integration**: `npm run format` script and ESLint integration via `eslint-config-prettier`.

## Implementation Phases

1.  **Phase 1: Dependency Recruitment**. Install all necessary devDependencies.
2.  **Phase 2: Guard Post Setup**. Create `eslint.config.js`, `.prettierrc`, and `vitest.config.ts`.
3.  **Phase 3: Package updates**. Add `test`, `lint`, and `format` scripts to `package.json`.
4.  **Phase 4: First Guard Duty**. Migrate existing manual tests in `src/test/` to Vitest and fix initial linting violations.

## Verification Strategy

- **Lint Pass**: `npm run lint` should return zero errors.
- **Format Pass**: `npm run format` should ensure all files are consistently styled.
- **Test Pass**: `npm test` should execute all unit tests successfully.
- **Build Pass**: `npm run build` should still produce a clean `dist/` folder.
