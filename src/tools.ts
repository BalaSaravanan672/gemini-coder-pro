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
      const { stdout, stderr } = await execAsync(command, { timeout: 60000 });
      return { stdout, stderr, exitCode: 0 };
    } catch (error: any) {
      return {
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
        exitCode: error.code || 1
      };
    }
  }
};
