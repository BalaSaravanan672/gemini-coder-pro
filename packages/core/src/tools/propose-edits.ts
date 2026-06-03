import { BaseTool } from './base.js';

export interface Edit {
  path: string;
  search: string;
  replace: string;
  action: string;
  reason: string;
}

export interface ProposeEditsArgs {
  edits: Edit[];
}

export interface ProposeEditsResult {
  status: string;
  edits: Edit[];
  results?: Array<{ path: string; applied: boolean }>;
}

export class ProposeEditsTool extends BaseTool<ProposeEditsArgs, ProposeEditsResult> {
  readonly name = 'propose_edits';
  readonly description =
    'Propose surgical edits to one or more files using search and replace blocks.';
  readonly parameters = {
    type: 'OBJECT',
    properties: {
      edits: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            path: { type: 'STRING', description: 'The absolute path to the file.' },
            search: { type: 'STRING', description: 'The exact literal text to find.' },
            replace: { type: 'STRING', description: 'The text to replace it with.' },
            action: {
              type: 'STRING',
              description: 'Brief description of the action (e.g. "Replace lines 10-15").',
            },
            reason: { type: 'STRING', description: 'Technical reason for this change.' },
          },
          required: ['path', 'search', 'replace', 'action', 'reason'],
        },
      },
    },
    required: ['edits'],
  };

  protected async run(args: ProposeEditsArgs): Promise<ProposeEditsResult> {
    // This tool's execution is unique because it's intercepted by the Orchestrator,
    // but we still need its definition for the registry.
    return { status: 'pending_approval', edits: args.edits };
  }
}
