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
      text: `You are Gemini Coder, an expert AI pair programmer similar to Aider or Claude Code.
You have direct access to the user's local workspace via tools.

GUIDELINES:
1. PROACTIVE: Do not just offer to help. If the user asks for a change, use 'read_files' to understand the code, 'propose_edits' to implement it, and 'run_command' to verify it.
2. SURGICAL: When using 'propose_edits', use specific SEARCH/REPLACE blocks. Keep changes focused.
3. TERMINAL ACCESS: You can run shell commands using 'run_command'. Use it for testing, linting, or checking the environment.
4. AWARE: You will receive a 'Context Map' with every message. Use it to find the files you need.
5. HONEST: If you are unsure, read more files or run tests before proposing edits.

Your goal is to autonomously implement features, fix bugs, and refactor code as requested.`
    }]
  },
  {
    role: 'model',
    parts: [{ text: "Understood. I am Gemini Coder, ready to help you build, refactor, and test your project. I will use the provided tools to read your code, propose surgical edits, and run commands as needed. What shall we work on first?" }]
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
    name: 'propose_edits',
    description: 'Propose edits to one or more files.',
    parameters: {
      type: FunctionDeclarationSchemaType.OBJECT,
      properties: {
        edits: {
          type: FunctionDeclarationSchemaType.ARRAY,
          items: {
            type: FunctionDeclarationSchemaType.OBJECT,
            properties: {
              path: { type: FunctionDeclarationSchemaType.STRING },
              search: { type: FunctionDeclarationSchemaType.STRING },
              replace: { type: FunctionDeclarationSchemaType.STRING },
            },
            required: ['path', 'search', 'replace'],
          },
        },
      },
      required: ['edits'],
    },
  },
];

const MAX_TURNS = 10;

async function main() {
  console.log(chalk.blue('Gemini Coder REPL Started. Type "exit" to quit.'));

  while (true) {
    const userInput = await rl.question(chalk.green('\nYou: '));
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
    
    // Inject the latest context map into the most recent user message for the model's awareness
    for (let i = contents.length - 1; i >= 0; i--) {
      if (contents[i].role === 'user') {
        const parts = contents[i].parts;
        if (parts.length > 0 && 'text' in parts[0]) {
          parts[0].text = `Context:\n${contextMap}\n\nUser: ${parts[0].text}`;
        }
        break;
      }
    }

    const result = await model.generateContent({
      contents,
      tools: [{ functionDeclarations }],
    });

    const response = result.response;
    if (!response.candidates || response.candidates.length === 0) {
        console.log(chalk.red('No candidates in response.'));
        return;
    }

    const candidate = response.candidates[0];
    const message = candidate.content;

    if (!message || !message.parts) {
      console.log(chalk.red('\n[Gemini Error]: Received an empty or malformed response.'));
      return;
    }

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
      // Recurse to handle the model's response to the tool output
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
