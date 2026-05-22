import fs from 'fs/promises';
import * as diff from 'diff';
import chalk from 'chalk';
import { rl } from './orchestrator.js';

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function flexibleSearch(content: string, search: string): { start: number, end: number } | null {
  const exactIndex = content.indexOf(search);
  if (exactIndex !== -1) {
    return { start: exactIndex, end: exactIndex + search.length };
  }
  
  const tokens = search.trim().split(/\s+/);
  if (tokens.length === 0) return null;
  
  const pattern = tokens.map(escapeRegExp).join('\\s+');
  const regex = new RegExp(pattern);
  const match = content.match(regex);
  if (match && match.index !== undefined) {
    return { start: match.index, end: match.index + match[0].length };
  }
  
  return null;
}

export async function showDiff(path: string, search: string, replace: string, action: string = 'Replace content', reason: string = 'Requested change'): Promise<{ success: boolean, originalContent?: string }> {
  try {
    const content = await fs.readFile(path, 'utf8');
    const match = flexibleSearch(content, search);

    if (!match) {
      console.log(chalk.red(`\n[Diff Error]: Search block not found in ${path}`));
      return { success: false };
    }

    const newContent = content.slice(0, match.start) + replace + content.slice(match.end);
    
    while (true) {
      // ... same boxed UI code ...
      const boxWidth = 50;
      const border = chalk.cyan('┌' + '─'.repeat(boxWidth - 2) + '┐');
      const divider = chalk.cyan('├' + '─'.repeat(boxWidth - 2) + '┤');
      const bottom = chalk.cyan('└' + '─'.repeat(boxWidth - 2) + '┘');
      const pipe = chalk.cyan('│');

      const padLine = (label: string, value: string) => {
        const line = `  ${label}: ${value}`;
        const remaining = boxWidth - 3 - line.length;
        return pipe + line + (remaining > 0 ? ' '.repeat(remaining) : '') + pipe;
      };

      console.log('\n' + border);
      console.log(pipe + chalk.bold('  PROPOSED EDIT'.padEnd(boxWidth - 3)) + pipe);
      console.log(padLine('File', path));
      console.log(padLine('Action', action));
      console.log(padLine('Reason', reason));
      console.log(divider);
      console.log(pipe + chalk.yellow('  [y] Apply   [n] Skip   [d] Diff'.padEnd(boxWidth - 3)) + pipe);
      console.log(bottom);

      const answer = await rl.question(chalk.yellow('Choice: '));
      const cmd = answer.toLowerCase().trim();
      
      if (cmd === 'y') {
        await fs.writeFile(path, newContent, 'utf8');
        return { success: true, originalContent: content };
      } else if (cmd === 'n') {
        return { success: false };
      } else if (cmd === 'd') {
        // ... same diff code ...
        const patch = diff.createPatch(path, content, newContent);
        console.log(chalk.bold(`\n${chalk.cyan(path)}`));
        const lines = patch.split('\n');
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
      }
    }
  } catch (error: any) {
    console.error(chalk.red(`\n[Diff Error]: ${error.message}`));
    return { success: false };
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
