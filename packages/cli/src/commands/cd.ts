import { CommandHandler } from '@gemini-coder/core';
import { Orchestrator } from '@gemini-coder/core';
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';

export class CdHandler implements CommandHandler {
  name = 'cd';
  description = 'Change the current workspace directory (usage: /cd <path>)';

  async execute(orchestrator: Orchestrator, args: string[] = []) {
    const target = (args.join(' ') || '.').trim();
    const currentRoot = orchestrator.workspaceRoot || process.cwd();
    const resolved = path.isAbsolute(target) ? target : path.resolve(currentRoot, target);

    try {
      const stat = await fs.stat(resolved);
      if (!stat.isDirectory()) {
        console.log(chalk.red(`${resolved} is not a directory.`));
        return;
      }

      await orchestrator.setWorkspaceRoot(resolved);

      console.log(chalk.green(`Changed workspace to ${resolved}`));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(chalk.red(`Cannot navigate to ${resolved}: ${message}`));
    }
  }
}
