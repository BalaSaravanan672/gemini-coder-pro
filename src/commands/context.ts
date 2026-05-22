import { CommandHandler } from '../core/commands.js';
import { Orchestrator } from '../core/orchestrator.js';
import chalk from 'chalk';

export class ContextHandler implements CommandHandler {
  name = 'context';
  description = 'Show which files you have read this session';

  async execute(orchestrator: Orchestrator) {
    const readFiles = new Set<string>();
    
    for (const message of orchestrator.session.history) {
      if (message.role === 'model' && message.parts) {
        for (const part of message.parts) {
          if (part.functionCall && part.functionCall.name === 'read_files') {
            const paths = part.functionCall.args.paths as string[];
            paths.forEach(p => readFiles.add(p));
          }
        }
      }
    }

    if (readFiles.size === 0) {
      console.log(chalk.yellow('No files read this session.'));
      return;
    }

    console.log(chalk.bold('\nFiles read this session:'));
    Array.from(readFiles).sort().forEach(f => {
      console.log(chalk.cyan(`  • ${f}`));
    });
  }
}
