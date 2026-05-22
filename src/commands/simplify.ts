import { CommandHandler } from '../core/commands.js';
import { Orchestrator } from '../core/orchestrator.js';

export class SimplifyHandler implements CommandHandler {
  name = 'simplify';
  description = 'Analyze and simplify complex code areas';

  async execute(orchestrator: Orchestrator) {
    await orchestrator.injectMessage({
      role: 'user',
      parts: [{ text: "Analyze recently edited files. Identify high complexity or 'code smells'. Propose simplified refactor for one area. Verify with tests." }]
    });
    await orchestrator.processTurn(0);
  }
}
