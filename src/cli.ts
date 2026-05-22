// This is a comment
import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
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
  .option('-m, --model <name>', 'Specify the model to use', 'gemini-3.1-pro-preview')
  .action(async (options) => {
    console.clear();
    console.log(chalk.bold.blue('⚡ Gemini Coder Pro ' + chalk.gray('v0.2.0')));
    console.log(chalk.gray('Initializing autonomous engineering agent...\n'));
    
    let session;
    if (options.continue) {
      session = await sessionManager.getLatestSession();
      if (session) {
        console.log(chalk.green(`✓ Resuming session: ${session.id}`));
      }
    }
    
    if (!session) {
      session = await sessionManager.createSession();
    }

    const orchestrator = new Orchestrator(session, sessionManager, options.model);
    await orchestrator.initialize();
    
    if (options.prompt) {
      orchestrator['session'].history.push({ role: 'user', parts: [{ text: options.prompt }] });
      await orchestrator['processTurn'](0);
    }

    await orchestrator.chat();
  });

program
  .command('list')
  .description('List recent chat sessions')
  .action(async () => {
    const sessions = await sessionManager.listSessions();
    if (sessions.length === 0) {
      console.log(chalk.yellow('No sessions found.'));
      return;
    }
    
    console.log(chalk.bold.blue('\n📊 Recent Sessions:'));
    const table = new Table({
      head: [chalk.cyan('Session ID'), chalk.cyan('Last Updated'), chalk.cyan('Tokens (Total)')],
      style: { head: [], border: [] }
    });
    
    sessions.forEach(s => {
      table.push([
        s.id,
        new Date(s.updatedAt).toLocaleString(),
        s.tokens?.total?.toLocaleString() || '0'
      ]);
    });
    
    console.log(table.toString());
  });

program.parse();
