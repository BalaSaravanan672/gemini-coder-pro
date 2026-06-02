import { CommandHandler } from '../core/commands.js';
import { Orchestrator } from '../core/orchestrator.js';
import { tools } from '../tools/index.js';
import { showInteractiveDiff } from '../core/diff.js';
import chalk from 'chalk';

export class DiffHandler implements CommandHandler {
  name = 'diff';
  description = 'Show interactive diff of all uncommitted changes';

  async execute(orchestrator: Orchestrator) {
    try {
      const cachedDiff = await tools.run_command({ command: 'git diff --cached' });
      const unstagedDiff = await tools.run_command({ command: 'git diff' });

      const fullDiff = (cachedDiff.stdout || '') + (unstagedDiff.stdout || '');

      if (!fullDiff.trim()) {
        console.log(chalk.yellow('No uncommitted changes.'));
        return;
      }

      await showInteractiveDiff(fullDiff);
    } catch (error: any) {
      console.error(chalk.red(`[Diff Error]: ${error.message}`));
    }
  }
}
