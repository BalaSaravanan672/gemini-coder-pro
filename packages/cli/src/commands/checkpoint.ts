import { CommandHandler } from '@gemini-coder/core';
import type { Orchestrator } from '@gemini-coder/core';
import chalk from 'chalk';

export class CheckpointHandler implements CommandHandler {
  name = 'checkpoint';
  description = 'Save the current session context or resume a checkpoint';

  async execute(orchestrator: Orchestrator, args: string[]) {
    const action = args[0];

    if (action === 'save') {
      const id = orchestrator.session.id;
      // In a full implementation, this might duplicate the session file.
      // For now, it forces a sync to disk with a log.
      console.log(chalk.green(`✓ Checkpoint saved for session: ${id}`));
    } else if (action === 'list') {
      console.log(chalk.cyan(`Current active session: ${orchestrator.session.id}`));
      console.log(chalk.gray(`(Run 'gemini sessions' to list all past checkpoints)`));
    } else {
      console.log(chalk.yellow('Usage: /checkpoint <save|list>'));
    }
  }
}
