import { CommandRegistry } from '@gemini-coder/core';
import { PlanHandler } from './plan.js';
import { DiffHandler } from './diff.js';
import { ReviewHandler, SecurityReviewHandler } from './review.js';
import { SimplifyHandler } from './simplify.js';
import { UsageHandler } from './usage.js';
import { CommitHandler } from './commit.js';
import { TestHandler } from './test.js';
import { UndoHandler } from './undo.js';
import { ContextHandler } from './context.js';
import { CdHandler } from './cd.js';
import { ExtensionsHandler } from './extensions.js';
import { CheckpointHandler } from './checkpoint.js';
import { TokenUsageHandler } from './token-usage.js';

export function registerAllCommands() {
  CommandRegistry.register(new PlanHandler());
  CommandRegistry.register(new DiffHandler());
  CommandRegistry.register(new ReviewHandler());
  CommandRegistry.register(new SecurityReviewHandler());
  CommandRegistry.register(new SimplifyHandler());
  CommandRegistry.register(new UsageHandler());
  CommandRegistry.register(new CommitHandler());
  CommandRegistry.register(new TestHandler());
  CommandRegistry.register(new UndoHandler());
  CommandRegistry.register(new ContextHandler());
  CommandRegistry.register(new CdHandler());
  CommandRegistry.register(new ExtensionsHandler());
  CommandRegistry.register(new CheckpointHandler());
  CommandRegistry.register(new TokenUsageHandler());
}
