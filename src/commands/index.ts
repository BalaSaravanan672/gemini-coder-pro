import { CommandRegistry } from '../core/commands.js';
import { PlanHandler } from './plan.js';
import { DiffHandler } from './diff.js';

export function registerAllCommands() {
  CommandRegistry.register(new PlanHandler());
  CommandRegistry.register(new DiffHandler());
}
