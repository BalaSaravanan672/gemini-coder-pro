import * as readline from 'readline/promises';
import { model } from './ai.js';
import { getContextMap } from './context.js';
import { tools } from './tools.js';
import chalk from 'chalk';
import { Content, FunctionDeclarationSchemaType, Part, FunctionDeclaration } from '@google-cloud/vertexai';
import { showDiff } from './diff.js';
import { fileURLToPath } from 'url';

export const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const history: Content[] = [
  {
    role: 'user',
    parts: [{
      text: `You are Gemini Coder Pro, a state-of-the-art AI coding agent. 
Your goal is to autonomously handle complex engineering tasks with high precision and reliability.

CORE PROTOCOLS:
1. PLAN-ACT-VERIFY:
   - PLAN: Analyze the context map and use 'grep_search' or 'list_directory' to find relevant code.
   - ACT: Read files to understand implementation, then propose surgical edits.
   - VERIFY: After every edit, run tests or compilers using 'run_command' to ensure no regressions.
2. AGENTIC AUTONOMY: 
   - Do not ask for permission to use tools for research (reading, searching, listing).
   - Only stop for user approval during 'propose_edits' or 'run_command' (if it modifies state).
   - If a command fails or a tool returns an error, diagnose and fix it immediately without waiting for user input.
3. SURGICAL PRECISION: Use SEARCH/REPLACE blocks that are large enough to be unique but small enough to be surgical.
4. TOKEN EFFICIENCY: Use 'grep_search' and 'list_directory' to narrow down your focus before reading large files.

You are faster and more capable than a standard assistant. You are an autonomous engineer.`
    }]
  },
  {
    role: 'model',
    parts: [{ text: "Gemini Coder Pro initialized. I am ready to autonomously engineer, refactor, and verify your codebase. I will follow the Plan-Act-Verify protocol for every task. What is our objective?" }]
  }
];

const functionDeclarations: FunctionDeclaration[] = [
  {
    name: 'read_files',
    description: 'Read the contents of one or more files.',
    parameters: {
      type: FunctionDeclarationSchemaType.OBJECT,
      properties: {
        paths: {
          type: FunctionDeclarationSchemaType.ARRAY,
          items: { type: FunctionDeclarationSchemaType.STRING },
          description: 'The paths of the files to read.',
        },
      },
      required: ['paths'],
    },
  },
  {
    name: 'run_command',
    description: 'Execute a shell command in the local terminal.',
    parameters: {
      type: FunctionDeclarationSchemaType.OBJECT,
      properties: {
        command: {
          type: FunctionDeclarationSchemaType.STRING,
          description: 'The shell command to execute.',
        },
      },
      required: ['command'],
    },
  },
  {
    name: 'grep_search',
    description: 'Search for a pattern across the codebase (grep).',
    parameters: {
      type: FunctionDeclarationSchemaType.OBJECT,
      properties: {
        pattern: { type: FunctionDeclarationSchemaType.STRING, description: 'The regex pattern to search for.' },
        include: { type: FunctionDeclarationSchemaType.STRING, description: 'Optional glob for files to include (e.g. "*.ts").' },
      },
      required: ['pattern'],
    },
  },
  {
    name: 'list_directory',
    description: 'List the contents of a specific directory.',
    parameters: {
      type: FunctionDeclarationSchemaType.OBJECT,
      properties: {
        path: { type: FunctionDeclarationSchemaType.STRING, description: 'The directory path (default ".").' },
      },
    },
  },
  {
    name: 'propose_edits',
    description: 'Propose surgical edits to files using search/replace blocks.',
    parameters: {
      type: FunctionDeclarationSchemaType.OBJECT,
      properties: {
        edits: {
          type: FunctionDeclarationSchemaType.ARRAY,
          items: {
            type: FunctionDeclarationSchemaType.OBJECT,
            properties: {
              path: { type: FunctionDeclarationSchemaType.STRING },
              search: { type: FunctionDeclarationSchemaType.STRING, description: 'The EXACT literal text to find.' },
              replace: { type: FunctionDeclarationSchemaType.STRING, description: 'The text to replace it with.' },
            },
            required: ['path', 'search', 'replace'],
          },
        },
      },
      required: ['edits'],
    },
  },
];

