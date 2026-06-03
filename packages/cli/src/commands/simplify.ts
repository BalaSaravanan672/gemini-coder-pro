import { CommandHandler } from '@gemini-coder/core';
import { Orchestrator } from '@gemini-coder/core';

export class SimplifyHandler implements CommandHandler {
  name = 'simplify';
  description = 'Analyze and simplify complex code areas';

  async execute(orchestrator: Orchestrator) {
    await orchestrator.injectMessage({
      role: 'user',
      parts: [
        {
          text: "Analyze recently edited files. Identify high complexity or 'code smells'. Propose simplified refactor for one area. Verify with tests.",
        },
      ],
    });
    await orchestrator.processTurn(0);
  }
}
