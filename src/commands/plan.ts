import { CommandHandler } from '../core/commands.js';
import { Orchestrator, OrchestratorMode } from '../core/orchestrator.js';
import chalk from 'chalk';

export class PlanHandler implements CommandHandler {
  name = 'plan';
  description = 'Toggle Plan Mode (read-only strategizing)';

  async execute(orchestrator: Orchestrator) {
    const currentMode = orchestrator.getMode();
    const newMode = currentMode === OrchestratorMode.PLAN 
      ? OrchestratorMode.NORMAL 
      : OrchestratorMode.PLAN;
    
    orchestrator.setMode(newMode);
    console.log(chalk.blue.bold(`\n[Mode]: Switched to ${newMode}`));
    if (newMode === OrchestratorMode.PLAN) {
      console.log(chalk.blue('Tool calls that modify state will be intercepted. Edits will not be applied.'));
    }
  }
}
