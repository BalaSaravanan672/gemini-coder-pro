import type { TransportErrorCode } from '../transport/errors.js';

export type TransportStartEvent = {
  type: 'transport:start';
  url: string;
  model: string;
  contentCount: number;
  hasConfig: boolean;
  timestamp: number;
};

export type TransportRetryEvent = {
  type: 'transport:retry';
  attempt: number;
  delayMs: number;
  status?: number;
  code?: TransportErrorCode;
  retryable: boolean;
  timestamp: number;
};

export type TransportSuccessEvent = {
  type: 'transport:success';
  status: number;
  elapsedMs: number;
  retriesUsed: number;
  requestId?: string;
  timestamp: number;
};

export type TransportErrorEvent = {
  type: 'transport:error';
  code: TransportErrorCode | 'UNKNOWN';
  status?: number;
  requestId?: string;
  retryable: boolean;
  message: string;
  timestamp: number;
};

export type StreamTextDeltaEvent = {
  type: 'stream:text-delta';
  delta: string;
  timestamp: number;
};

export type StreamStatusEvent = {
  type: 'stream:status';
  message: string;
  timestamp: number;
};

export type ToolEvent = {
  type: 'tool:start' | 'tool:finish';
  tool: string;
  timestamp: number;
};

export type ApprovalEvent = {
  type: 'approval:required' | 'approval:granted' | 'approval:denied';
  message: string;
  timestamp: number;
};

export type PlannerEvent = {
  type: 'planner:start' | 'planner:finish';
  message: string;
  timestamp: number;
};

export type TransportEvent =
  | TransportStartEvent
  | TransportRetryEvent
  | TransportSuccessEvent
  | TransportErrorEvent;

export type StreamEvent = StreamTextDeltaEvent | StreamStatusEvent;

export type AgentEvent = TransportEvent | StreamEvent | ToolEvent | ApprovalEvent | PlannerEvent;
