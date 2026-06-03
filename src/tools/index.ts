import { ReadFilesTool } from './read-files.js';
import { ListDirectoryTool } from './list-directory.js';
import { RunCommandTool } from './run-command.js';
import { GrepSearchTool } from './grep-search.js';
import { ProposeEditsTool } from './propose-edits.js';
import { BaseTool } from './base.js';

import { ToolResult } from './types.js';

export const toolRegistry: BaseTool<any, ToolResult>[] = [
  new ReadFilesTool(),
  new ListDirectoryTool(),
  new RunCommandTool(),
  new GrepSearchTool(),
  new ProposeEditsTool(),
];

export function registerTool(tool: BaseTool<any, ToolResult>) {
  if (!toolRegistry.find((t) => t.name === tool.name)) {
    toolRegistry.push(tool);
    // Update the exported tools object
    (tools as any)[tool.name] = tool.execute.bind(tool);
  }
}

// Export a mapping of tool names to their execution functions for backward compatibility with the Orchestrator
export const tools: Record<string, (args: any) => Promise<ToolResult>> = Object.fromEntries(
  toolRegistry.map((t) => [t.name, t.execute.bind(t)])
);
