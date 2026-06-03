import { CommandHandler } from '../core/commands.js';
import { Orchestrator } from '../core/orchestrator.js';

export class TestHandler implements CommandHandler {
  name = 'test';
  description = 'Trigger self-healing test loop until all tests pass';

  async execute(orchestrator: Orchestrator, args: string[]) {
    const testCommand = args.length > 0 ? args.join(' ') : 'npm test';

    await orchestrator.injectMessage({
      role: 'user',
      parts: [
        {
          text: `Execute test command: \`${testCommand}\`. If failure occurs, diagnose error, apply surgical fixes, and retry until pass.`,
        },
      ],
    });

    await orchestrator.processTurn(0);
  }
}
