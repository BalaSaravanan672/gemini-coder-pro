# Design Spec: SDK Migration (Google Gen AI SDK)

**Date:** 2026-05-22
**Topic:** Migrating from `deprecated @google-cloud/vertexai` to `@google/generative-ai`
**Status:** Approved (Draft)

## 1. Executive Summary

This design outlines the migration of Gemini CLI from the deprecated Vertex AI SDK to the modern Google Gen Ai SDK. The goal is to remove deprecation warnings and future-proof the agent while maintaining the existing Service Account (`gemini.json`) authentication flow.

## 2. Architecture: Modern Vertex Auth Bridge

We will use a hybrid approach that combines the new SDK with enterprise authentication.

- **Auth Bridge:** Utilize `google-auth-library` to load the existing Service Xccount and generate short-lived access tokens.
- **SDK Swap:** Replace `@google-cloud/vertexai` with `@google/generative-ai`.
- **Inference Logic:** Update `ai.ts` to initialize the new SDK using the generated token instead of an API key.

## 3. feature Details

### 3.1 Tool Definitions (Function Calling)

- **Schema:** Migrate tool parameters to the OpenAPI v3 standard expected by the new SDK.
- **Configuration:** Use the `toolConfig` option if needed to control function calling behavior.

### 3.2 Orchestrator Updates

- **Response Handling:** Refactor `processTurn` to use `response.functionCalls()` to extract tool requests.
- \*_Turn Limit:(_ Increase `MAX_TURNS` to 50 to allow for more complex agentic workflows.

## 4. Success Criteria

- **Zero Warnings:** CLI starts without deprecation notices.
- **Auth Parity:** Service Account authentication remains functional.
- **Functional Parity:** All slash commands (/plan, /diff, etc.) continue to work correctly.
- **Resilience:** Exponential backoff continues to handle 429 (api rate limit) errors.

## 5. Verification Plan

1. **Unit Tests:** Verify token generation in the Auth Bridge.
2. **Integration Tests:** Run a /diff command to verify SDK communication.
3. **Manual Validation:** Perform a full /simplify flow to check for stability under the new turn limit.
