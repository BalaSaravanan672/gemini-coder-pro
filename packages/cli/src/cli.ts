#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { SessionManager, normalizeWorkspaceRoot } from '@gemini-coder/core';
import { Orchestrator } from '@gemini-coder/core';
import { printBootScreen } from '@gemini-coder/ui';
import { registerAllCommands } from './commands/index.js';

const program = new Command();
const sessionManager = new SessionManager();
const cliDir = dirname(fileURLToPath(import.meta.url));

async function getPackageVersion(): Promise<string> {
  const packageJsonPath = resolve(cliDir, '..', 'package.json');
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8')) as { version?: string };
  return packageJson.version ?? '0.0.0';
}

const packageVersion = await getPackageVersion();

program
  .name('gemini-coder')
  .description('Gemini Coder Pro CLI - Advanced AI Coding Agent')
  .version(packageVersion);

program
  .command('chat', { isDefault: true })
  .description('Start an interactive chat session')
  .argument('[query]', 'Optional initial prompt to run')
  .option('-p, --prompt <query>', 'One-off prompt to run and exit (alias for [query])')
  .option('--yolo', 'Auto-approve mode: automatically execute all tool calls')
  .option('--autonomous', 'Alias for --yolo')
  .option('-n, --new', 'Start a new session even if a recent one exists')
  .option('-c, --continue', 'Continue the most recent session')
  .option('--resume <id>', 'Resume a specific session by ID')
  .option('--session <id>', 'Alias for --resume')
  .option('-m, --model <name>', 'Specify the model to use', 'gemini-3.5-flash')
  .action(async (queryArg, options) => {
    printBootScreen('Gemini Coder Pro', `v${packageVersion}`);
    registerAllCommands();

    const query = queryArg || options.prompt;

    const isOneOff = !!options.prompt;
    const isYolo = !!(options.yolo || options.autonomous);

    let session;
    const workspaceRoot = normalizeWorkspaceRoot(process.cwd());
    const resumeId = String(options.resume ?? options.session ?? '').trim();

    if (resumeId) {
      session = await sessionManager.loadSession(resumeId);
      if (session) {
        console.log(chalk.green(`✓ Resuming session: ${session.id}`));
      } else {
        console.log(chalk.red(`Could not find session: ${resumeId}`));
        process.exitCode = 1;
        return;
      }
    } else if (options.new) {
      session = await sessionManager.createSession('default', workspaceRoot);
    } else if (options.continue) {
      session = await sessionManager.getLatestSessionForWorkspace(workspaceRoot);
      if (session) {
        console.log(chalk.green(`✓ Resuming session: ${session.id}`));
      }
    }

    if (!session) {
      session = await sessionManager.createSession('default', workspaceRoot);
    }

    const sessionWorkspaceRoot = normalizeWorkspaceRoot(session.workspaceRoot ?? workspaceRoot);
    session.workspaceRoot = sessionWorkspaceRoot;
    try {
      process.chdir(sessionWorkspaceRoot);
    } catch {
      // Best effort
    }

    const orchestrator = new Orchestrator(
      session,
      sessionManager,
      options.model,
      sessionWorkspaceRoot,
      isYolo
    );
    await orchestrator.initialize();

    if (query) {
      orchestrator['session'].history.push({ role: 'user', parts: [{ text: query }] });
      await orchestrator['processTurn'](0);

      if (isOneOff) {
        // Exit for one-off prompts
        process.exit(0);
      }
    }

    await orchestrator.chat();
  });

program
  .command('sessions')
  .alias('list')
  .description('List saved chat sessions')
  .action(async () => {
    const sessions = await sessionManager.listSessions();
    if (sessions.length === 0) {
      console.log(chalk.yellow('No sessions found.'));
      return;
    }

    console.log(chalk.bold.blue('\n📊 Recent Sessions:'));
    const table = new Table({
      head: [
        chalk.cyan('Session ID'),
        chalk.cyan('Workspace Root'),
        chalk.cyan('Last Updated'),
        chalk.cyan('Tokens (Total)'),
      ],
      style: { head: [], border: [] },
    });

    sessions.forEach((s) => {
      table.push([
        s.id,
        s.workspaceRoot ?? '(unknown)',
        new Date(s.updatedAt).toLocaleString(),
        s.tokens?.total?.toLocaleString() || '0',
      ]);
    });

    console.log(table.toString());
  });

program.parse();
