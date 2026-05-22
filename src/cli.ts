import { Command } from 'commander';
import chalk from 'chalk';
import { SessionManager } from './core/session.js';
import { Orchestrator } from './core/orchestrator.js';

const program = new Command();
const sessionManager = new SessionManager();

program
  .name('gemini')
  .description('Gemini Coder Pro CLI - Advanced AI Coding Agent')
  .version('0.2.0');

program
  .command('chat', { isDefault: true })
  .description('Start an interactive chat session')
  .option('-p, --prompt <query>', 'Start with an initial prompt')
  .option('-c, --continue', 'Continue the most recent session')
  .option('-m, --model <name>', 'Specify the model to use', 'gemini-3.5-flash')
  .action(async (options) => {
    console.log(chalk.blue.bold('Gemini Coder Pro starting...'));
    
    let session;
    if (options.continue) {
      session = await sessionManager.getLatestSession();
      if (session) {
        console.log(chalk.gray(`Resuming session: ${session.id}`));
      }
    }
    
    if (!session) {
      session = await sessionManager.createSession();
    }

    const orchestrator = new Orchestrator(session, sessionManager);
    await orchestrator.initialize();
    
    if (options.prompt) {
      orchestrator['session'].history.push({ role: 'user', parts: [{ text: options.prompt }] });
      await orchestrator['processTurn'](0);
    }

    await orchestrator.chat();

    // Execute test commands
    await orchestrator.handleSlashCommand('/plan');
    await orchestrator.handleSlashCommand('/diff');
    await orchestrator.handleSlashCommand('/review');
    await orchestrator.handleSlashCommand('/simplify');
  });

program
  .command('list')
  .description('List recent chat sessions')
  .action(async () => {
    const sessions = await sessionManager.listSessions();
    if (sessions.length === 0) {
      console.log('No sessions found.');
      return;
    }
    console.log(chalk.bold('\nRecent Sessions:'));
    sessions.forEach(s => {
      console.log(`${chalk.cyan(s.id)} - ${chalk.gray(s.updatedAt)}`);
    });
  });

program.parse();
