import { BaseTool } from './base.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface GrepSearchArgs {
  pattern: string;
  include?: string;
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
    },
    required: ['pattern'],
  };

  protected async run({ pattern, include }: GrepSearchArgs): Promise<GrepSearchResult> {
    try {
      // Use grep -rnIE (recursive, line numbers, ignore binary, extended regex)
      const includeFlag = include ? `--include="${include}"` : '';
      const command = `grep -rnIE "${pattern}" . ${includeFlag} --exclude-dir={node_modules,dist,.git}`;
      const { stdout, stderr } = await execAsync(command, { timeout: 30000 });
      return { results: this.truncate(stdout), stderr: this.truncate(stderr) };
    } catch (error: any) {
      // grep returns exit code 1 if no matches found
      if (error.code === 1) return { results: '', message: 'No matches found.' };
      return { results: '', error: error.message };
    }
  }
}
