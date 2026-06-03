import { CommandHandler } from '@gemini-coder/core';
import { Orchestrator } from '@gemini-coder/core';
import { tools } from '@gemini-coder/core';
import { showInteractiveDiff } from '@gemini-coder/core';
import chalk from 'chalk';

export class DiffHandler implements CommandHandler {
  name = 'diff';
  description = 'Show interactive diff of all uncommitted changes';

  async execute(_orchestrator: Orchestrator) {
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
