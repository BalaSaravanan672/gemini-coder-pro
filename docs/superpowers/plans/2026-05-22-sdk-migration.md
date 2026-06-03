# SDK Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate to the modern Google Gen AI SDK (@google/genai) and implement a manual Vertex Auth Bridge for improved control and future-proofing.

**Architecture:** Refactor `ai.ts` to use `google-auth-library` for manual token generation and update the `Orchestrator` to utilize new SDK features like `.functionCalls()`.

**Tech Stack:** TypeScript, `@google/genai`, `google-auth-library`.

---

### Task 1: Implement Manual Auth Bridge in ai.ts

**Files:**

- Modify: `src/core/ai.ts`

- [ ] **Step 1: Update ai.ts to generate access tokens manually**

```typescript
import { GoogleGenAI } from '@google/genai';
import { GoogleAuth } from 'google-auth-library';
import fs from 'fs';

const credentialsPath = './gemini.json';
if (!fs.existsSync(credentialsPath)) {
  console.error('Error: gemini.json not found in root directory.');
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

// Manual Auth Bridge: Generate a short-lived access token
async function getAuthToken() {
  const auth = new GoogleAuth({
    keyFile: credentialsPath,
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return token.token;
}

const token = await getAuthToken();

export const client = new GoogleGenAI({
  project: config.project_id,
  location: 'global',
  vertexai: true,
  headers: {
    Authorization: 'Bearer ' + token,
  },
});
```

- [ ] **Step 2: Commit refactor: implement manual auth bridge for Vertex AI**

```bash
git add src/core/ai.ts
git commit -m "refactor: implement manual auth bridge for Vertex AI"
```

### Task 2: Refactor Orchestrator to use modern SDK features

**Files:**

- Modify: `src/core/orchestrator.ts`

- [ ] **Step 1: Update processTurn to use chunk.functionCalls and increase MAX_TURNS**

```typescript
// ... near top of file
const MAX_TURNS = 50;

// ... inside processTurn
let functionCalls: any[] = [];

for await (const chunk of responseStream) {
  // ...
  // Use modern SDK convenience method
  if (chunk.functionCalls) {
    functionCalls.push(...chunk.functionCalls);
  }
  // ...
}
```

- [ ] **Step 2: Remove old functionCall filtering logic**

```typescript
// Remove this line:
// const functionCalls = responseParts.filter(p => p.functionCall).map(p => p.functionCall);
```

- [ ] **Step 3: Commit refactor: use modern SDK convenience methods in orchestrator**

```bash
git add src/core/orchestrator.ts
git commit -m "refactor: use modern SDK convenience methods in orchestrator"
```

### Task 3: Verification

- [ ] **Step 1: Run smoke test to verify connectivity**

Run: `npx tsx smoke-test-persona.js`
Expected: SUCCESS

- [ ] **Step 2: Verify type safety**

Run: `npx tsc --noEmit`
Expected: No errors
