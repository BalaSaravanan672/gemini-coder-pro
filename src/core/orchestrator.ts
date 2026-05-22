import { client as aiClient } from './ai.js';
import { getContextMap } from './context.js';
import { tools } from './tools.js';
import { showDiff } from './diff.js';
import chalk from 'chalk';
import ora from 'ora';
import highlight from 'cli-highlight';
import { Content, Part, FunctionDeclaration, Type } from '@google/genai';
import { Session, SessionManager } from './session.js';
import * as readline from 'readline/promises';
import { CommandRegistry } from './commands.js';
import { registerAllCommands } from '../commands/index.js';
import fs from 'fs/promises';
import path from 'path';
import { marked } from 'marked';
import { markedTerminal } from 'marked-terminal';

// Configure marked to use terminal rendering
marked.use(markedTerminal() as any);

export const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

export enum OrchestratorMode {
  NORMAL = 'NORMAL',
  PLAN = 'PLAN'
}

const functionDeclarations: FunctionDeclaration[] = [
  {
    name: 'read_files',
    description: 'Read the contents of one or more files.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        paths: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
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
      type: Type.OBJECT,
      properties: {
        command: {
          type: Type.STRING,
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
      type: Type.OBJECT,
      properties: {
        pattern: { type: Type.STRING, description: 'The regex pattern to search for.' },
        include: { type: Type.STRING, description: 'Optional glob for files to include (e.g. "*.ts").' },
      },
      required: ['pattern'],
    },
  },
  {
    name: 'list_directory',
    description: 'List the contents of a specific directory.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        path: { type: Type.STRING, description: 'The directory path (default ".").' },
      },
    },
  },
  {
    name: 'propose_edits',
    description: 'Propose surgical edits to files using search/replace blocks.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        edits: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              path: { type: Type.STRING },
              search: { type: Type.STRING, description: 'The EXACT literal text to find.' },
              replace: { type: Type.STRING, description: 'The text to replace it with.' },
              action: { type: Type.STRING, description: 'Brief description of the action (e.g. "Replace lines 10-15").' },
              reason: { type: Type.STRING, description: 'Technical reason for this change.' },
            },
            required: ['path', 'search', 'replace', 'action', 'reason'],
          },
        },
      },
      required: ['edits'],
    },
  },
];

const MAX_TURNS = 50;
const MAX_RETRIES = 3;

export class Orchestrator {
  public session: Session;
  private sessionManager: SessionManager;
  private mode: OrchestratorMode = OrchestratorMode.NORMAL;
  private model: string;
  public appliedEdits: { path: string, originalContent: string }[] = [];

  constructor(session: Session, sessionManager: SessionManager, model: string = 'gemini-3.1-pro-preview') {
    this.session = session;
    this.sessionManager = sessionManager;
    this.model = model;
  }

  public async initialize() {
    // Register all slash commands
    registerAllCommands();
    
    // Initialize system prompt if new session
    if (this.session.history.length === 0) {
      const systemPrompt = await this.loadSystemPrompt();
      this.session.history.push({
        role: 'user',
        parts: [{
          text: systemPrompt
        }]
      });
      this.session.history.push({
        role: 'model',
        parts: [{ text: "Gemini Coder Pro initialized. Precision coding agent active. Objective?" }]
      });
    }
  }

  private async loadSystemPrompt(): Promise<string> {
    try {
      const promptPath = path.join(process.cwd(), '.gemini-coder', 'system-prompt.md');
      return await fs.readFile(promptPath, 'utf8');
    } catch (error) {
      return `You are Gemini Coder Pro, an autonomous engineering agent.`;
    }
  }

  public getMode(): OrchestratorMode {
    return this.mode;
  }

  public setMode(mode: OrchestratorMode) {
    this.mode = mode;
  }

  public injectMessage(message: Content) {
    this.session.history.push(message);
  }

