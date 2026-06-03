import { readNdjsonStream } from './stream.js';
import { extractRequestId, isRetryableStatus, toTransportError, TransportError } from './errors.js';
import { retryTransport } from './retry.js';
import type {
  GenerateContentStreamRequest,
  TransportClientOptions,
  TransportLogger,
} from './types.js';
import type { AgentEvent } from '../events/types.js';

const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_RETRIES = 3;

function createLogger(debug?: boolean): TransportLogger {
  return {
    debug: (message: string, details?: Record<string, unknown>) => {
      if (!debug) {
        return;
      }

      if (details) {
        console.error(`[transport] ${message}`, details);
      } else {
        console.error(`[transport] ${message}`);
      }
    },
  };
}

type RequestSummary = {
  model: string;
  contentCount: number;
  hasConfig: boolean;
};

function serializeRequest(request: GenerateContentStreamRequest): RequestSummary {
  const contents = Array.isArray(request.contents) ? request.contents : [];
  return {
    model: request.model,
    contentCount: contents.length,
    hasConfig: Boolean(request.config),
  };
}

function emitEvent(options: TransportClientOptions, event: AgentEvent): void {
  options.eventBus?.emit(event);
}

export function createTransportClient(options: TransportClientOptions) {
  const normalizedServerUrl = options.serverUrl.replace(/\/+$/, '');
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retries = options.retries ?? DEFAULT_RETRIES;
  const logger = createLogger(options.debug);

  return {
    models: {
      generateContentStream: async (request: GenerateContentStreamRequest) => {
        const requestUrl = `${normalizedServerUrl}/v1/generateContentStream`;
        const requestSummary = serializeRequest(request);
        let responseStatus = 0;
        let responseRequestId: string | undefined;
        const startedAt = Date.now();

        emitEvent(options, {
          type: 'transport:start',
          url: requestUrl,
          model: request.model,
          contentCount: requestSummary.contentCount,
          hasConfig: requestSummary.hasConfig,
          timestamp: startedAt,
        });

        try {
          const result = await retryTransport(
            async () => {
              const timeoutController = new AbortController();
              const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);

              let response: Response;
              try {
                response = await fetch(requestUrl, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
                  },
                  body: JSON.stringify(request),
                  signal: timeoutController.signal,
                });
              } catch (error: any) {
                clearTimeout(timeoutId);
                if (error?.name === 'AbortError' || error?.code === 'ABORT_ERR') {
                  throw new TransportError(`Request timed out after ${timeoutMs}ms.`, {
                    code: 'TIMEOUT',
                    retryable: true,
                    cause: error,
                  });
                }

                throw toTransportError(
                  error,
                  `Unable to reach Gemini Coder server at ${normalizedServerUrl}. Start the server with npm run serve, check the URL, and verify network/proxy access. Original error: ${error?.message || String(error)}`,
                  'NETWORK_ERROR',
                  true
                );
              } finally {
                clearTimeout(timeoutId);
              }

              logger.debug('response received', {
                status: response.status,
                requestId: extractRequestId(response.headers),
              });

              if (!response.ok) {
                const errorText = await response.text();
                const requestId = extractRequestId(response.headers);
                throw new TransportError(`HTTP ${response.status}: ${errorText}`, {
                  code: 'HTTP_ERROR',
                  status: response.status,
                  requestId,
                  retryable: isRetryableStatus(response.status),
                });
              }

              responseStatus = response.status;
              responseRequestId = extractRequestId(response.headers);

              return readNdjsonStream(response, { debug: options.debug });
            },
            {
              retries,
              baseDelayMs: 500,
              maxDelayMs: 4000,
              debug: options.debug,
              onRetry: (attempt, delayMs, error) => {
                const status = error instanceof TransportError ? error.status : undefined;
                emitEvent(options, {
                  type: 'transport:retry',
                  attempt,
                  delayMs,
                  status,
                  code: error instanceof TransportError ? error.code : 'NETWORK_ERROR',
                  retryable: error instanceof TransportError ? error.retryable : true,
                  timestamp: Date.now(),
                });
                logger.debug('retry scheduled', {
                  attempt,
                  delayMs,
                  status,
                  retryable: error instanceof TransportError ? error.retryable : true,
                });
              },
              onSuccess: (attempt, elapsedMs) => {
                emitEvent(options, {
                  type: 'transport:success',
                  status: responseStatus,
                  elapsedMs,
                  retriesUsed: attempt - 1,
                  requestId: responseRequestId,
                  timestamp: Date.now(),
                });
                logger.debug('transport complete', {
                  status: responseStatus,
                  elapsedMs,
                  retriesUsed: attempt - 1,
                  ...requestSummary,
                });
              },
            }
          );

          return result;
        } catch (error) {
          emitEvent(options, {
            type: 'transport:error',
            code: error instanceof TransportError ? error.code : 'UNKNOWN',
            status: error instanceof TransportError ? error.status : undefined,
            requestId: error instanceof TransportError ? error.requestId : undefined,
            retryable: error instanceof TransportError ? error.retryable : false,
            message: String((error as any)?.message || error || 'Unexpected transport failure.'),
            timestamp: Date.now(),
          });
          throw error;
        }
      },
    },
  };
}
