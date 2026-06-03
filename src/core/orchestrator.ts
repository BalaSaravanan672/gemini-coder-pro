import { client as aiClient } from './ai.js';
import { getContextMap } from './context.js';
import { tools } from '../tools/index.js';
import { showDiff } from './diff.js';
import chalk from 'chalk';
import ora from 'ora';
import { Content, Part, FunctionCall, UsageMetadata } from '@google/genai';
import { Session, SessionManager } from './session.js';
import { normalizeWorkspaceRoot } from './session.js';
import * as readline from 'readline/promises';
import { CommandRegistry } from './commands.js';
import { registerAllCommands } from '../commands/index.js';
import fs from 'fs/promises';
import path from 'path';
import { marked } from 'marked';
import { markedTerminal } from 'marked-terminal';
import inquirer from 'inquirer';
import {
  getPromptText,
  printAssistantResponse,
  printHelp,
  printModeChange,
  printBox,
} from '../ui/terminal.js';
import { formatTransportError, isTransportError } from './transport/errors.js';
import { ToolManager } from './services/tools.js';
import { ContextService } from './services/context.js';
import { PromptService } from './services/prompt.js';

// Configure marked to use terminal rendering
// eslint-disable-next-line @typescript-eslint/no-explicit-any
marked.use(markedTerminal() as any);

export enum OrchestratorMode {
  NORMAL = 'NORMAL',
  PLAN = 'PLAN',
}

const MAX_TURNS = 50;

function isVisibleTextPart(part: Part): part is Part & { text: string } {
  return 'text' in part && typeof part.text === 'string' && part.text.trim().length > 0;
}

function isPersistablePart(part: Part): boolean {
  if (!('text' in part)) {
    return true;
  }

  return typeof part.text === 'string' ? part.text.trim().length > 0 : false;
}

