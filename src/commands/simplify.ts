import { CommandHandler } from '../core/commands.js';
import { Orchestrator } from '../core/orchestrator.js';

export class SimplifyHandler implements CommandHandler {
  name = 'simplify';
  description = 'Analyze and simplify complex code areas in recently edited files';

  async execute(orchestrator: Orchestrator) {
    await orchestrator.injectMessage({
      role: 'user',
      parts: [{ text: "Analyze the most recently edited files in the workspace. Identify areas with high complexity or 'code smells'. Propose a simplified, more readable refactor for one of these areas. After proposing the edits, run the project's tests (e.g., 'npm test' or equivalent) to verify that behavior is preserved." }]
    });
    await orchestrator.processTurn(0);
  }
}
