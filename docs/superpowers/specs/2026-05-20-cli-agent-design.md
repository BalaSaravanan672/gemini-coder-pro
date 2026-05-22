













# Design Spec: Hybrid CLI Coding Agent (Aider-style)

**Date:** 2026-05-20
**Topic:** CLI Coding Agent with Vertex AI
**Status:** Draft

## 1. Executive Summary
A Node.js/TypeScript CLI agent that uses Gemini 1.5 Pro (via Vertex AI) to help users code in their local workspace. It uses a **Hybrid Architecture** that combines a high-level "Context Map" of the entire project with "Tool-Calling" for specific file reads and surgical edits. All changes require manual `(y/n)` approval.

## 2. Architecture & Components

### 2.1. Tech Stack
- **Runtime:** Node.js
- **Language:** TypeScript
- **AI SDK:** `@google-cloud/vertexai`
- **Authentication:** Service Account JSON (`gemini.json`)
- **CLI Framework:** `commander` or `readline` for the main loop, `chalk` for colors.

### 2.2. The Hybrid Context Model
To balance efficiency and accuracy, the agent receives:
1.  **Context Map (Always Sent):** 
    - Full file tree (respecting `.gitignore`).
    - High-level summaries or signatures of key files.
2.  **Dynamic Context (Tool-Based):** 
    - Full file contents are only read when the agent calls `read_files`.

### 2.3. Tool Definitions
The agent can call the following tools:
- `read_files(paths: string[])`: Returns the full content of one or more files.
- `search_code(query: string)`: Searches the codebase for patterns/strings.
- `propose_edits(edits: {path: string, search: string, replace: string}[])`: Proposes changes using search/replace blocks.

## 3. Key Workflows

### 3.1. The Review Gate (Crucial)
1. Agent calls `propose_edits`.
2. The Orchestrator pauses execution.
3. A unified diff is generated and printed to the terminal.
4. User is prompted: `Apply these changes? (y/n)`.
5. If `y`, files are updated and a "Success" message is sent back to the agent.
6. If `n`, a "Declined by user" message is sent back to the agent.

### 3.2. Authentication
The app initializes the Vertex AI client using the credentials found in `gemini.json`.

## 4. Success Criteria
- Agent can navigate a project it has never seen.
- Agent correctly identifies relevant files for a task.
- Edits are surgical and do not overwrite unrelated code.
- User has absolute control over file writes.

## 5. Future Considerations
- Automatic Git commits (currently manual as requested).
- Support for larger-than-context-window projects via vector search.
