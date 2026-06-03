import { describe, it, expect } from 'vitest';
import { ToolManager } from '../core/services/tools.js';
import { Part, FunctionCall } from '@google/genai';

describe('ToolManager.summarize', () => {
  it('summarizes list_directory correctly', () => {
    const functionCalls: FunctionCall[] = [{ name: 'list_directory', args: { path: 'src' } }];
    const toolResponses: Part[] = [
      {
        functionResponse: {
          name: 'list_directory',
          response: { result: { path: 'src', results: 'file1.ts\nfile2.ts\n' } },
        },
      },
    ];
    const summary = ToolManager.summarize(toolResponses, functionCalls);
    expect(summary).toBe('Listed src (2 entries).');
  });

  it('summarizes read_files correctly', () => {
    const functionCalls: FunctionCall[] = [{ name: 'read_files', args: { paths: ['a.ts', 'b.ts'] } }];
    const toolResponses: Part[] = [
      {
        functionResponse: {
          name: 'read_files',
          response: { result: [{ path: 'a.ts' }, { path: 'b.ts' }] },
        },
      },
    ];
    const summary = ToolManager.summarize(toolResponses, functionCalls);
    expect(summary).toBe('Read 2 files.');
  });

  it('summarizes grep_search with match count', () => {
    const functionCalls: FunctionCall[] = [{ name: 'grep_search', args: { pattern: 'test' } }];
    const toolResponses: Part[] = [
      {
        functionResponse: {
          name: 'grep_search',
          response: { result: { results: 'match1\nmatch2\nmatch3\n' } },
        },
      },
    ];
    const summary = ToolManager.summarize(toolResponses, functionCalls);
    // This will fail initially as it currently returns "Search completed."
    expect(summary).toBe('Found 3 matches.');
  });
});
