import { BaseTool } from './base.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface RunCommandArgs {
  command: string;
}

export interface RunCommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  error?: string;
}

export class RunCommandTool extends BaseTool<RunCommandArgs, RunCommandResult> {
  readonly name = 'run_command';
  readonly description = 'Execute a shell command in the local terminal.';
  readonly parameters = {
    type: 'OBJECT',
    properties: {
      command: {
        type: 'STRING',
        description: 'The shell command to execute.',
      },
    },
    required: ['command'],
  };

  protected async run({ command }: RunCommandArgs): Promise<RunCommandResult> {
    try {
      // 5MB buffer to prevent ERR_CHILD_PROCESS_STDIO_MAXBUFFER
      const { stdout, stderr } = await execAsync(command, { 
        timeout: 60000, 
        maxBuffer: 1024 * 1024 * 5 
      });
      
      return {
        stdout: this.truncate(stdout),
        stderr: this.truncate(stderr),
        exitCode: 0
      };
    } catch (error: any) {
      return {
        stdout: this.truncate(error.stdout || ''),
        stderr: this.truncate(error.stderr || error.message),
        exitCode: error.code || 1
      };
    }
  }
}
