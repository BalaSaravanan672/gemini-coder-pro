import { FunctionDeclaration, Part, Type } from '@google/genai';
import { tools } from '../tools.js';

export const functionDeclarations: FunctionDeclaration[] = [
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

export class ToolManager {
  static getDeclarations(): FunctionDeclaration[] {
    return functionDeclarations;
  }

  static summarize(toolResponses: Part[], functionCalls: any[]): string {
    const summaries: string[] = [];

    for (let i = 0; i < functionCalls.length; i++) {
      const call = functionCalls[i];
      const response = toolResponses[i] as any;
      const result = response?.functionResponse?.response?.result;

      if (call?.name === 'list_directory' && result?.results) {
        summaries.push(`Listed ${result.path ?? 'the directory'} (${String(result.results).split('\n').filter(Boolean).length} entries).`);
      } else if (call?.name === 'read_files' && Array.isArray(result)) {
        summaries.push(`Read ${result.length} file${result.length === 1 ? '' : 's'}.`);
      } else if (call?.name === 'grep_search') {
        summaries.push('Search completed.');
      } else if (call?.name === 'run_command') {
        summaries.push('Command executed.');
      } else if (call?.name) {
        summaries.push(`${call.name} completed.`);
      }
    }

    if (summaries.length === 0) {
      return 'Done.';
    }

    return summaries.slice(0, 3).join(' ');
  }
}
