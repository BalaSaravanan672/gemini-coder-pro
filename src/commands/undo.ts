import { CommandHandler } from '../core/commands.js';
import { Orchestrator } from '../core/orchestrator.js';
import chalk from 'chalk';
import fs from 'fs/promises';

export class UndoHandler implements CommandHandler {
  name = 'undo';
  description = 'Revert last applied edit';

  async execute(orchestrator: Orchestrator) {
    const lastEdit = orchestrator.appliedEdits.pop();
    if (!lastEdit) {
      console.log(chalk.yellow('No edits to undo.'));
      return;
    }

    try {
      await fs.writeFile(lastEdit.path, lastEdit.originalContent, 'utf8');
      console.log(chalk.green(`\n✓ Reverted change to ${lastEdit.path}`));
    } catch (error: any) {
      console.error(chalk.red(`\n✗ Failed to undo: ${error.message}`));
      // Put it back if it failed?
      orchestrator.appliedEdits.push(lastEdit);
    }
  }
}
