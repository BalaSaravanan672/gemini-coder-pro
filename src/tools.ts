import fs from 'fs/promises';

export const tools = {
  read_files: async ({ paths }: { paths: string[] }) => {
    const contents = await Promise.all(paths.map(async p => ({
      path: p,
      content: await fs.readFile(p, 'utf8')
    })));
    return contents;
  },
  propose_edits: async ({ edits }: { edits: any[] }) => {
    // This will be handled by the orchestrator for the approval gate
    return { status: "pending_approval", edits };
  }
};
