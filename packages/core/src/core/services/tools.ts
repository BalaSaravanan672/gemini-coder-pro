import { FunctionDeclaration, Part, FunctionCall } from '@google/genai';
import { toolRegistry, registerTool } from '../../tools/index.js';
import { ExtensionService } from './extensions.js';

export class ToolManager {
  static getDeclarations(): FunctionDeclaration[] {
    return toolRegistry.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters as Record<string, unknown>,
    }));
  }

  static async loadExtensions(workspaceRoot: string) {
    const extTools = await ExtensionService.loadExtensions(workspaceRoot);
    for (const tool of extTools) {
      registerTool(tool);
    }
  }

  static summarize(toolResponses: Part[], functionCalls: FunctionCall[]): string {
    const summaries: string[] = [];

    for (let i = 0; i < functionCalls.length; i++) {
      const call = functionCalls[i];
      const response = toolResponses[i];
      const result = (response?.functionResponse?.response as Record<string, unknown> | undefined)
        ?.result as Record<string, unknown> | undefined;

      if (result?.error) {
        summaries.push(`${call?.name || 'tool'} failed.`);
      } else if (call?.name === 'list_directory' && result?.results) {
        summaries.push(
          `Listed ${result.path ?? 'the directory'} (${String(result.results).split('\n').filter(Boolean).length} entries).`
        );
      } else if (call?.name === 'read_files' && Array.isArray(result)) {
        summaries.push(`Read ${result.length} file${result.length === 1 ? '' : 's'}.`);
      } else if (call?.name === 'grep_search') {
        const matches = typeof result?.results === 'string' 
          ? result.results.trim().split('\n').filter(Boolean).length 
          : 0;
        summaries.push(`Found ${matches} match${matches === 1 ? '' : 'es'}.`);
      } else if (call?.name === 'run_command') {
        const exitCode = result?.exitCode;
        if (exitCode !== undefined && exitCode !== 0) {
          summaries.push(`Command failed with exit code ${exitCode}.`);
        } else {
          summaries.push('Command executed successfully.');
        }
      } else if (call?.name === 'propose_edits' && Array.isArray(result?.edits)) {
        summaries.push(`Proposed ${result.edits.length} edit${result.edits.length === 1 ? '' : 's'}.`);
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
