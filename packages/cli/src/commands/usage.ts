import { CommandHandler } from '@gemini-coder/core';
import { Orchestrator } from '@gemini-coder/core';
import chalk from 'chalk';

export class UsageHandler implements CommandHandler {
  name = 'usage';
  description = 'Show token usage and estimated cost for the current session';

  async execute(orchestrator: Orchestrator) {
    const tokens = orchestrator.session.tokens || { prompt: 0, candidates: 0, total: 0 };

    // Cost estimation based on standard Gemini 1.5 Pro/Flash pricing (rough estimate)
    // Adjust logic as needed. Assume $3.50 per 1M prompt, $10.50 per 1M candidates for Pro
    const costPerMillionPrompt = 3.5;
    const costPerMillionCandidates = 10.5;

    const promptCost = (tokens.prompt / 1_000_000) * costPerMillionPrompt;
    const candidatesCost = (tokens.candidates / 1_000_000) * costPerMillionCandidates;
    const totalCost = promptCost + candidatesCost;

    console.log(chalk.bold('\nTOKEN USAGE'));
    console.log(chalk.cyan(`• Input:  ${tokens.prompt.toLocaleString()}`));
    console.log(chalk.cyan(`• Output: ${tokens.candidates.toLocaleString()}`));
    console.log(chalk.cyan(`• Total:  ${tokens.total.toLocaleString()}`));
    console.log(chalk.green(`• Cost:   $${totalCost.toFixed(4)}\n`));
  }
}
