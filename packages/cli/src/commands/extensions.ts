import { CommandHandler } from '@gemini-coder/core';
import { Orchestrator } from '@gemini-coder/core';
import { toolRegistry } from '@gemini-coder/core';
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
