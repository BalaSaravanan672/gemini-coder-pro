import { TransportError } from './errors.js';

export type NdjsonStreamOptions = {
  debug?: boolean;
};

function logDebug(
  options: NdjsonStreamOptions,
  message: string,
  details?: Record<string, unknown>
) {
  if (!options.debug) {
    return;
  }

  if (details) {
    console.error(`[transport] ${message}`, details);
  } else {
    console.error(`[transport] ${message}`);
  }
}

export async function* readNdjsonStream(
  response: Response,
  options: NdjsonStreamOptions = {}
): AsyncGenerator<any> {
  if (!response.body) {
    throw new TransportError('Response body is missing; cannot read streamed results.', {
      code: 'NO_RESPONSE_BODY',
      retryable: false,
    });
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let chunkCount = 0;
  let lineCount = 0;

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }

      chunkCount += 1;
      const chunkText = decoder.decode(value, { stream: true });
      logDebug(options, 'stream chunk received', { chunkCount, byteLength: value.byteLength });
      buffer += chunkText;
      let lineBreakIndex = buffer.indexOf('\n');

      while (lineBreakIndex !== -1) {
        const line = buffer.slice(0, lineBreakIndex).trim();
        buffer = buffer.slice(lineBreakIndex + 1);

        if (line.length > 0) {
          lineCount += 1;
          try {
            yield JSON.parse(line);
          } catch (error) {
            throw new TransportError('Received malformed NDJSON from the server.', {
              code: 'MALFORMED_NDJSON',
              retryable: false,
              cause: error,
            });
          }
        }

        lineBreakIndex = buffer.indexOf('\n');
      }
    }

    const remaining = buffer.trim();
    if (remaining.length > 0) {
      lineCount += 1;
      try {
        yield JSON.parse(remaining);
      } catch (error) {
        throw new TransportError('Received malformed NDJSON from the server.', {
          code: 'MALFORMED_NDJSON',
          retryable: false,
          cause: error,
        });
      }
    }
  } catch (error) {
    if (error instanceof TransportError) {
      throw error;
    }

    throw new TransportError('Stream read failed.', {
      code: 'NETWORK_ERROR',
      retryable: true,
      cause: error,
    });
  } finally {
    logDebug(options, 'stream ended', { chunkCount, lineCount });
  }
}
