import type { AgentEventBus } from '../events/bus.js';

export type GenerateContentStreamRequest = {
  model: string;
  contents: unknown;
  config?: unknown;
};

export type TransportClientOptions = {
  serverUrl: string;
  token?: string;
  debug?: boolean;
  timeoutMs?: number;
  retries?: number;
  eventBus?: AgentEventBus;
};

export type TransportLogger = {
  debug: (message: string, details?: Record<string, unknown>) => void;
};
