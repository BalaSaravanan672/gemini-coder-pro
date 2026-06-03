import { CommandHandler } from '../core/commands.js';
import { Orchestrator } from '../core/orchestrator.js';
import { toolRegistry } from '../tools/index.js';
import chalk from 'chalk';

export class ExtensionsHandler implements CommandHandler {
  name = 'extensions';
  description = 'List all loaded extensions and tools';

  async execute(orchestrator: Orchestrator, args: string[]) {
    if (args[0] === 'list') {
      console.log(chalk.bold.blue('\n🧩 Loaded Tools & Extensions:'));
      toolRegistry.forEach((tool) => {
        console.log(`- ${chalk.cyan(tool.name)}: ${tool.description}`);
      });
      console.log('');
    } else {
      console.log(chalk.yellow('Usage: /extensions list'));
    }
  }
}
