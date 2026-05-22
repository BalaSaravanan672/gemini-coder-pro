# Code Review & Planning Implementation Plan

Goal: Implement a Command-Driven architecture with /plan, /diff, /review, and /simplify features for Claude Code parity.

Architecture: Create a central CommandRegistry to route slash commands to specialized handlers. Refactor the Orchestrator into a state machine to support modes.

---

### Task 1: Infrastructure - Command Registry

- Create: src/core/commands.ts
- Create: src/commands/index.ts

- [ ] Step 1: Define Command Interface and Registry in src/core/commands.ts
- [ ] Step 2: Create initial commands entry point in src/commands/index.ts
- [ ] Step 3: Commit feat: add command registry infrastructure

### Task 2: Orchestrator Refactor - Mode Support & Command Routing

- Modify: src/core/orchestrator.ts

- [ ] Step 1: Add OrchestratorMode enum and mode property to Orchestrator class.
- [ ] Step 2: Refactor handleSlashCommand to use CommandRegistry.
- [ ] Step 3: Initialize commands in Orchestrator constructor.
- [ ] Step 4: Commit refactor: integrate command registry into orchestrator

### Task 3: Feature - Plan Mode (/plan)

- Create: src/commands/plan.ts
- Modify: src/commands/index.ts
- Modify: src/core/orchestrator.ts

- [ ] Step 1: Implement PlanHandler to toggle between NORMAL and PLAN modes.
- [ ] Step 2: Add getMode/setMode to Orchestrator.
- [ ] Step 3: Intercept destructive tool calls in Orchestrator.processTurn when in PLAN mode.
- [ ] Step 4: Register /plan command.
- [ ] Step 5: Commit feat: implement /plan mode with tool interception

### Task 4: Feature - Interactive Diff (/diff)

- Create: src/commands/diff.ts
- Modify: src/core/diff.ts

- [ ] Step 1: Enhance showDiff to support a non-blocking review mode.
- [ ] Step 2: Implement DiffHandler to call git diff and launch interactive review.
- [ ] Step 3: Register /diff command and commit.

### Task 5: Feature - Review & Security Review

- Create: src/commands/review.ts

- [ ] Step 1: Implement ReviewHandler to inject specialist prompts (/review, /security-review).
- [ ] Step 2: Register commands and commit.

### Task 3: Feature - Simplify (/simplify)

- Create: src/commands/simplify.ts

- [ ] Step 1: Implement SimplifyHandler for agentic refactoring and test verification.
- [ ] Step 2: Register command and commit.
