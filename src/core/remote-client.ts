import { createTransportClient } from './transport/client.js';
import type { AgentEventBus } from './events/bus.js';

export type RemoteClientOptions = {
  debug?: boolean;
  eventBus?: AgentEventBus;
  timeoutMs?: number;
  retries?: number;
};

export function createRemoteClient(
  serverUrl: string,
  token?: string,
  options: RemoteClientOptions = {}
) {
  const debug =
    options.debug ??
    (process.env.GEMINI_CODER_DEBUG === '1' || process.env.GEMINI_CODER_DEBUG === 'true');

  return createTransportClient({
    serverUrl,
    token,
    debug,
    timeoutMs: options.timeoutMs ?? 30000,
    retries: options.retries ?? 3,
    eventBus: options.eventBus,
  });
}
