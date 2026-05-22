import { CommandRegistry } from '../core/commands.js';
import { PlanHandler } from './plan.js';
import { DiffHandler } from './diff.js';
import { ReviewHandler, SecurityReviewHandler } from './review.js';

export function registerAllCommands() {
  CommandRegistry.register(new PlanHandler());
  CommandRegistry.register(new DiffHandler());
  CommandRegistry.register(new ReviewHandler());
  CommandRegistry.register(new SecurityReviewHandler());
}
