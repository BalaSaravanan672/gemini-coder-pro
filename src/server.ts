import { createServer } from 'http';
import type { IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import { createGoogleClient } from './core/auth.js';

const serverPort = Number(process.env.GEMINI_CODER_SERVER_PORT ?? 8787);
const serverHost = process.env.GEMINI_CODER_SERVER_HOST ?? '0.0.0.0';
const requiredToken = process.env.GEMINI_CODER_SERVER_TOKEN?.trim();
const serverRoot = process.cwd();

const aiClient = createGoogleClient(serverRoot);

function sendJson(response: ServerResponse, statusCode: number, payload: unknown) {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(payload));
}

function readRequestBody(request: IncomingMessage) {
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    request.on('data', (chunk: Buffer | string) => chunks.push(Buffer.from(chunk)));
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    request.on('error', reject);
  });
}

const server = createServer(async (request, response) => {
  try {
    const requestUrl = new URL(
      request.url ?? '/',
      `http://${request.headers.host ?? `${serverHost}:${serverPort}`}`
    );

    if (requestUrl.pathname === '/health') {
      sendJson(response, 200, { ok: true });
      return;
    }

    if (requestUrl.pathname !== '/v1/generateContentStream' || request.method !== 'POST') {
      sendJson(response, 404, { error: 'Not found' });
      return;
    }

    if (requiredToken) {
      const authHeader = request.headers.authorization ?? '';
      if (authHeader !== `Bearer ${requiredToken}`) {
        sendJson(response, 401, { error: 'Unauthorized' });
        return;
      }
    }

    const rawBody = await readRequestBody(request);
    const payload = JSON.parse(rawBody || '{}');

    response.statusCode = 200;
    response.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    response.setHeader('Cache-Control', 'no-cache');
    response.setHeader('Connection', 'keep-alive');

    const stream = await aiClient.models.generateContentStream(payload);
    for await (const chunk of stream) {
      response.write(`${JSON.stringify(chunk)}\n`);
    }

    response.end();
  } catch (error: any) {
    sendJson(response, 500, {
      error: error?.message || String(error),
    });
  }
});

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(
      `Port ${serverPort} is already in use on ${serverHost}. Stop the existing server or set GEMINI_CODER_SERVER_PORT to a free port.`
    );
    process.exit(1);
    return;
  }

  console.error(error.message || String(error));
  process.exit(1);
});

server.listen(serverPort, serverHost, () => {
  console.log(`Gemini Coder server listening on http://${serverHost}:${serverPort}`);
});
