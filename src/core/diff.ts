import fs from 'fs/promises';
import * as diff from 'diff';
import chalk from 'chalk';
import { rl } from './orchestrator.js';

export async function showDiff(path: string, search: string, replace: string): Promise<boolean> {
  try {
    const content = await fs.readFile(path, 'utf8');
    if (!content.includes(search)) {
      console.log(chalk.red(`\n[Diff Error]: Search block not found in ${path}`));
      return false;
    }

    const newContent = content.replace(search, replace);
    const patch = diff.createPatch(path, content, newContent);
    
    console.log(chalk.bold(`\nProposed changes for ${path}:`));
    const lines = patch.split('\n');
    
    // Process lines starting after the header
    let headerPassed = 0;
    for (const line of lines) {
      if (line.startsWith('---') || line.startsWith('+++') || line.startsWith('Index:')) {
        continue;
      }
      if (line.startsWith('+')) {
        process.stdout.write(chalk.green(line + '\n'));
      } else if (line.startsWith('-')) {
        process.stdout.write(chalk.red(line + '\n'));
      } else if (line.startsWith('@@')) {
        process.stdout.write(chalk.cyan(line + '\n'));
      } else {
        process.stdout.write(line + '\n');
      }
    }

    const answer = await rl.question(chalk.yellow('\nApply this change? (y/n) '));
    
    if (answer.toLowerCase() === 'y') {
      await fs.writeFile(path, newContent, 'utf8');
      return true;
    }
    return false;
  } catch (error: any) {
    console.error(chalk.red(`\n[Diff Error]: ${error.message}`));
    return false;
  }
}

export async function showInteractiveDiff(gitDiffOutput: string): Promise<void> {
  if (!gitDiffOutput) return;

  const lines = gitDiffOutput.split('\n');
  for (const line of lines) {
    if (line.startsWith('---') || line.startsWith('+++') || line.startsWith('Index:') || line.startsWith('diff --git')) {
      process.stdout.write(chalk.bold(line + '\n'));
    } else if (line.startsWith('+')) {
      process.stdout.write(chalk.green(line + '\n'));
    } else if (line.startsWith('-')) {
      process.stdout.write(chalk.red(line + '\n'));
    } else if (line.startsWith('@@')) {
      process.stdout.write(chalk.cyan(line + '\n'));
    } else {
      process.stdout.write(line + '\n');
    }
  }
}
