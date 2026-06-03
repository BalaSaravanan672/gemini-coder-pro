import { CommandHandler } from '../core/commands.js';
import { Orchestrator } from '../core/orchestrator.js';

export class ReviewHandler implements CommandHandler {
  name = 'review';
  description = 'Deep security and code quality review. Read-only.';

  async execute(orchestrator: Orchestrator) {
    await orchestrator.injectMessage({
      role: 'user',
      parts: [
        {
          text: 'Perform a deep read-only code review. Focus on maintainability, performance, and idiomatic TypeScript. Output an analytical report. Do not propose edits.',
        },
      ],
    });
    await orchestrator.processTurn(0);
  }
}

export class SecurityReviewHandler implements CommandHandler {
  name = 'security-review';
  description = 'Focused security review. Read-only.';

  async execute(orchestrator: Orchestrator) {
    await orchestrator.injectMessage({
      role: 'user',
      parts: [
        {
          text: 'Perform a focused security review. Identify vulnerabilities (injection, secrets, insecure config). Output an analytical report. Do not propose edits.',
        },
      ],
    });
    await orchestrator.processTurn(0);
  }
}
