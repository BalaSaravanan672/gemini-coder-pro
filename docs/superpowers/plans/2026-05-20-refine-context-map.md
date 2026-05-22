# Context Map Generator Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine `getContextMap` to respect `.gitignore` and include high-level signatures for key files.

**Architecture:** Use `git ls-files` to efficiently gather file paths respecting `.gitignore`. For key file types, read the first 10 lines to provide context.

**Tech Stack:** Node.js, `child_process`, `fs/promises`.

---

### Task 1: Create Reproduction Test

**Files:**
- Create: `src/repro-context.ts`

- [ ] **Step 1: Write a reproduction test that expects signatures**

```typescript
import { getContextMap } from './context.js';

async function test() {
  console.log('Testing getContextMap for signatures...');
  const map = await getContextMap();
  
  // Check for signatures (e.g., "[Signature]")
  if (!map.includes('[Signature]')) {
    console.error('FAIL: No signatures found in context map.');
    process.exit(1);
  }
  
  console.log('PASS: Signatures found.');
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx src/repro-context.ts`
Expected: FAIL with "FAIL: No signatures found in context map."

- [ ] **Step 3: Commit**

```bash
git add src/repro-context.ts
git commit -m "test: add reproduction test for context map signatures"
```

---

### Task 2: Implement .gitignore support using git ls-files

**Files:**
- Modify: `src/context.ts`

- [ ] **Step 1: Replace glob with git ls-files**

```typescript
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile } from 'fs/promises';

const execAsync = promisify(exec);

export async function getContextMap(): Promise<string> {
  const { stdout } = await execAsync('git ls-files --cached --others --exclude-standard');
  const files = stdout.split('\n').filter(f => f.trim().length > 0);
  
  const result: string[] = [];
  for (const file of files) {
      result.push(file);
  }
  return result.join('\n');
}
```

- [ ] **Step 2: Verify it still works (but fails signature check)**

Run: `npx tsx src/repro-context.ts`
Expected: FAIL with "FAIL: No signatures found in context map."

- [ ] **Step 3: Commit**

```bash
git add src/context.ts
git commit -m "feat: use git ls-files to respect .gitignore"
```

---

### Task 3: Implement file signatures

**Files:**
- Modify: `src/context.ts`

- [ ] **Step 1: Update getContextMap to read first 10 lines of key files**

```typescript
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile } from 'fs/promises';

const execAsync = promisify(exec);

async function getSignature(filePath: string): Promise<string | null> {
    const keyExtensions = ['.ts', '.js', '.json', '.md'];
    if (!keyExtensions.some(ext => filePath.endsWith(ext))) {
        return null;
    }

    try {
        const content = await readFile(filePath, 'utf-8');
        const lines = content.split('\n').slice(0, 10);
        return lines.join('\n');
    } catch (e) {
        return null;
    }
}

export async function getContextMap(): Promise<string> {
  const { stdout } = await execAsync('git ls-files --cached --others --exclude-standard');
  const files = stdout.split('\n').filter(f => f.trim().length > 0);
  
  const result: string[] = [];
  for (const file of files) {
      const signature = await getSignature(file);
      if (signature) {
          result.push(`${file}:\n[Signature]\n${signature}\n---`);
      } else {
          result.push(file);
      }
  }
  return result.join('\n');
}
```

- [ ] **Step 2: Run repro test to verify it passes**

Run: `npx tsx src/repro-context.ts`
Expected: PASS

- [ ] **Step 3: Run existing verification test**

Run: `npx tsx src/verify-context.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/context.ts
git commit -m "feat: add file signatures to context map"
```

---

### Task 4: Cleanup

- [ ] **Step 1: Remove reproduction test**

Run: `rm src/repro-context.ts`

- [ ] **Step 2: Commit**

```bash
git commit -am "cleanup: remove reproduction test"
```
