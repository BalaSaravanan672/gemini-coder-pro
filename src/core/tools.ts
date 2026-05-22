import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface Edit {
  path: string;
  search: string;
  replace: string;
}

export const tools = {
  read_files: async ({ paths }: { paths: string[] }) => {
    const contents = await Promise.all(paths.map(async p => {
      try {
        return {
          path: p,
          content: await fs.readFile(p, 'utf8')
        };
      } catch (error: any) {
        return {
          path: p,
          error: error.message || String(error)
        };
      }
    }));
    return contents;
  },
  propose_edits: async ({ edits }: { edits: Edit[] }) => {
    // This will be handled by the orchestrator for the approval gate
    return { status: "pending_approval", edits };
  },
  run_command: async ({ command }: { command: string }) => {
    try {
      // 5MB buffer to prevent ERR_CHILD_PROCESS_STDIO_MAXBUFFER
      const { stdout, stderr } = await execAsync(command, { timeout: 60000, maxBuffer: 1024 * 1024 * 5 });
      // Truncate massive outputs so they don't blow out the LLM context window
      return { 
        stdout: stdout ? stdout.slice(0, 50000) : '', 
        stderr: stderr ? stderr.slice(0, 50000) : '', 
        exitCode: 0 
      };
    } catch (error: any) {
      return {
        stdout: error.stdout ? error.stdout.slice(0, 50000) : '',
        stderr: (error.stderr || error.message).slice(0, 50000),
        exitCode: error.code || 1
      };
    }
  },
  grep_search: async ({ pattern, include }: { pattern: string, include?: string }) => {
    try {
      // Use grep -rnIE (recursive, line numbers, ignore binary, extended regex)
      const includeFlag = include ? `--include="${include}"` : '';
      const command = `grep -rnIE "${pattern}" . ${includeFlag} --exclude-dir={node_modules,dist,.git}`;
      const { stdout, stderr } = await execAsync(command, { timeout: 30000 });
      return { results: stdout, stderr };
    } catch (error: any) {
      // grep returns exit code 1 if no matches found
      if (error.code === 1) return { results: '', message: 'No matches found.' };
      return { results: '', error: error.message };
    }
  },
  list_directory: async ({ path = '.' }: { path?: string }) => {
    try {
      const entries = await fs.readdir(path, { withFileTypes: true });
      const results = entries.map(e => `${e.isDirectory() ? 'DIR ' : 'FILE'} ${e.name}`).join('\n');
      return { path, results };
    } catch (error: any) {
      return { error: error.message };
    }
  }
};
