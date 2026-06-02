import fs from 'fs/promises';
import { BaseTool } from './base.js';
import { ToolResult } from './types.js';

export interface ReadFilesArgs {
  paths: string[];
}

export interface ReadFilesResult extends ToolResult {
  contents?: Array<{
    path: string;
    content?: string;
    error?: string;
  }>;
}

export class ReadFilesTool extends BaseTool<ReadFilesArgs, ReadFilesResult> {
  readonly name = 'read_files';
  readonly description = 'Read the contents of one or more files.';
  readonly parameters = {
    type: 'OBJECT',
    properties: {
      paths: {
        type: 'ARRAY',
        items: { type: 'STRING' },
        description: 'The paths of the files to read.',
      },
    },
    required: ['paths'],
  };

  protected async run(args: ReadFilesArgs): Promise<ReadFilesResult> {
    const contents = await Promise.all(args.paths.map(async p => {
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
    return { contents };
  }
}
