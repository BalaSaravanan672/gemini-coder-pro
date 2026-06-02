import { ReadFilesTool } from './read-files.js';
import { ListDirectoryTool } from './list-directory.js';
import { RunCommandTool } from './run-command.js';
import { GrepSearchTool } from './grep-search.js';
import { ProposeEditsTool } from './propose-edits.js';

export const toolRegistry = [
  new ReadFilesTool(),
  new ListDirectoryTool(),
  new RunCommandTool(),
  new GrepSearchTool(),
  new ProposeEditsTool(),
];

// Export a mapping of tool names to their execution functions for backward compatibility with the Orchestrator
export const tools = {
  read_files: toolRegistry.find(t => t.name === 'read_files')!.execute.bind(toolRegistry.find(t => t.name === 'read_files')),
  list_directory: toolRegistry.find(t => t.name === 'list_directory')!.execute.bind(toolRegistry.find(t => t.name === 'list_directory')),
  run_command: toolRegistry.find(t => t.name === 'run_command')!.execute.bind(toolRegistry.find(t => t.name === 'run_command')),
  grep_search: toolRegistry.find(t => t.name === 'grep_search')!.execute.bind(toolRegistry.find(t => t.name === 'grep_search')),
  propose_edits: toolRegistry.find(t => t.name === 'propose_edits')!.execute.bind(toolRegistry.find(t => t.name === 'propose_edits')),
} as const;
