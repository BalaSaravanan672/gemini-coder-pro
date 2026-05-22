import fs from 'fs/promises';

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
  }
};
