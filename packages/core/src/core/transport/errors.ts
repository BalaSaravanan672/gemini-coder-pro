export type TransportErrorCode =
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'HTTP_ERROR'
  | 'MALFORMED_NDJSON'
  | 'NO_RESPONSE_BODY';

export class TransportError extends Error {
  public code: TransportErrorCode;
  public status?: number;
  public requestId?: string;
  public retryable: boolean;

  constructor(
    message: string,
    options: {
      code: TransportErrorCode;
      status?: number;
      requestId?: string;
      retryable?: boolean;
      cause?: unknown;
    }
  ) {
    super(message);
    this.name = 'TransportError';
    this.code = options.code;
    this.status = options.status;
    this.requestId = options.requestId;
    this.retryable = options.retryable ?? false;
    if (options.cause !== undefined) {
      (this as any).cause = options.cause;
    }
  }
}

export function isTransportError(error: unknown): error is TransportError {
  return error instanceof TransportError;
}

export function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || (status >= 500 && status <= 599);
}

export function extractRequestId(headers: Headers): string | undefined {
  return (
    headers.get('x-request-id') ||
    headers.get('x-correlation-id') ||
    headers.get('x-cloud-trace-context') ||
    undefined
  );
}

export function toTransportError(
  error: unknown,
  message: string,
  code: TransportErrorCode = 'NETWORK_ERROR',
  retryable = false
): TransportError {
  return new TransportError(message, {
    code,
    retryable,
    cause: error,
  });
}

export function formatTransportError(error: unknown): string {
  if (!isTransportError(error)) {
    return String((error as any)?.message || error || 'Unexpected transport failure.');
  }

  switch (error.code) {
    case 'TIMEOUT':
      return 'The model request timed out. Try increasing the timeout or reducing the prompt size.';
    case 'NO_RESPONSE_BODY':
      return 'The server returned no response body for the stream. Verify the backend route and proxy streaming support.';
    case 'MALFORMED_NDJSON':
      return 'The server returned malformed streaming data. Verify the backend stream format.';
    case 'HTTP_ERROR':
      if (error.status === 401 || error.status === 403) {
        return 'Authentication failed. Verify GEMINI_CODER_SERVER_TOKEN and server-side authorization.';
      }

      if (error.status === 404) {
        return 'The server returned 404. Verify the client endpoint, proxy routing, and model name.';
      }

      if (error.status === 429) {
        return 'Rate limit reached. The client will retry automatically, but you may need to reduce request rate.';
      }

      if (error.status && error.status >= 500) {
        return `The server returned ${error.status}. Check the backend logs and upstream model availability.`;
      }

      return error.message;
    case 'NETWORK_ERROR':
      return 'Unable to reach the Gemini Coder server. Check the server URL, network access, and proxy settings.';
    default:
      return error.message;
  }
}
