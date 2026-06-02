import fs from 'fs/promises';
import { BaseTool } from './base.js';
import { ToolResult } from './types.js';

export interface ListDirectoryArgs {
  path?: string;
}

export interface ListDirectoryResult extends ToolResult {
  path: string;
  results?: string;
}

export class ListDirectoryTool extends BaseTool<ListDirectoryArgs, ListDirectoryResult> {
  readonly name = 'list_directory';
  readonly description = 'List the contents of a specific directory.';
  readonly parameters = {
    type: 'OBJECT',
    properties: {
      path: { type: 'STRING', description: 'The directory path (default ".").' },
    },
  };

  protected async run(args: ListDirectoryArgs): Promise<ListDirectoryResult> {
    const dirPath = args.path || '.';
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const results = entries.map(e => `${e.isDirectory() ? 'DIR ' : 'FILE'} ${e.name}`).join('\n');
    return { path: dirPath, results };
  }
}