const MAX_TURNS = 20;
const MAX_RETRIES = 3;

async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  let delay = 2000;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      const isRateLimit = error.message?.includes('429') || error.status === 429;
      if (isRateLimit && i < retries - 1) {
        console.log(chalk.yellow(`\n[System]: Rate limit hit (429). Retrying in ${delay / 1000}s... (Attempt ${i + 1}/${retries})`));
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries reached');
}

async function main() {
  console.log(chalk.blue.bold('Gemini Coder Pro REPL Started. Type "exit" to quit.'));

  while (true) {
    const userInput = await rl.question(chalk.green.bold('\nYou: '));
    if (userInput.toLowerCase() === 'exit') break;

    history.push({ role: 'user', parts: [{ text: userInput }] });

    await processTurn(0);
  }
  rl.close();
}

async function processTurn(turnCount: number) {
  if (turnCount >= MAX_TURNS) {
    console.log(chalk.red(`\n[System]: Max turns (${MAX_TURNS}) reached. Stopping this loop.`));
    return;
  }

  try {
    const contextMap = await getContextMap();
    
    // Create a temporary contents array to avoid polluting long-term history with context maps
    const contents: Content[] = history.map(item => ({
      role: item.role,
      parts: (item.parts || []).map(part => ({ ...part }))
    }));
    
    // Inject the latest context map into the most recent user message
    for (let i = contents.length - 1; i >= 0; i--) {
      if (contents[i].role === 'user') {
        const parts = contents[i].parts;
        if (parts.length > 0 && 'text' in parts[0]) {
          parts[0].text = `CONTEXT_MAP:\n${contextMap}\n\nUSER_REQUEST: ${parts[0].text}`;
        }
        break;
      }
    }

    const result = await withRetry(() => model.generateContent({
      contents,
      tools: [{ functionDeclarations }],
    }));

    const response = result.response;
    if (!response.candidates || response.candidates.length === 0) return;

    const candidate = response.candidates[0];
    const message = candidate.content;

    if (!message || !message.parts) return;

    history.push(message);

    const toolResponses: Part[] = [];

    for (const part of message.parts) {
      if (part.text) {
        console.log(chalk.cyan(`\nGemini: ${part.text}`));
      }
      if (part.functionCall) {
        const { name, args } = part.functionCall;
        console.log(chalk.yellow(`\n[Tool Call]: ${name}(${JSON.stringify(args)})`));

        let functionResponse;
        if (name === 'read_files') {
          functionResponse = await tools.read_files(args as any);
        } else if (name === 'list_directory') {
          functionResponse = await tools.list_directory(args as any);
        } else if (name === 'grep_search') {
          functionResponse = await tools.grep_search(args as any);
        } else if (name === 'run_command') {
          const { command } = args as { command: string };
          console.log(chalk.bold(`\nProposed command: ${chalk.cyan(command)}`));
          const answer = await rl.question(chalk.yellow('Execute this command? (y/n) '));
          if (answer.toLowerCase() === 'y') {
            functionResponse = await tools.run_command({ command });
          } else {
            functionResponse = { status: 'declined' };
          }
        } else if (name === 'propose_edits') {
          const { edits } = args as { edits: { path: string; search: string; replace: string }[] };
          const results = [];
          for (const edit of edits) {
            const success = await showDiff(edit.path, edit.search, edit.replace);
            results.push({
              path: edit.path,
              status: success ? 'applied' : 'declined'
            });
          }
          functionResponse = { status: 'completed', results };
        } else {
          functionResponse = { error: `Unknown tool: ${name}` };
        }

        toolResponses.push({
          functionResponse: {
            name,
            response: { result: functionResponse }
          }
        });
      }
    }

    if (toolResponses.length > 0) {
      history.push({
        role: 'function',
        parts: toolResponses
      });
      // Recurse
      await processTurn(turnCount + 1);
    }
  } catch (error: any) {
    console.error(chalk.red(`Error in processTurn: ${error.message}`));
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url).endsWith(process.argv[1].replace(/^\.\//, ''))) {
  main().catch(error => {
    console.error(chalk.red(`Fatal Error: ${error.message}`));
    process.exit(1);
  });
}
