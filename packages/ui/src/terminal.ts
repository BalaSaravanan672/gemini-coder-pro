import chalk from 'chalk';

export type TerminalMode = 'NORMAL' | 'PLAN';

export const QUICK_ACTIONS = [
  { label: 'Plan', command: '/plan' },
  { label: 'Diff', command: '/diff' },
  { label: 'Review', command: '/review' },
  { label: 'Simplify', command: '/simplify' },
  { label: 'Test', command: '/test' },
] as const;

function getBoxWidth() {
  return Math.max(60, Math.min(process.stdout.columns || 80, 96));
}

function wrapContent(content: string, maxWidth: number): string[] {
  const rawLines = content.split(/\r?\n/);
  const wrapped: string[] = [];

  for (const rawLine of rawLines) {
    const line = rawLine.replace(/\t/g, '  ');

    if (line.length === 0) {
      wrapped.push('');
      continue;
    }

    let remaining = line;
    while (remaining.length > maxWidth) {
      let breakAt = remaining.lastIndexOf(' ', maxWidth);
      if (breakAt <= 0) {
        breakAt = maxWidth;
      }

      wrapped.push(remaining.slice(0, breakAt).trimEnd());
      remaining = remaining.slice(breakAt).trimStart();
    }

    wrapped.push(remaining);
  }

  return wrapped;
}

function boxLine(content: string, width: number) {
  const innerWidth = width - 2;
  const text = content.length > innerWidth ? content.slice(0, innerWidth) : content;
  const padding = ' '.repeat(Math.max(0, innerWidth - text.length));
  return `│${text}${padding}│`;
}

export function printBox(
  title: string,
  lines: string[],
  accent: 'blue' | 'green' | 'magenta' = 'blue'
) {
  const width = getBoxWidth();
  const borderColor =
    accent === 'green' ? chalk.green : accent === 'magenta' ? chalk.magenta : chalk.blue;
  const titleText = ` ${title} `;
  const titlePad = Math.max(0, width - 2 - titleText.length);
  const left = '─'.repeat(Math.floor(titlePad / 2));
  const right = '─'.repeat(titlePad - left.length);

  console.log(borderColor(`┌${left}${titleText}${right}┐`));
  const contentWidth = width - 3;
  for (const line of lines) {
    const wrappedLines = wrapContent(line, Math.max(1, contentWidth));
    for (const wrappedLine of wrappedLines) {
      console.log(borderColor(boxLine(` ${wrappedLine}`, width)));
    }
  }
  console.log(borderColor(`└${'─'.repeat(width - 2)}┘`));
}

export function printBootScreen(appName: string, version: string) {
  console.clear();
  printBox(
    `${appName} ${version}`,
    [
      'Initializing autonomous engineering agent...',
      'Type "exit" to quit, "/" for commands.',
      '',
      'Quick actions:',
      QUICK_ACTIONS.map((action) => `[${action.command}]`).join('   '),
      'Type /actions for the interactive menu.',
    ],
    'blue'
  );
}

export function getPromptText(mode: TerminalMode) {
  const promptColor = mode === 'PLAN' ? chalk.magenta : chalk.green;
  return chalk.bold(`${promptColor('>')} `);
}

export function printAssistantResponse(text: string) {
  const width = Math.max(40, Math.min(process.stdout.columns || 80, 80));
  const line = '─'.repeat(width - 11);
  console.log(chalk.blue.bold(`\n┌── Gemini ${line}`));
  console.log(text);
  console.log(chalk.blue.bold(`└──${'─'.repeat(width - 3)}`));
}

export function printModeChange(mode: TerminalMode) {
  const label =
    mode === 'PLAN' ? chalk.magenta('Plan mode') : chalk.green('Normal mode');
  printBox('Mode', [`${label}`], mode === 'PLAN' ? 'magenta' : 'green');
}

export function printHelp(commands: Array<{ name: string; description: string }>) {
  printBox(
    'Commands',
    [
      ...commands.map((command) => `/${command.name} - ${command.description}`),
      '/clear - Start a new conversation',
      '/help - Show this help',
      '/exit - Exit the CLI',
    ],
    'blue'
  );
}