export class Orchestrator {
  public session: Session;
  private sessionManager: SessionManager;
  private mode: OrchestratorMode = OrchestratorMode.NORMAL;
  private model: string;
  public workspaceRoot: string;
  public autonomous: boolean = false;
  public rl: readline.Interface;
  private forceTextResponseMode: boolean = false;
  private consecutiveToolTurns: number = 0;
  private lastTurnExecutedTools: boolean = false;
  public appliedEdits: { path: string; originalContent: string }[] = [];
  constructor(
    session: Session,
    sessionManager: SessionManager,
    model: string = 'gemini-3.5-flash',
    workspaceRoot: string = process.cwd(),
    autonomous: boolean = false
  ) {
    this.session = session;
    this.sessionManager = sessionManager;
    this.model = model;
    this.workspaceRoot = normalizeWorkspaceRoot(workspaceRoot);
    this.autonomous = autonomous;
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  private async syncSessionWorkspaceRoot(): Promise<void> {
    this.session.workspaceRoot = this.workspaceRoot;
  }

  public async initialize() {
    // Register all slash commands
    registerAllCommands();

    // Load extensions (tools)
    await ToolManager.loadExtensions(this.workspaceRoot);

    // Ensure the session follows the current workspaceRoot and use a workspace-specific prompt.
    let basePrompt = await this.loadSystemPrompt();
    const geminiInstructions = await ContextService.loadGeminiInstructions(this.workspaceRoot);
    if (geminiInstructions) {
      basePrompt += `\n\n## Project Instructions (from GEMINI.md)\n${geminiInstructions}`;
    }
    const systemPrompt = PromptService.appendConcisePolicy(basePrompt);
    await this.syncSessionWorkspaceRoot();

    if (this.session.history.length === 0) {
      this.session.history.push({ role: 'user', parts: [{ text: systemPrompt }] });
      this.session.history.push({
        role: 'model',
        parts: [{ text: 'Gemini Coder Pro initialized. What do you want to work on?' }],
      });
    } else {
      // Replace the first history entry with the workspace-specific system prompt to avoid stale repo prompts
      try {
        this.session.history[0] = { role: 'user', parts: [{ text: systemPrompt }] };
      } catch {
        // ignore
      }
    }
    // Ensure the process working directory matches the orchestrator workspaceRoot
    try {
      process.chdir(this.workspaceRoot);
    } catch {
      // ignore: if chdir fails, tools will still resolve against workspaceRoot explicitly
    }
    // Persist session after initialization changes
    try {
      await this.sessionManager.saveSession(this.session);
    } catch {
      // ignore
    }
  }

  public async setWorkspaceRoot(workspaceRoot: string) {
    this.workspaceRoot = normalizeWorkspaceRoot(workspaceRoot);
    await this.syncSessionWorkspaceRoot();

    try {
      process.chdir(this.workspaceRoot);
    } catch {
      // ignore: if chdir fails, tools will still resolve against workspaceRoot explicitly
    }

    try {
      await this.sessionManager.saveSession(this.session);
    } catch {
      // ignore
    }
  }

  private async loadSystemPrompt(): Promise<string> {
    try {
      const promptPath = path.join(this.workspaceRoot, '.gemini-coder', 'system-prompt.md');
      return await fs.readFile(promptPath, 'utf8');
    } catch {
      return `You are Gemini Coder Pro, an autonomous engineering agent.`;
    }
  }

  public getMode(): OrchestratorMode {
    return this.mode;
  }

  public setMode(mode: OrchestratorMode) {
    this.mode = mode;
    printModeChange(mode);
  }

  public injectMessage(message: Content) {
    this.session.history.push(message);
  }

  async chat() {
    const isInteractive = process.stdout.isTTY;

    while (true) {
      let userInput = '';
      try {
        userInput = await this.rl.question(getPromptText(this.mode));
      } catch (error: unknown) {
        // Handle readline errors gracefully
        const err = error as Record<string, unknown>;
        if (
          err?.code === 'ABORT_ERR' ||
          err?.name === 'AbortError' ||
          err?.code === 'ERR_USE_AFTER_CLOSE'
        ) {
          // In non-interactive mode (piped input), EOF is expected and should exit gracefully
          if (!isInteractive) {
            break;
          }
          console.log(chalk.yellow('\nSession interrupted. Exiting...'));
          break;
        }
        throw error;
      }

      if (userInput.trim() === '') continue;
      if (userInput.toLowerCase() === 'exit') break;

      if (userInput.startsWith('/')) {
        await this.handleSlashCommand(userInput);
        continue;
      }

      // Quick local handlers for common project queries to avoid model round-trips
      // Accept common misspellings: "expain", "explian"
      const explainProjectMatch =
        /^\s*(?:explain|expain|explian)(?:\s+(?:the|this))?\s+project\b|^\s*(?:list(?:\s+files|\s+project(?: files)?)?)\b/i;
      if (explainProjectMatch.test(userInput)) {
        try {
          const entries = await fs.readdir(this.workspaceRoot, { withFileTypes: true });
          const names = entries.map((e) => (e.isDirectory() ? `${e.name}/` : e.name)).slice(0, 200);
          const readmePath = path.join(this.workspaceRoot, 'README.md');
          let readme = '';
          try {
            readme = await fs.readFile(readmePath, 'utf8');
          } catch {
            // ignore missing README
          }

          const summaryLines: string[] = [];
          summaryLines.push(`Files: ${names.length > 0 ? names.join(', ') : '(empty)'}.`);
          if (readme.trim()) {
            const max = 4000;
            const excerpt = readme.length > max ? `${readme.slice(0, max)}...` : readme;
            summaryLines.push(`README excerpt:\n${excerpt}`);
            if (readme.length > max) {
              summaryLines.push(
                `(README truncated — ask "show README" or run the CLI from the project to view the full file.)`
              );
            }
          }

          printAssistantResponse(summaryLines.join('\n\n'));
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          printAssistantResponse(`Unable to read project directory: ${message}`);
        }
        continue;
      }

      // Natural-language navigation: "navigate to X", "cd X", "chdir X"
      const navMatch = userInput.match(/^\s*(?:navigate to|cd|chdir)\s+(.+)$/i);
      if (navMatch) {
        const target = navMatch[1].trim();
        const resolved = path.isAbsolute(target)
          ? target
          : path.resolve(this.workspaceRoot, target);
        try {
          const stat = await fs.stat(resolved);
          if (!stat.isDirectory()) {
            printAssistantResponse(`Cannot navigate: ${target} is not a directory.`);
          } else {
            await this.setWorkspaceRoot(resolved);
            printAssistantResponse(`Changed workspace to ${resolved}`);
          }
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          printAssistantResponse(`Cannot navigate to ${target}: ${message}`);
        }
        continue;
      }

      // Local project/directory queries handled locally to avoid model inconsistencies
      const simpleQuery = userInput.match(
        /^\s*(?:which project are you in\??|which directory are you in\??|where are you\??)\s*$/i
      );
      if (simpleQuery) {
        printAssistantResponse(`I am in ${this.workspaceRoot}`);
        continue;
      }

      // Direct boolean check: "are you in <path>?"
      const areYouIn = userInput.match(/^\s*are you in\s+(.+?)\s*\??$/i);
      if (areYouIn) {
        const target = areYouIn[1].trim();
        const resolved = path.isAbsolute(target)
          ? target
          : path.resolve(this.workspaceRoot, target);
        const isSame = path.resolve(this.workspaceRoot) === path.resolve(resolved);
        printAssistantResponse(
          isSame ? `Yes — I am in ${this.workspaceRoot}` : `No — I am in ${this.workspaceRoot}`
        );
        continue;
      }

      this.session.history.push({ role: 'user', parts: [{ text: userInput }] });
      await this.processTurn(0);

      // Save session after every exchange
      this.session.updatedAt = new Date().toISOString();
      try {
        await this.sessionManager.saveSession(this.session);
      } catch {
        // ignore
      }
    }

    this.rl.close();
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
        this.session = await this.sessionManager.createSession('default', this.workspaceRoot);
        await this.initialize();
        break;
      case 'help':
        printHelp(CommandRegistry.getAll());
        break;
      case 'actions': {
        printBox('Actions', ['Choose an interactive command.'], 'blue');
        const answer = await inquirer.prompt([
          {
            type: 'expand',
            name: 'command',
            message: 'Action',
            choices: [
              { key: 'p', name: 'Plan', value: '/plan' },
              { key: 'd', name: 'Diff', value: '/diff' },
              { key: 'r', name: 'Review', value: '/review' },
              { key: 's', name: 'Simplify', value: '/simplify' },
              { key: 't', name: 'Test', value: '/test' },
              { key: 'c', name: 'Cancel', value: null },
            ],
          },
        ]);
        if (answer.command) {
          await this.handleSlashCommand(answer.command);
        }
        break;
      }
      default:
        console.log(chalk.red(`Unknown command: /${cmd}`));
    }
  }

