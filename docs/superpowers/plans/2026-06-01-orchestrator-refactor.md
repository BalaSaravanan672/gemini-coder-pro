# Orchestrator Refactor (Service-Based) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the 1000-line `Orchestrator` class into modular services for Tools, Context, and Prompts.

**Architecture:** Decompose `Orchestrator.ts` into specialized services: `ToolManager`, `ContextService`, and `PromptService`, reducing the main orchestrator to a coordination layer.

**Tech Stack:** TypeScript, @google/genai, fs/promises, path, glob.

---

### Task 1: Tool Manager Extraction

**Files:**

- Create: `src/core/services/tools.ts`
- Modify: `src/core/orchestrator.ts`

- [ ] **Step 1: Create ToolManager service**
      Move `functionDeclarations` and tool-related logic to `src/core/services/tools.ts`.

```typescript
import { FunctionDeclaration, Part } from '@google/genai';
import { tools } from '../tools.js';

export const functionDeclarations: FunctionDeclaration[] = [
  // ... (copy from orchestrator.ts)
];

export class ToolManager {
  static getDeclarations(): FunctionDeclaration[] {
    return functionDeclarations;
  }

  static summarize(toolResponses: Part[], functionCalls: any[]): string {
    const summaries: string[] = [];
    for (let i = 0; i < functionCalls.length; i++) {
      const call = functionCalls[i];
      const response = toolResponses[i] as any;
      const result = response?.functionResponse?.response?.result;

      if (call?.name === 'list_directory' && result?.results) {
        summaries.push(
          `Listed ${result.path ?? 'the directory'} (${String(result.results).split('\n').filter(Boolean).length} entries).`
        );
      } else if (call?.name === 'read_files' && Array.isArray(result)) {
        summaries.push(`Read ${result.length} file\${result.length === 1 ? '' : 's'}.`);
      } else if (call?.name === 'grep_search') {
        summaries.push('Search completed.');
      } else if (call?.name === 'run_command') {
        summaries.push('Command executed.');
      } else if (call?.name) {
        summaries.push(`\${call.name} completed.`);
      }
    }
    return summaries.length === 0 ? 'Done.' : summaries.slice(0, 3).join(' ');
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/core/services/tools.ts
git commit -m "feat: extract ToolManager service"
```

### Task 2: Context Service Extraction

**Files:**

- Create: `src/core/services/context.ts`
- Modify: `src/core/orchestrator.ts`

- [ ] **Step 1: Implement ContextService**
      Move context-building logic (auto-discovery, file context, heuristics) to `src/core/services/context.ts`.

```typescript
import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';

export class ContextService {
  static isCodeTask(userText: string): boolean {
    return /\b(code|file|folder|directory|repo|repository|workspace|project|architecture|architectural|overview|design|structure|system|bug|error|fix|build|test|lint|compile|refactor|implement|edit|patch|command|function|class|ts|tsx|js|json|md|python|py|fastapi|api|backend|frontend|analyze|analyst|agent)\b/i.test(
      userText
    );
  }

  static shouldInjectContextMap(userText: string): boolean {
    const normalized = userText.toLowerCase();
    if (normalized.trim().length === 0) return false;
    const casualGreetingPattern =
      /^(hi|hello|hey|hola|thanks|thank you|good morning|good afternoon|good evening)([!.?\s]|$)/i;
    if (casualGreetingPattern.test(normalized)) return false;
    return this.isCodeTask(userText);
  }

  static async loadReferencedFileContext(workspaceRoot: string, userText: string): Promise<string> {
    // ... (copy implementation from orchestrator.ts)
  }

  static async buildAutoDiscoveryContext(workspaceRoot: string, userText: string): Promise<string> {
    // ... (copy implementation from orchestrator.ts)
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/core/services/context.ts
git commit -m "feat: extract ContextService"
```

### Task 3: Prompt Service Extraction

**Files:**

- Create: `src/core/services/prompt.ts`
- Modify: `src/core/orchestrator.ts`

- [ ] **Step 1: Implement PromptService**
      Move token budgeting, temperature, and continuation prompt logic.

```typescript
export class PromptService {
  static getMaxOutputTokens(userText: string): number {
    // ... (copy from orchestrator.ts)
  }

  static getTemperature(userText: string): number {
    return 0.2;
  }

  static buildConciseContinuationPrompt(
    latestUserText: string,
    reason: 'tool-followup' | 'truncated' | 'retry' | 'blank'
  ): string {
    // ... (copy from orchestrator.ts)
  }

  static appendConcisePolicy(prompt: string): string {
    return `\${prompt}\n\nExecution policy: work in short iterative turns. Keep each assistant response concise, focused on the latest step, and avoid long wrap-up answers until the task is complete.`;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/core/services/prompt.ts
git commit -m "feat: extract PromptService"
```

### Task 4: Orchestrator Integration

**Files:**

- Modify: `src/core/orchestrator.ts`

- [ ] **Step 1: Update Orchestrator to use services**
      Replace internal functions and hardcoded declarations with calls to the new services. Clean up imports and removed code.

- [ ] **Step 2: Verify build**
      Run: `npm run build`
      Expected: Success

- [ ] **Step 3: Commit**

```bash
git add src/core/orchestrator.ts
git commit -m "refactor: integrate services into Orchestrator"
```

### Task 5: Final Cleanup and Smoke Test

**Files:**

- Modify: `src/core/orchestrator.ts`

- [ ] **Step 1: Remove dead code from Orchestrator.ts**
      Ensure all extracted functions are gone and the file is significantly smaller.

- [ ] **Step 2: Run smoke test**
      Run: `npm run dev`
      Interact with the CLI: "explain this project"
      Expected: CLI responds correctly using context building and AI.

- [ ] **Step 3: Commit**

```bash
git commit -m "refactor: final cleanup of orchestrator"
```
