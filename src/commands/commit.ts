import { CommandHandler } from '../core/commands.js';
import { Orchestrator, rl } from '../core/orchestrator.js';
import { tools } from '../core/tools.js';
import chalk from 'chalk';

export class CommitHandler implements CommandHandler {
  name = 'commit';
  description = 'Auto-generate a commit message and commit changes';

  async execute(orchestrator: Orchestrator) {
    try {
      let diffOutput = await tools.run_command({ command: 'git diff --cached' });
      
      if (!diffOutput.stdout || diffOutput.stdout.trim() === '') {
        const unstageDiff = await tools.run_command({ command: 'git diff' });
        if (!unstageDiff.stdout || unstageDiff.stdout.trim() === '') {
          console.log(chalk.yellow('No changes to commit.'));
          return;
        }
        
        const answer = await rl.question(chalk.yellow('No staged changes. Stage all tracked changes (git add -u)? (y/n) '));
        if (answer.toLowerCase() === 'y') {
          await tools.run_command({ command: 'git add -u' });
          diffOutput = await tools.run_command({ command: 'git diff --cached' });
        } else {
          console.log(chalk.yellow('Aborting.'));
          return;
        }
      }

      console.log(chalk.cyan('● Generating commit message...'));
      
      await orchestrator.injectMessage({
        role: 'user',
        parts: [{ text: `Generate a concise, conventional commit message for these changes:\n\n${diffOutput.stdout}\n\nFormat: <type>(<scope>): <subject>\n\n<body>` }]
      });

      await orchestrator.processTurn(0);
      
      const lastMessage = orchestrator.session.history[orchestrator.session.history.length - 1];
      let proposedMessage = '';
      if (lastMessage.role === 'model' && lastMessage.parts) {
         proposedMessage = lastMessage.parts.filter((p: any) => p.text).map((p: any) => p.text).join('').trim();
      }

      if (!proposedMessage) {
        console.log(chalk.red('✗ Failed to generate message.'));
        return;
      }

      console.log(chalk.bold('\nProposed Message:'));
      console.log(chalk.green(proposedMessage));
      
      const answer = await rl.question(chalk.yellow('\n[y] Commit   [e] Edit   [n] Abort: '));
      const cmd = answer.toLowerCase().trim();
      
      if (cmd === 'y') {
        const fs = await import('fs/promises');
        const tmpPath = '.gemini-commit-msg.tmp';
        await fs.writeFile(tmpPath, proposedMessage);
        const result = await tools.run_command({ command: `git commit -F ${tmpPath}` });
        await fs.unlink(tmpPath).catch(() => {});
        
        if (result.exitCode === 0) {
          console.log(chalk.green('✓ Commit successful'));
        } else {
          console.log(chalk.red('✗ Commit failed'));
          console.log(result.stderr || result.stdout);
        }
      } else if (cmd === 'e') {
        console.log(chalk.yellow('Manual commit required.'));
      } else {
        console.log(chalk.yellow('Aborted.'));
      }
      
    } catch (error: any) {
      console.error(chalk.red(`✗ Error: ${error.message}`));
    }
  }
}
