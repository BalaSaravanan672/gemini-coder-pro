import type { AgentEvent } from './types.js';

export type AgentEventListener = (event: AgentEvent) => void;

export class AgentEventBus {
  private listeners = new Set<AgentEventListener>();

  emit(event: AgentEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  subscribe(listener: AgentEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  clear(): void {
    this.listeners.clear();
  }
}
