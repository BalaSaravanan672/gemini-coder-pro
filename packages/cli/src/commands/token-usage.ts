import { CommandHandler } from '@gemini-coder/core';
import type { Orchestrator } from '@gemini-coder/core';
import chalk from 'chalk';

export class TokenUsageHandler implements CommandHandler {
  name = 'token-usage';
  description = 'Display real-time token consumption for the current session';

  async execute(orchestrator: Orchestrator, _args: string[]) {
    const tokens = orchestrator.session.tokens;
    
    if (!tokens || tokens.total === 0) {
      console.log(chalk.yellow('No token usage recorded for this session yet.'));
      return;
    }

    console.log(chalk.bold.blue('\n📊 Session Token Usage:'));
    console.log(`- ${chalk.cyan('Prompt Tokens:')}    ${tokens.prompt.toLocaleString()}`);
    console.log(`- ${chalk.cyan('Candidate Tokens:')} ${tokens.candidates.toLocaleString()}`);
    console.log(`- ${chalk.cyan('Total Tokens:')}     ${chalk.bold(tokens.total.toLocaleString())}\n`);
  }
}
