import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { BaseTool } from '../../tools/base.js';

export class ExtensionService {
  private static readonly GLOBAL_EXTENSIONS_DIR = path.join(os.homedir(), '.gemini', 'extensions');

  static async loadExtensions(workspaceRoot: string): Promise<BaseTool[]> {
    const extensions: BaseTool[] = [];
    const localExtensionsDir = path.join(workspaceRoot, '.gemini', 'extensions');

    // Load from global dir
    extensions.push(...(await this.loadFromDir(this.GLOBAL_EXTENSIONS_DIR)));

    // Load from workspace dir (workspace takes precedence, so we load it after)
    extensions.push(...(await this.loadFromDir(localExtensionsDir)));

    return extensions;
  }

  private static async loadFromDir(dir: string): Promise<BaseTool[]> {
    const tools: BaseTool[] = [];
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const tool = await this.loadExtension(path.join(dir, entry.name));
          if (tool) tools.push(tool);
        }
      }
    } catch {
      // Ignore if directory doesn't exist
    }
    return tools;
  }

  private static async loadExtension(extPath: string): Promise<BaseTool | null> {
    try {
      const manifestPath = path.join(extPath, 'gemini-extension.json');
      const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));

      // For now, we only support simple JS/TS tool exports that follow our BaseTool structure.
      // This is a simplified foundation.
      if (manifest.main) {
        const modulePath = path.resolve(extPath, manifest.main);
        const module = await import(`file://${modulePath}`);
        if (module.default && module.default.prototype instanceof BaseTool) {
          return new module.default();
        }
      }
    } catch (err) {
      console.warn(`[Extension Warning]: Failed to load extension at ${extPath}: ${err}`);
    }
    return null;
  }
}
