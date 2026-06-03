# Orchestrator Refactor - Task 4 Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the refactoring of `src/core/orchestrator.ts` by fully integrating `PromptService`, `ToolManager`, and `ContextService`, and removing redundant logic.

**Architecture:** Use static methods from specialized service classes to handle prompt building, tool management, and context discovery. This decouples the core orchestration logic from the details of prompt formatting and tool definitions.

**Tech Stack:** TypeScript, Gemini API SDK.

---

### Task 1: Complete Service Integration in `processTurn`

**Files:**

- Modify: `src/core/orchestrator.ts`

- [ ] **Step 1: Replace `shouldUseTools` call**
      In `processTurn`, change `const useTools = shouldUseTools(latestUserText);` to `const useTools = ContextService.shouldInjectContextMap(latestUserText);`.

- [ ] **Step 2: Replace `functionDeclarations` usage**
      In `processTurn`, update the `aiClient.models.generateContentStream` call to use `ToolManager.getDeclarations()`.

- [ ] **Step 3: Replace `summarizeToolResponses` call**
      In `processTurn`, change the call to `summarizeToolResponses` to `ToolManager.summarize(toolResponses, functionCalls)`.

- [ ] **Step 4: Replace `buildConciseContinuationPrompt` calls**
      Update all occurrences of `buildConciseContinuationPrompt` in `src/core/orchestrator.ts` (including those in `processTurn`) to use `PromptService.buildConciseContinuationPrompt`.

### Task 2: Remove Redundant Code and Cleanup

**Files:**

- Modify: `src/core/orchestrator.ts`

- [ ] **Step 1: Remove redundant private functions and constants**
      Remove the following from `src/core/orchestrator.ts`:
- `functionDeclarations` constant array
- `isCodeTask` function
- `looksLikeContextRequest` function
- `shouldInjectContextMap` function
- `shouldUseTools` function
- `extractReferencedPaths` function
- `loadReferencedFileContext` function
- `buildAutoDiscoveryContext` function
- `getMaxOutputTokens` function
- `getRetryOutputTokens` function
- `getTemperature` function
- `summarizeToolResponses` function
- `buildConciseContinuationPrompt` function
- `appendConcisePolicy` function
- Related constants: `REFERENCED_FILE_PATTERN`, `MAX_FILE_CONTEXT_CHARS`, `AUTO_DISCOVERY_MAX_FILES`, `AUTO_DISCOVERY_READ_LIMIT`, `BOOTSTRAP_PATTERNS`.

- [ ] **Step 2: Remove unused imports**
      Remove imports that are no longer needed (e.g., `FunctionDeclaration`, `Type` from `@google/genai` if only used in the removed declarations, `glob`).

### Task 3: Verification and Commit

- [ ] **Step 1: Run Build**
      Run: `npm run build`
      Expected: Success

- [ ] **Step 2: Commit Changes**
      Run: `git add src/core/orchestrator.ts && git commit -m "refactor: complete integration of services into Orchestrator"`
