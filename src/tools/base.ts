import { ToolResult } from './types.js';

export abstract class BaseTool<TArgs = any, TResult extends ToolResult = ToolResult> {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly parameters: Record<string, any>;

  async execute(args: TArgs): Promise<TResult> {
    try {
      return await this.run(args);
    } catch (err: any) {
      // Standardized error formatting across all tools
      return { error: `[Tool Error: ${this.name}]: ${err.message || String(err)}` } as TResult;
    }
  }

  protected abstract run(args: TArgs): Promise<TResult>;

  /**
   * Shared helper to truncate massive outputs to protect the context window.
   * Default limit is 50,000 characters.
   */
  protected truncate(text: string, limit = 50000): string {
    if (!text) return '';
    return text.length > limit ? text.slice(0, limit) + "... [truncated]" : text;
  }
}
