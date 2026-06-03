import type { Orchestrator } from './orchestrator.js';

export interface CommandHandler {
  name: string;
  description: string;
  execute(orchestrator: Orchestrator, args: string[]): Promise<void>;
}

export class CommandRegistry {
  private static commands = new Map<string, CommandHandler>();

  static register(handler: CommandHandler) {
    this.commands.set(handler.name, handler);
  }

  static get(name: string): CommandHandler | undefined {
    return this.commands.get(name);
  }

  static getAll(): CommandHandler[] {
    return Array.from(this.commands.values());
  }
}
