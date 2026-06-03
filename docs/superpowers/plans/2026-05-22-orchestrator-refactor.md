# Orchestrator Refactor - Dynamic Prompt Loading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor `Orchestrator` to asynchronously load the system prompt from a file instead of using a hardcoded string.

**Architecture:** Add a private `loadSystemPrompt` method and an `initialize` method to `Orchestrator`. Update `cli.ts` to call `initialize()` before starting the chat or processing a prompt.

**Tech Stack:** TypeScript, Node.js (fs/promises)

---

### Task 1: Refactor Orchestrator for Dynamic Prompt Loading

**Files:**

- Modify: `src/core/orchestrator.ts`

- [ ] **Step 1: Add fs import and loadSystemPrompt method**

```typescript
import fs from 'fs/promises';
import path from 'path';

// ... inside Orchestrator class
  private async loadSystemPrompt(): Promise<string> {
    try {
      const promptPath = path.join(process.cwd(), '.gemini-coder', 'system-prompt.md');
      return await fs.readFile(promptPath, 'utf8');
    } catch (error) {
      return `You are Gemini Coder Pro, an autonomous engineering agent.`;
    }
  }
```

- [ ] **Step 2: Add initialize method**

```typescript
  public async initialize() {
    // Register all slash commands
    registerAllCommands();

    // Initialize system prompt if new session
    if (this.session.history.length === 0) {
      const systemPrompt = await this.loadSystemPrompt();
      this.session.history.push({
        role: 'user',
        parts: [{
          text: systemPrompt
        }]
      });
      this.session.history.push({
        role: 'model',
        parts: [{ text: "Gemini Coder Pro initialized. I am ready to autonomously engineer, refactor, and verify your codebase. I will follow the Plan-Act-Verify protocol for every task. What is our objective?" }]
      });
    }
  }
```

- [ ] **Step 3: Update constructor to remove hardcoded prompt and command registration**

```typescript
  constructor(session: Session, sessionManager: SessionManager) {
    this.session = session;
    this.sessionManager = sessionManager;
  }
```

### Task 2: Update CLI to call initialize

**Files:**

- Modify: `src/cli.ts`

- [ ] **Step 1: Update action to call orchestrator.initialize()**

```typescript
    const orchestrator = new Orchestrator(session, sessionManager);
    await orchestrator.initialize();

    if (options.prompt) {
```

### Task 3: Verification

- [ ] **Step 1: Run tsc to ensure no type errors**

Run: `npx tsc`
Expected: No errors

- [ ] **Step 2: Run a quick test to ensure it starts up**

Run: `node dist/cli.js --help`
Expected: Help message printed correctly
