# Design Spec: Orchestrator Refactor (Service-Based)

## Goal

Decompose the 1000+ line `src/core/orchestrator.ts` into modular, testable services to improve maintainability, readability, and code quality.

## Architecture

The refactored system will move from a single "God Object" (Orchestrator) to a coordinated set of services.

### 1. `ContextService` (`src/core/services/context.ts`)

**Responsibility**: Inspect the repository and user input to build the necessary AI context.

- `buildAutoDiscoveryContext(root, input)`: Scans root directory and reads top-priority files.
- `loadReferencedFileContext(root, input)`: Reads files explicitly mentioned in user text.
- `extractReferencedPaths(input)`: Regex-based path extraction.
- `isCodeTask(input)`: Heuristic to determine if context is needed.

### 2. `PromptService` (`src/core/services/prompt.ts`)

**Responsibility**: Manage token budgets, temperatures, and dynamic prompt construction.

- `getMaxOutputTokens(input)`: Context-aware token budgeting.
- `getTemperature(input)`: Task-specific temperature settings.
- `buildContinuationPrompt(latest, reason)`: Generates continuation prompts for truncated or tool-heavy responses.
- `appendConcisePolicy(prompt)`: Injects core behavior instructions.

### 3. `ToolManager` (`src/core/services/tools.ts`)

**Responsibility**: Handle tool definitions, execution, and summarization.

- `getDeclarations()`: Returns the list of `FunctionDeclaration` objects.
- `execute(name, args, context)`: Routes tool calls to implementation functions.
- `summarize(responses, calls)`: Generates concise summaries of tool outputs for the UI.

### 4. `Orchestrator` (`src/core/orchestrator.ts`)

**Responsibility**: Orchestrate the flow of a single AI turn.

- Maintains `Session` state.
- Orchestrates `processTurn()`:
  1. Gets context from `ContextService`.
  2. Builds prompt with `PromptService`.
  3. Calls AI via `AIClient`.
  4. Handles tool calls via `ToolManager`.
  5. Manages turn-based loop and retries.

### 5. `ChatInterface` (`src/ui/terminal.ts` or new `src/ui/chat.ts`)

**Responsibility**: Handle user interaction and loop.

- Manages `readline` instance.
- Handles slash commands via `CommandRegistry`.
- Calls `Orchestrator.chat()` or equivalent turn logic.

## Implementation Phases

1.  **Phase 1: Service Scaffolding**. Create the directory structure and move static constants/types.
2.  **Phase 2: Context Extraction**. Move file inspection logic and helper functions.
3.  **Phase 3: Tool & Prompt Extraction**. Move tool declarations and execution logic.
4.  **Phase 4: Orchestrator Integration**. Update `Orchestrator` to use the new services and verify functionality.

## Verification Strategy

- **Unit Tests**: Add tests for `ContextService` (mocking `fs`) and `PromptService`.
- **Smoke Test**: Run `npm run dev` and ensure basic chat, file reading, and command execution still work.
- **Type Safety**: Ensure `tsc` passes without errors.
