# Design Spec: Tool Modularization (Class-Based)

## Goal

Decompose the monolithic `src/core/tools.ts` into a modular, extensible class-based architecture to improve maintainability, testability, and robustness.

## Architecture

### 1. `BaseTool` Abstract Class (`src/tools/base.ts`)

**Responsibility**: Provide a standardized interface and shared utilities for all tools.

- `execute(args)`: Public wrapper that handles global try/catch and error formatting.
- `run(args)`: Protected abstract method for tool-specific logic.
- `truncate(text, limit)`: Shared utility to prevent context window blowouts.
- Properties: `name`, `description`, `parameters` (standardized for GenAI).

### 2. Tool Implementations (`src/tools/*.ts`)

Each existing tool will be migrated to its own class:

- `ReadFilesTool` (`src/tools/read-files.ts`)
- `RunCommandTool` (`src/tools/run-command.ts`)
- `GrepSearchTool` (`src/tools/grep-search.ts`)
- `ListDirectoryTool` (`src/tools/list-directory.ts`)
- `ProposeEditsTool` (`src/tools/propose-edits.ts`)

### 3. Registry & Index (`src/tools/index.ts`)

**Responsibility**: Aggregate all tools and export them in a format compatible with the existing `Orchestrator` and `ToolManager`.

- `toolRegistry`: An array of initialized tool instances.
- `tools`: A exported object mapping tool names to their `execute` methods (maintaining backward compatibility).

## Implementation Phases

1.  **Phase 1: Foundation**. Create `src/tools/base.ts` and the directory structure.
2.  **Phase 2: Individual Migration**. Move each tool one-by-one, ensuring they extend `BaseTool`.
3.  **Phase 3: Registry Integration**. Create the index and update `src/core/orchestrator.ts` (if needed) to import from the new location.
4.  **Phase 4: Cleanup**. Remove the old `src/core/tools.ts`.

## Verification Strategy

- **Unit Tests**: Add tests for `BaseTool` (truncation logic) and individual tool classes.
- **Integration Test**: Ensure the AI can still call tools and receive formatted responses.
- **Build**: Ensure `npm run build` and `npm run typecheck` pass.
