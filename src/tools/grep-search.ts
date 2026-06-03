import { BaseTool } from './base.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface GrepSearchArgs {
  pattern: string;
  include?: string;
  maxResults?: number;
}

export interface GrepSearchResult {
  results: string;
  stderr?: string;
  message?: string;
  error?: string;
}

export class GrepSearchTool extends BaseTool<GrepSearchArgs, GrepSearchResult> {
  readonly name = 'grep_search';
  readonly description = 'Search for a pattern across the codebase (grep).';
  readonly parameters = {
    type: 'OBJECT',
    properties: {
      pattern: {
        type: 'STRING',
        description: 'The regex pattern to search for.',
      },
      include: {
        type: 'STRING',
        description: 'Optional glob for files to include (e.g. "*.ts").',
      },
      maxResults: {
        type: 'NUMBER',
        description: 'Optional maximum number of results to return (default: 1000).',
      },
    },
    required: ['pattern'],
  };

  /**
   * Basic shell escaping for Unix-like systems.
   * Wraps the string in single quotes and escapes any single quotes within.
   */
  private quote(str: string): string {
    return "'" + str.replace(/'/g, "'\\''") + "'";
  }

  protected async run({
    pattern,
    include,
    maxResults = 1000,
  }: GrepSearchArgs): Promise<GrepSearchResult> {
    try {
      // Use grep -rnIE (recursive, line numbers, ignore binary, extended regex)
      const quotedPattern = this.quote(pattern);
      const includeFlag = include ? `--include=${this.quote(include)}` : '';

      // Limit results to prevent overwhelming the context window or exceeding buffer
      const limit = Math.max(1, Math.min(maxResults, 10000));
      const command = `grep -rnIE ${quotedPattern} . ${includeFlag} --exclude-dir={node_modules,dist,.git} | head -n ${limit}`;

      const { stdout, stderr } = await execAsync(command, { timeout: 30000 });
      return { results: this.truncate(stdout), stderr: this.truncate(stderr) };
    } catch (error: unknown) {
      // grep returns exit code 1 if no matches found
      if (error && typeof error === 'object' && 'code' in error && (error as any).code === 1) {
        return { results: '', message: 'No matches found.' };
      }
      const message = error instanceof Error ? error.message : String(error);
      return { results: '', error: message };
    }
  }
}
