# Tool Modularization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Decompose `src/core/tools.ts` into a modular, class-based architecture in `src/tools/`.

**Architecture:** Create an abstract `BaseTool` class for shared logic and migrate each existing tool to its own class.

**Tech Stack:** TypeScript, fs/promises, child_process.

---

### Task 1: Base Tool & Infrastructure

**Files:**

- Create: `src/tools/base.ts`
- Create: `src/tools/types.ts`

- [ ] **Step 1: Define Tool Types**

```typescript
export interface ToolResult {
  error?: string;
  [key: string]: any;
}
```

- [ ] **Step 2: Implement BaseTool abstract class**

```typescript
import { ToolResult } from './types.js';

export abstract class BaseTool<TArgs = any, TResult extends ToolResult = ToolResult> {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly parameters: Record<string, any>;

  async execute(args: TArgs): Promise<TResult> {
    try {
      return await this.run(args);
    } catch (err: any) {
      return { error: `[Tool Error: \${this.name}]: \${err.message || String(err)}` } as TResult;
    }
  }

  protected abstract run(args: TArgs): Promise<TResult>;

  protected truncate(text: string, limit = 50000): string {
    if (!text) return '';
    return text.length > limit ? text.slice(0, limit) + '... [truncated]' : text;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/tools/base.ts src/tools/types.ts
git commit -m "feat: add BaseTool infrastructure"
```

### Task 2: Migrate File System Tools

**Files:**

- Create: `src/tools/read-files.ts`
- Create: `src/tools/list-directory.ts`

- [ ] **Step 1: Implement ReadFilesTool**

```typescript
import fs from 'fs/promises';
import { BaseTool } from './base.js';

export class ReadFilesTool extends BaseTool {
  name = 'read_files';
  description = 'Read the contents of one or more files.';
  parameters = {
    type: 'object',
    properties: {
      paths: { type: 'array', items: { type: 'string' } },
    },
    required: ['paths'],
  };

  protected async run({ paths }: { paths: string[] }) {
    const contents = await Promise.all(
      paths.map(async (p) => {
        try {
          return { path: p, content: await fs.readFile(p, 'utf8') };
        } catch (error: any) {
          return { path: p, error: error.message || String(error) };
        }
      })
    );
    return contents as any;
  }
}
```

- [ ] **Step 2: Implement ListDirectoryTool**

```typescript
import fs from 'fs/promises';
import { BaseTool } from './base.js';

export class ListDirectoryTool extends BaseTool {
  name = 'list_directory';
  description = 'List the contents of a directory.';
  parameters = {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'The path to list.' },
    },
  };

  protected async run({ path = '.' }: { path?: string }) {
    const entries = await fs.readdir(path, { withFileTypes: true });
    const results = entries
      .map((e) => `\${e.isDirectory() ? 'DIR ' : 'FILE'} \${e.name}`)
      .join('\n');
    return { path, results };
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/tools/read-files.ts src/tools/list-directory.ts
git commit -m "feat: migrate FS tools to modular classes"
```

### Task 3: Migrate Shell & Search Tools

**Files:**

- Create: `src/tools/run-command.ts`
- Create: `src/tools/grep-search.ts`

- [ ] **Step 1: Implement RunCommandTool**
      Include 5MB buffer and truncation.

- [ ] **Step 2: Implement GrepSearchTool**
      Include recursive search and exclusions.

- [ ] **Step 3: Commit**

```bash
git add src/tools/run-command.ts src/tools/grep-search.ts
git commit -m "feat: migrate shell and search tools"
```

### Task 4: Registry Integration & Cleanup

**Files:**

- Create: `src/tools/index.ts`
- Modify: `src/core/orchestrator.ts`
- Remove: `src/core/tools.ts`

- [ ] **Step 1: Create tool registry in src/tools/index.ts**

```typescript
import { ReadFilesTool } from './read-files.js';
import { ListDirectoryTool } from './list-directory.js';
import { RunCommandTool } from './run-command.js';
import { GrepSearchTool } from './grep-search.js';
import { ProposeEditsTool } from './propose-edits.js'; // Assume migrated

export const toolRegistry = [
  new ReadFilesTool(),
  new ListDirectoryTool(),
  new RunCommandTool(),
  new GrepSearchTool(),
  new ProposeEditsTool(),
];

export const tools = Object.fromEntries(toolRegistry.map((t) => [t.name, t.execute.bind(t)]));
```

- [ ] **Step 2: Update Orchestrator imports**
      Change `import { tools } from './tools.js'` to `import { tools } from '../tools/index.js'`.

- [ ] **Step 3: Remove src/core/tools.ts**
- [ ] **Step 4: Verify build and smoke test**
- [ ] **Step 5: Commit**

```bash
git rm src/core/tools.ts
git add src/tools/index.ts src/core/orchestrator.ts
git commit -m "refactor: finalize tool modularization"
```
