# Design Spec: Code Review & Planning (Claude Code Parity)

**Date:** 2026-05-22
**Topic:** Implementing /diff, /plan, /review, and /simplify
**Status:** Approved (Draft)

## 1. Executive Summary
This design introduces a Command-Driven architecture to Gemini CLI to support advanced code review and planning features. By refactoring the main loop to use a Command Registry and Orchestrator Modes, we enable interactive UI elements and specialized AI behaviors.

## 2. Architecture: Command-Driven Registry
We will move away from simple switch statements in `orchestrator.ts` to a formal registry.

- **CommandRegistry:** A central hub that maps slash commands to handlers.
- **Command Handlers:** Individual classes/modules for each command (e.g., `DiffHandler`, `PlanHandler`).
- **Orchestrator Integration:** The main loop intercepts slash commands before sending input to the AI.

## 3. Feature Details

### 3.1 /plan (Planning Mode)
- **State:** Enters `PLAN` mode in the Orchestrator.
- **Visuals:** Prompt changes to blue.
- **Gating:** Intercepts `propose_edits` and `run_command` (for state-modifying commands). 
- **AI Behavior:** Told it is in a read-only planning phase; encouraged to research and strategize.

### 3.2 /diff (Interactive Diff Viewer)
- **Functionality:** Launches a sub-loop for reviewing changes.
- **Capabilities:**
  - View uncommitted git changes.
  - View per-turn changes from the current session.
  - Interactive hunk selection and "Apply All" functionality.

### 3.3 /review & /security-review
- **Persona Shift:** Injects a specialized system prompt (e.g., "Senior Security Auditor") into the history.
- **Read-Only:** These commands are focused on analysis and do not modify files directly.

### 3.4 /simplify
- **Workflow:** 
  1. Identify complex code in recent files.
  2. Propose a refactored/simplified version.
  3. Automatically run tests to verify the refactor.

## 4. Success Criteria
- **Interactive Reliability:** /diff correctly renders and applies changes.
- **Mode Isolation:** Plan Mode strictly prevents accidental writes.
- **Review Depth:** /security-review identifies common vulnerabilities (e.g., shell injection).
- **Safe Refactoring:** /simplify never breaks the existing test suite.

## 5. Verification Plan
1. **Unit Tests:** CommandRegistry routing and Handler logic.
2. **Integration Tests:** Orchestrator mode transitions.
3. **Manual Validation:** Complete a complex task using Plan -> Simplify -> Diff.
