import { CommandHandler } from '../core/commands.js';
import { Orchestrator } from '../core/orchestrator.js';

export class ReviewHandler implements CommandHandler {
  name = 'review';
  description = 'Perform a deep read-only code review of the workspace';

  async execute(orchestrator: Orchestrator) {
    await orchestrator.injectMessage({
      role: 'user',
      parts: [{ text: "Please perform a deep read-only code review of the current workspace. Focus on maintainability, performance, and idiomatic TypeScript patterns. Do not propose edits yet, just provide an analytical report." }]
    });
    await orchestrator.processTurn(0);
  }
}

export class SecurityReviewHandler implements CommandHandler {
  name = 'security-review';
  description = 'Perform a focused security review of the workspace';

  async execute(orchestrator: Orchestrator) {
    await orchestrator.injectMessage({
      role: 'user',
      parts: [{ text: "Please perform a focused security review of the current workspace. Identify potential vulnerabilities like shell injection, exposed credentials, or insecure configurations. Do not propose edits yet, just provide an analytical report." }]
    });
    await orchestrator.processTurn(0);
  }
}
