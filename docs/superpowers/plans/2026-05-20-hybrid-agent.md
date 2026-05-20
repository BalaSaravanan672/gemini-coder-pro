# Hybrid CLI Coding Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Node.js/TypeScript CLI agent using Gemini 2.0 Flash (via Vertex AI) that performs surgical code edits with a manual approval gate.

**Architecture:** A hybrid model using a project "Context Map" for awareness and "Tool-Calling" for file operations. It features a REPL chat loop and a unified diff viewer for change approval.

**Tech Stack:** Node.js, TypeScript, `@google-cloud/vertexai`, `commander`, `chalk`, `diff`.

---

### Task 1: Project Initialization & Environment

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `src/index.ts`

- [ ] **Step 1: Create package.json with dependencies**
```json
{
  "name": "gemini-coder",
  "version": "0.1.0",
  "type": "module",
  "dependencies": {
    "@google-cloud/vertexai": "^1.1.0",
    "chalk": "^5.3.0",
    "commander": "^12.0.0",
    "diff": "^5.2.0",
    "glob": "^10.3.12"
  },
  "devDependencies": {
    "@types/node": "^20.12.7",
    "typescript": "^5.4.5",
    "tsx": "^4.7.2"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**
```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

- [ ] **Step 3: Create .gitignore**
```text
node_modules
dist
gemini.json
.env
```

- [ ] **Step 4: Create a hello world src/index.ts**
```typescript
console.log("Gemini Coder Initialized");
```

- [ ] **Step 5: Run and verify**
Run: `npm install && npx tsx src/index.ts`
Expected: "Gemini Coder Initialized"

### Task 2: Vertex AI Client & Authentication

**Files:**
- Create: `src/ai.ts`
- Test: `tests/ai.test.ts` (using simple script for now)

- [ ] **Step 1: Implement AI client initialization**
```typescript
import { VertexAI } from '@google-cloud/vertexai';
import fs from 'fs';

const credentials = JSON.parse(fs.readFileSync('./gemini.json', 'utf8'));

export const vertexAI = new VertexAI({
  project: credentials.project_id,
  location: 'us-central1',
});

export const model = vertexAI.getGenerativeModel({
  model: 'gemini-2.0-flash-exp', // Using the latest Flash model
});
```

- [ ] **Step 2: Verify connectivity**
Create `verify-ai.ts`:
```typescript
import { model } from './src/ai.js';
const result = await model.generateContent("Hello, are you ready?");
console.log(result.response.candidates[0].content.parts[0].text);
```
Run: `npx tsx verify-ai.ts`
Expected: A greeting from Gemini.

### Task 3: Context Map Generator

**Files:**
- Create: `src/context.ts`

- [ ] **Step 1: Implement file tree walker**
```typescript
import { glob } from 'glob';
import fs from 'fs';

export async function getContextMap(): Promise<string> {
  const files = await glob('**/*', { 
    ignore: ['node_modules/**', 'dist/**', '.git/**', 'gemini.json'],
    nodir: true 
  });
  return files.join('\n');
}
```

### Task 4: Tool Implementation

**Files:**
- Create: `src/tools.ts`

- [ ] **Step 1: Define tool functions**
```typescript
import fs from 'fs/promises';

export const tools = {
  read_files: async ({ paths }: { paths: string[] }) => {
    const contents = await Promise.all(paths.map(async p => ({
      path: p,
      content: await fs.readFile(p, 'utf8')
    })));
    return contents;
  },
  propose_edits: async ({ edits }: { edits: any[] }) => {
    // This will be handled by the orchestrator for the approval gate
    return { status: "pending_approval", edits };
  }
};
```

### Task 5: The Chat Loop & Orchestrator

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: Implement the main REPL loop**
Using `readline` to take user input and call the AI model in a loop, handling tool calls.

### Task 6: Review Gate & Diffing

**Files:**
- Create: `src/diff.ts`

- [ ] **Step 1: Implement diff display and confirmation**
Use the `diff` library to show `search/replace` changes and `readline` to ask `(y/n)`.
