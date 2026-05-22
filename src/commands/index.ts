import { CommandRegistry } from '../core/commands.js';
import { PlanHandler } from './plan.js';

export function registerAllCommands() {
  CommandRegistry.register(new PlanHandler());
}
