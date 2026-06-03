import { isTransportError, TransportError } from './errors.js';

export type RetryOptions = {
  retries: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  debug?: boolean;
  onRetry?: (attempt: number, delayMs: number, error: unknown) => void;
  onSuccess?: (attempt: number, elapsedMs: number) => void;
};

function wait(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

function isRetryableError(error: unknown): boolean {
  if (isTransportError(error)) {
    return error.retryable;
  }

  const errorText = String((error as any)?.message || error || '');
  return (
    errorText.includes('429') ||
    errorText.includes('502') ||
    errorText.includes('503') ||
    errorText.includes('504')
  );
}

export async function retryTransport<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T> {
  const retries = Math.max(1, options.retries);
  const baseDelayMs = options.baseDelayMs ?? 500;
  const maxDelayMs = options.maxDelayMs ?? 4000;
  let delayMs = baseDelayMs;

  for (let attempt = 1; attempt <= retries; attempt++) {
    const startedAt = Date.now();
    try {
      const result = await fn();
      options.onSuccess?.(attempt, Date.now() - startedAt);
      return result;
    } catch (error) {
      if (attempt >= retries || !isRetryableError(error)) {
        throw error;
      }

      const nextDelayMs = Math.min(delayMs, maxDelayMs);
      options.onRetry?.(attempt, nextDelayMs, error);
      await wait(nextDelayMs);
      delayMs *= 2;
    }
  }

  throw new TransportError('Max retries reached', { code: 'NETWORK_ERROR', retryable: false });
}
