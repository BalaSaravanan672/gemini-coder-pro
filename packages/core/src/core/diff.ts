import fs from 'fs/promises';
import * as diff from 'diff';
import chalk from 'chalk';
import * as recast from 'recast';
import * as babelParser from '@babel/parser';
import { Orchestrator } from './orchestrator.js';

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function flexibleSearch(content: string, search: string): { start: number; end: number } | null {
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

function astReplace(content: string, search: string, replace: string): string | null {
  try {
    const match = flexibleSearch(content, search);
    if (!match) return null;

    // Use Babel to parse the TypeScript/JavaScript code
    const parserConfig = {
      parser: {
        parse(source: string) {
          return babelParser.parse(source, {
            sourceType: 'module',
            plugins: ['typescript', 'jsx', 'decorators-legacy'],
            tokens: true,
          });
        },
      },
    };

    // First, verify the original file is valid
    recast.parse(content, parserConfig);

    // Apply the textual replacement based on the matched location
    const newContent = content.slice(0, match.start) + replace + content.slice(match.end);

    // CRITICAL: Use the AST parser to verify the resulting code is syntactically valid!
    // This prevents the common AI issue of mangling braces, unclosed tags, or broken syntax.
    // If the new content fails to parse, it throws, falling back to safe handling.
    recast.parse(newContent, parserConfig);

    return newContent;
  } catch (err) {
    // Return null if AST parsing fails on either original or new content
    return null;
  }
}

export async function showDiff(
  orchestrator: Orchestrator,
  path: string,
  search: string,
  replace: string,
  action: string = 'Replace content',
  reason: string = 'Requested change',
  autoApply: boolean = false
): Promise<{ success: boolean; originalContent?: string }> {
  try {
    const content = await fs.readFile(path, 'utf8');
    let newContent: string | null = null;
    let fallbackUsed = false;

    const isJS = path.endsWith('.ts') || path.endsWith('.tsx') || path.endsWith('.js') || path.endsWith('.jsx');

    // Try AST-based robust editing for TS/JS files
    if (isJS) {
      newContent = astReplace(content, search, replace);
      
      // If astReplace returns null on a JS file, it means either:
      // 1. flexibleSearch failed to find the block.
      // 2. The original file was syntactically invalid before we touched it.
      // 3. The newly proposed edit introduces a syntax error.
      // We should block the edit if it introduces a syntax error.
      if (!newContent) {
        // Let's see if the search block even exists
        const match = flexibleSearch(content, search);
        if (!match) {
          console.log(chalk.red(`\n[Diff Error]: Search block not found in ${path}`));
          return { success: false };
        }
        
        // It matched, but AST failed. Block the edit to prevent corrupting the file.
        console.log(chalk.red(`\n[AST Error]: The proposed edit introduces a syntax error in ${path}. Edit rejected.`));
        return { success: false };
      }
    }

    // Fallback to basic string search for non-JS files
    if (!newContent) {
      fallbackUsed = true;
      const match = flexibleSearch(content, search);
      if (!match) {
        console.log(chalk.red(`\n[Diff Error]: Search block not found in ${path}`));
        return { success: false };
      }
      newContent = content.slice(0, match.start) + replace + content.slice(match.end);
    }

    if (autoApply) {
      const mode = fallbackUsed ? 'Regex Fallback' : 'AST Verified';
      console.log(chalk.yellow(`\n[Auto]: Applying proposed edit to ${path} (${mode})`));
      await fs.writeFile(path, newContent, 'utf8');
      return { success: true, originalContent: content };
    }

    while (true) {
      const boxWidth = 50;
      const border = chalk.cyan('┌' + '─'.repeat(boxWidth - 2) + '┐');
      const divider = chalk.cyan('├' + '─'.repeat(boxWidth - 2) + '┤');
      const bottom = chalk.cyan('└' + '─'.repeat(boxWidth - 2) + '┘');
      const pipe = chalk.cyan('│');

      const getLength = (str: string) => str.replace(/\u001b\[.*?m/g, '').length;

      const padLine = (label: string, value: string) => {
        const text = `  ${label}: ${value}`;
        const len = getLength(text);
        const remaining = boxWidth - 3 - len;
        return pipe + text + (remaining > 0 ? ' '.repeat(remaining) : '') + pipe;
      };

      let box = border + '\n';
      const title = chalk.bold(`  PROPOSED EDIT ${fallbackUsed ? '(Regex)' : '(AST)'}`);
      const titleLen = getLength(title);
      box += pipe + title + ' '.repeat(Math.max(0, boxWidth - 3 - titleLen)) + pipe + '\n';
      box += padLine('File', path) + '\n';
      box += padLine('Action', action) + '\n';
      box += padLine('Reason', reason) + '\n';
      box += divider + '\n';
      const options = chalk.yellow('  [y] Apply   [n] Skip   [d] Diff');
      const optionsLen = getLength(options);
      box += pipe + options + ' '.repeat(Math.max(0, boxWidth - 3 - optionsLen)) + pipe + '\n';
      box += bottom;

      orchestrator.emit('message', box);
      const answer = await orchestrator.askQuestion(chalk.yellow('Choice: '));
      const cmd = answer.toLowerCase().trim();

      if (cmd === 'y') {
        await fs.writeFile(path, newContent, 'utf8');
        return { success: true, originalContent: content };
      } else if (cmd === 'n') {
        return { success: false };
      } else if (cmd === 'd') {
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`\n[Diff Error]: ${message}`));
    return { success: false };
  }
}

export async function showInteractiveDiff(gitDiffOutput: string): Promise<void> {
  if (!gitDiffOutput) return;

  const lines = gitDiffOutput.split('\n');
  for (const line of lines) {
    if (
      line.startsWith('---') ||
      line.startsWith('+++') ||
      line.startsWith('Index:') ||
      line.startsWith('diff --git')
    ) {
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