  public async processTurn(turnCount: number, maxOutputTokensOverride?: number) {
    if (turnCount >= MAX_TURNS) {
      console.log(chalk.red(`\n[System]: Max turns (${MAX_TURNS}) reached. Stopping this loop.`));
      return;
    }

    try {
      const contents: Content[] = this.session.history.map((item) => ({
        role: item.role,
        parts: item.parts,
      }));

      let latestUserText = '';
      for (let i = contents.length - 1; i >= 0; i--) {
        if (contents[i].role === 'user') {
          const parts = contents[i].parts;
          if (parts && parts.length > 0 && 'text' in parts[0]) {
            latestUserText = String(parts[0].text || '');
          }
          break;
        }
      }

      const fileContext = latestUserText
        ? await ContextService.loadReferencedFileContext(this.workspaceRoot, latestUserText)
        : '';
      const autoDiscoveryContext = latestUserText
        ? await ContextService.buildAutoDiscoveryContext(this.workspaceRoot, latestUserText)
        : '';
      const atOperatorContext = latestUserText
        ? await ContextService.loadAtOperatorContext(this.workspaceRoot, latestUserText)
        : '';

      const shouldInjectRepoContext =
        latestUserText && ContextService.shouldInjectContextMap(latestUserText) && !fileContext;

      if (
        latestUserText &&
        (shouldInjectRepoContext || fileContext || autoDiscoveryContext || atOperatorContext)
      ) {
        let contextMap = '';
        if (shouldInjectRepoContext) {
          contextMap = await getContextMap(this.workspaceRoot);
        }

        for (let i = contents.length - 1; i >= 0; i--) {
          if (contents[i].role === 'user') {
            const parts = contents[i].parts;
            if (parts && parts.length > 0 && 'text' in parts[0]) {
              const contextSections = [
                shouldInjectRepoContext ? `CONTEXT_MAP:\n${contextMap}` : '',
                atOperatorContext,
                fileContext,
                autoDiscoveryContext,
              ].filter((section) => section.trim().length > 0);

              parts[0].text = `${contextSections.join('\n\n')}\n\nUSER_REQUEST: ${parts[0].text}`;
            }
            break;
          }
        }
      }

      const useTools = ContextService.shouldInjectContextMap(latestUserText);
      const maxOutputTokens =
        maxOutputTokensOverride ??
        (this.forceTextResponseMode ? 512 : PromptService.getMaxOutputTokens(latestUserText));
      const temperature = PromptService.getTemperature(latestUserText);

      const spinner = ora(chalk.cyan('Thinking...')).start();
      let responseStream;
      try {
        responseStream = await aiClient.models.generateContentStream({
          model: this.model,
          contents,
          config: {
            ...(useTools
              ? { tools: [{ functionDeclarations: ToolManager.getDeclarations() }] }
              : {}),
            maxOutputTokens,
            temperature,
          },
        });
      } catch (error: unknown) {
        spinner.fail(chalk.red('API Error'));
        const message = isTransportError(error)
          ? formatTransportError(error)
          : error instanceof Error
            ? error.message
            : String(error);

        const errorString = error instanceof Error ? error.message : String(error);
        const isOauthDnsIssue =
          errorString.includes('oauth2.googleapis.com') ||
          errorString.includes('ENOTFOUND') ||
          errorString.includes('EAI_AGAIN') ||
          errorString.includes('ECONNRESET');

        console.error(chalk.red(`\n[API Error]: ${message}`));

        if (!isTransportError(error) && isOauthDnsIssue) {
          console.error(
            chalk.yellow(
              '\n[Hint]: The CLI could not reach oauth2.googleapis.com to exchange the service-account token. Check network access, DNS, firewall, or proxy settings on this machine, then retry.'
            )
          );
        }
        return;
      }

      let responseParts: Part[] = [];
      let finalUsageMetadata: UsageMetadata | null = null;
      let finalFinishReason: string | undefined;
      let isFirstChunk = true;
      const functionCallsByKey = new Map<string, FunctionCall>();
      let assistantText = '';

      for await (const chunk of responseStream) {
        if (isFirstChunk) {
          spinner.stop();
          isFirstChunk = false;
        }

        const candidate = chunk.candidates?.[0];
        const parts = candidate?.content?.parts ?? [];
        if (parts.length > 0) {
          responseParts.push(...parts.filter(isPersistablePart));

          const textParts = parts
            .filter(isVisibleTextPart)
            .map((part: Part & { text: string }) => part.text)
            .join('');

          if (textParts) {
            assistantText += textParts;
          }

          // Also extract function calls from parts if present
          for (const part of parts) {
            if ('functionCall' in part && part.functionCall) {
              const call = part.functionCall;
              const key =
                (call as { id?: string }).id ??
                `${call.name ?? 'unknown'}:${JSON.stringify(call.args ?? {})}`;
              functionCallsByKey.set(key, call);
            }
          }
        }

        if (candidate?.finishReason) {
          finalFinishReason = String(candidate.finishReason);
        }

        if (chunk.functionCalls) {
          for (const call of chunk.functionCalls) {
            const key =
              (call as { id?: string }).id ??
              `${call.name ?? 'unknown'}:${JSON.stringify(call.args ?? (call as { partialArgs?: unknown }).partialArgs ?? {})}`;
            functionCallsByKey.set(key, call);
          }
        }

        if (chunk.usageMetadata) {
          finalUsageMetadata = chunk.usageMetadata;
        }
      }

      if (!isFirstChunk && assistantText.trim()) {
        const formattedText = marked.parse(assistantText) as string;
        printAssistantResponse(formattedText.trim());
      } else {
        spinner.stop();
      }

      if (responseParts.length === 0) {
        // If tools were just executed in the previous turn (or the session history
        // contains a recent tool-response entry), suppress this generic message
        // because a forced continuation or tool-summary flow may be in progress.
        const lastHist = this.session.history[this.session.history.length - 1];
        const recentToolHistory = !!(
          lastHist &&
          lastHist.role === 'user' &&
          Array.isArray(lastHist.parts) &&
          lastHist.parts.some((p: Part) => p && typeof p === 'object' && 'functionResponse' in p)
        );

        if (this.lastTurnExecutedTools || recentToolHistory) {
          // Suppress noisy message; allow higher-level logic to continue or retry.
          return;
        }

        printAssistantResponse(
          'I did not receive a complete response from the model. Please try again.'
        );
        return;
      }

      // Update token tracking
      if (finalUsageMetadata) {
        if (!this.session.tokens) {
          this.session.tokens = { prompt: 0, candidates: 0, total: 0 };
        }
        this.session.tokens.prompt += finalUsageMetadata.promptTokenCount || 0;
        this.session.tokens.candidates += finalUsageMetadata.responseTokenCount || 0;
        this.session.tokens.total += finalUsageMetadata.totalTokenCount || 0;
      }

      const functionCalls = Array.from(functionCallsByKey.values());

      if (
        assistantText.trim() &&
        functionCalls.length === 0 &&
        latestUserText &&
        ContextService.isCodeTask(latestUserText) &&
        ContextService.looksLikeContextRequest(assistantText)
      ) {
        this.session.history.push({
          role: 'user',
          parts: [
            {
              text: `Use tools now. Inspect the workspace and continue without asking for more context. The user task is: ${latestUserText}`,
            },
          ],
        });
        console.log(chalk.cyan('● Inspecting workspace automatically...'));
        await this.processTurn(turnCount + 1, maxOutputTokens);
        return;
      }

      if (
        finalFinishReason === 'MAX_TOKENS' &&
        assistantText.trim() &&
        functionCalls.length === 0
      ) {
        if (turnCount + 1 < MAX_TURNS) {
          const retryTokens = PromptService.getRetryOutputTokens(maxOutputTokens);
          this.session.history.push({
            role: 'user',
            parts: [
              { text: PromptService.buildConciseContinuationPrompt(latestUserText, 'truncated') },
            ],
          });
          console.log(
            chalk.yellow(
              `↻ Output truncated; continuing with a larger budget (${retryTokens} tokens)...`
            )
          );
          await this.processTurn(turnCount + 1, retryTokens);
          return;
        }

        printAssistantResponse('Model exhausted the output budget before finishing the response.');
        return;
      }

      if (!assistantText.trim() && functionCalls.length === 0) {
        if (finalFinishReason === 'MAX_TOKENS') {
          if (turnCount + 1 < MAX_TURNS) {
            const retryTokens = PromptService.getRetryOutputTokens(maxOutputTokens);
            console.log(
              chalk.yellow(`↻ Retrying with a larger output budget (${retryTokens} tokens)...`)
            );
            await this.processTurn(turnCount + 1, retryTokens);
            return;
          }
          printAssistantResponse(
            'Model exhausted the output budget before producing visible text.'
          );
        } else if (responseParts.length > 0 && turnCount + 1 < MAX_TURNS) {
          this.session.history.push({
            role: 'user',
            parts: [
              { text: PromptService.buildConciseContinuationPrompt(latestUserText, 'blank') },
            ],
          });
          await this.processTurn(turnCount + 1);
          return;
        } else {
          // Only print error if we haven't just executed tools (which will trigger forced continuation)
          // Also inspect the recent session history for tool-response entries as a secondary signal.
          const lastHist = this.session.history[this.session.history.length - 1];
          const recentToolHistory = !!(
            lastHist &&
            lastHist.role === 'user' &&
            Array.isArray(lastHist.parts) &&
            lastHist.parts.some((p: Part) => p && typeof p === 'object' && 'functionResponse' in p)
          );

          if (!(this.lastTurnExecutedTools || recentToolHistory)) {
            const retryHint =
              responseParts.length > 0
                ? 'The model returned tool activity but no visible answer. I can retry once or summarize the retrieved context.'
                : 'I completed the turn but no visible response was returned. Please retry your request.';
            printAssistantResponse(retryHint);
          }
        }
      }

      this.session.history.push({ role: 'model', parts: responseParts });

      if (functionCalls.length > 0) {
        const toolResponses: Part[] = new Array(functionCalls.length);
        this.consecutiveToolTurns++;

        const executeCall = async (call: FunctionCall, index: number) => {
          const { name, args } = call;

          if (!name) {
            toolResponses[index] = {
              functionResponse: {
                name: 'unknown',
                response: { result: { error: 'Function call missing name.' } },
              },
            };
            return;
          }

          const typedArgs = (args || {}) as Record<string, unknown>;
          let displayArgs = '';
          if (name === 'read_files' && typedArgs.paths) {
            const paths = typedArgs.paths;
            displayArgs = Array.isArray(paths) ? paths.join(', ') : String(paths);
          } else if (name === 'list_directory') {
            displayArgs = String(typedArgs.path || '.');
          } else if (name === 'grep_search' && typedArgs.pattern) {
            displayArgs = `"${typedArgs.pattern}"`;
          } else if (name === 'run_command' && typedArgs.command) {
            displayArgs = String(typedArgs.command);
          } else if (name === 'propose_edits' && typedArgs.edits) {
            displayArgs = `${(typedArgs.edits as unknown[]).length} edit(s)`;
          }

          const progressLabel = chalk.blue(`● ${name} ${displayArgs}...`);
          process.stdout.write(progressLabel);

          let functionResult: unknown;
          try {
            // SKIP all tools if we're in forced-text mode (model must generate text, not more tools)
            if (this.forceTextResponseMode) {
              functionResult = {
                error: `Tools are disabled in text-generation mode. Provide text response instead.`,
              };
            }
            // Centralized Plan Mode interception
            else if (
              this.mode === OrchestratorMode.PLAN &&
              ['run_command', 'propose_edits'].includes(name)
            ) {
              functionResult = { error: `Plan Mode: ${name} is intercepted and not applied.` };
            }
            // Specialized interactive tool
            else if (name === 'propose_edits') {
              const { edits } = typedArgs as { edits: Record<string, unknown>[] };
              const results = [];
              for (const edit of edits || []) {
                const { success, originalContent } = await showDiff(
                  this,
                  edit.path as string,
                  edit.search as string,
                  edit.replace as string,
                  edit.action as string,
                  edit.reason as string,
                  this.autonomous
                );
                if (success && originalContent) {
                  this.appliedEdits.push({ path: edit.path as string, originalContent });
                }
                results.push({ path: edit.path, applied: success });
              }
              functionResult = { results };
            }
            // Dynamic routing for all other registered tools
            else if (name in tools) {
              functionResult = await (tools as Record<string, (args: any) => Promise<any>>)[name](
                args || {}
              );
            } else {
              functionResult = {
                error: `Unknown tool: ${name}. Available tools are: ${Object.keys(tools).join(', ')}`,
              };
            }

            // Clear progress line and show status (suppress message if tool was skipped due to text-mode)
            process.stdout.clearLine(0);
            process.stdout.cursorTo(0);
            const resObj = functionResult as Record<string, unknown> | null;
            if (
              !this.forceTextResponseMode ||
              (resObj &&
                typeof resObj.error === 'string' &&
                resObj.error.includes('Tools are disabled'))
            ) {
              // Tool was executed normally or explicitly skipped; no status needed
              if (this.forceTextResponseMode) {
                console.log(chalk.gray(`⊘ ${name} ${displayArgs} (skipped)`));
              } else if (resObj && resObj.error) {
                console.log(chalk.red(`✗ ${name} ${displayArgs} (failed)`));
              } else {
                console.log(chalk.green(`✓ ${name} ${displayArgs}`));
              }
            }
          } catch (error: unknown) {
            process.stdout.clearLine(0);
            process.stdout.cursorTo(0);
            console.log(chalk.red(`✗ ${name} ${displayArgs} (failed)`));
            const message = error instanceof Error ? error.message : String(error);
            functionResult = { error: message };
          }

          toolResponses[index] = {
            functionResponse: {
              name: name,
              response: { result: functionResult as Record<string, unknown> },
            },
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

        // Mark that tools were executed this turn
        this.lastTurnExecutedTools = true;

        this.session.history.push({
          role: 'user',
          parts: toolResponses,
        });

        if (!assistantText.trim()) {
          printAssistantResponse(ToolManager.summarize(toolResponses, functionCalls));
        }

        // Refined Tool Chaining Logic:
        // If the model produces no visible text AND has executed tools for 3 consecutive turns,
        // force a summary. Otherwise, allow it to continue tool execution.
        const MAX_TOOL_CHAIN = 3;
        if (!assistantText.trim() && this.consecutiveToolTurns >= MAX_TOOL_CHAIN) {
          console.log(
            chalk.gray(
              `[DEBUG] Max tool chain reached (\${MAX_TOOL_CHAIN}). Forcing text-only response mode.`
            )
          );
          this.forceTextResponseMode = true;
          this.session.history.push({
            role: 'user',
            parts: [
              {
                text: PromptService.buildConciseContinuationPrompt(latestUserText, 'tool-followup'),
              },
            ],
          });
          await this.processTurn(turnCount + 1);
          this.forceTextResponseMode = false;
          this.consecutiveToolTurns = 0; // Reset after forced summary
        } else {
          // Allow the model to continue naturally (either tools or text)
          await this.processTurn(turnCount + 1);
        }
      } else {
        // If the model produces text or stops tool execution, reset the counter
        this.consecutiveToolTurns = 0;
      }

      // Reset tool execution flag at end of turn for next top-level call
      this.lastTurnExecutedTools = false;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`\n[Error]: ${message}`));
    }
  }
}