  private async withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
    let delay = 2000;
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error: any) {
        const errorMsg = String(error.message || error);
        const isRateLimit = errorMsg.includes('429') || error.status === 429;
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

  async chat() {
    console.log(chalk.gray('Type "exit" to quit, "/" for commands.\n'));

    while (true) {
      const modeColor = this.mode === OrchestratorMode.PLAN ? chalk.magenta : chalk.green;
      const promptText = chalk.bold(`${modeColor(`[${this.mode}]`)} ❯ `);
      
      const userInput = await rl.question(promptText);
      if (userInput.trim() === '') continue;
      if (userInput.toLowerCase() === 'exit') break;
      
      if (userInput.startsWith('/')) {
        await this.handleSlashCommand(userInput);
        continue;
      }

      this.session.history.push({ role: 'user', parts: [{ text: userInput }] });
      await this.processTurn(0);
      
      // Save session after every exchange
      this.session.updatedAt = new Date().toISOString();
      await this.sessionManager.saveSession(this.session);
    }
  }

  public async handleSlashCommand(command: string) {
    const [cmd, ...args] = command.slice(1).split(' ');
    
    // Check registry first
    const handler = CommandRegistry.get(cmd);
    if (handler) {
      await handler.execute(this, args);
      return;
    }

    switch (cmd) {
      case 'clear':
      case 'new':
        console.log(chalk.yellow('Starting new session...'));
        this.session = await this.sessionManager.createSession();
        break;
      case 'help':
        console.log(chalk.bold('\nAvailable commands:'));
        CommandRegistry.getAll().forEach(h => {
          console.log(`\/${h.name} - ${h.description}`);
        });
        console.log('/clear - Start a new conversation');
        console.log('/help - Show this help');
        console.log('/exit - Exit the CLI');
        break;
      default:
        console.log(chalk.red(`Unknown command: /${cmd}`));
    }
  }

  public async processTurn(turnCount: number) {
    if (turnCount >= MAX_TURNS) {
      console.log(chalk.red(`\n[System]: Max turns (${MAX_TURNS}) reached. Stopping this loop.`));
      return;
    }

    try {
      const contextMap = await getContextMap();
      
      const contents: Content[] = this.session.history.map(item => ({
        role: item.role,
        parts: item.parts
      }));
      
      // Inject context map into last user message
      for (let i = contents.length - 1; i >= 0; i--) {
        if (contents[i].role === 'user') {
          const parts = contents[i].parts;
          if (parts && parts.length > 0 && 'text' in parts[0]) {
            parts[0].text = `CONTEXT_MAP:\n${contextMap}\n\nUSER_REQUEST: ${parts[0].text}`;
          }
          break;
        }
      }
      
      const spinner = ora(chalk.cyan('Thinking...')).start();
      let responseStream;
      try {
        responseStream = await this.withRetry(async () => await aiClient.models.generateContentStream({
          model: this.model,
          contents,
          config: {
            tools: [{ functionDeclarations }],
          }
        }));
      } catch (err: any) {
        spinner.fail(chalk.red('API Error'));
        console.error(chalk.red(`\n[API Error]: ${err.message || err}`));
        return;
      }

      let responseParts: Part[] = [];
      let finalUsageMetadata: any = null;
      let isFirstChunk = true;
      let functionCalls: any[] = [];

      for await (const chunk of responseStream) {
        if (isFirstChunk) {
          spinner.stop();
          console.log(chalk.blue.bold('\nGemini:'));
          isFirstChunk = false;
        }

        const candidate = chunk.candidates?.[0];
        if (candidate?.content?.parts) {
          responseParts.push(...candidate.content.parts);
        }

        if (chunk.text) {
          const formattedText = marked.parse(chunk.text) as string;
          process.stdout.write(formattedText);
        }

        if (chunk.functionCalls) {
          functionCalls.push(...chunk.functionCalls);
        }
        
        if (chunk.usageMetadata) {
          finalUsageMetadata = chunk.usageMetadata;
        }
      }
      
      if (!isFirstChunk) {
        console.log(); // Newline after stream completes
      } else {
        spinner.stop();
      }

      if (responseParts.length === 0) return;
      
      // Update token tracking
      if (finalUsageMetadata) {
        if (!this.session.tokens) {
          this.session.tokens = { prompt: 0, candidates: 0, total: 0 };
        }
        this.session.tokens.prompt += (finalUsageMetadata.promptTokenCount || 0);
        this.session.tokens.candidates += (finalUsageMetadata.candidatesTokenCount || 0);
        this.session.tokens.total += (finalUsageMetadata.totalTokenCount || 0);
      }

      this.session.history.push({ role: 'model', parts: responseParts });

      if (functionCalls && functionCalls.length > 0) {
        const toolResponses: Part[] = new Array(functionCalls.length);
        
        const executeCall = async (call: any, index: number) => {
          const { name, args } = call;
          const progressLabel = chalk.blue(`● Executing ${name}...`);
          process.stdout.write(progressLabel);

          let functionResponse;
          try {
            // Centralized Plan Mode interception
            if (this.mode === OrchestratorMode.PLAN && ['run_command', 'propose_edits'].includes(name)) {
              functionResponse = { error: `Plan Mode: ${name} is intercepted and not applied.` };
            } 
            // Specialized interactive tool
            else if (name === 'propose_edits') {
              const { edits } = args as { edits: any[] };
              const results = [];
              for (const edit of edits || []) {
                const { success, originalContent } = await showDiff(edit.path, edit.search, edit.replace, edit.action, edit.reason);
                if (success && originalContent) {
                  this.appliedEdits.push({ path: edit.path, originalContent });
                }
                results.push({ path: edit.path, applied: success });
              }
              functionResponse = { results };
            } 
            // Dynamic routing for all other registered tools
            else if (name in tools) {
              functionResponse = await (tools as any)[name](args || {});
            } 
            else {
              functionResponse = { error: `Unknown tool: ${name}` };
            }
            
            // Clear progress line and show success
            process.stdout.clearLine(0);
            process.stdout.cursorTo(0);
            console.log(chalk.green(`✓ ${name} complete`));
          } catch (error: any) {
            process.stdout.clearLine(0);
            process.stdout.cursorTo(0);
            console.log(chalk.red(`✗ ${name} failed`));
            functionResponse = { error: error.message || String(error) };
          }

          toolResponses[index] = {
            functionResponse: {
              name: name,
              response: { result: functionResponse }
            }
          };
        };

        const parallelPromises = [];
        for (let i = 0; i < functionCalls.length; i++) {
          const call = functionCalls[i];
          if (['read_files', 'list_directory', 'grep_search'].includes(call.name || '')) {
            parallelPromises.push(executeCall(call, i));
          }
        }
        await Promise.all(parallelPromises);

        for (let i = 0; i < functionCalls.length; i++) {
          const call = functionCalls[i];
          if (!['read_files', 'list_directory', 'grep_search'].includes(call.name || '')) {
            await executeCall(call, i);
          }
        }

        this.session.history.push({
          role: 'user',
          parts: toolResponses
        });

        await this.processTurn(turnCount + 1);
      }
    } catch (error: any) {
      console.error(chalk.red(`\n[Error]: ${error.message || error}`));
    }
  }
}
