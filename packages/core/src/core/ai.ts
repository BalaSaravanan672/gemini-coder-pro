import { createGoogleClient } from './auth.js';
import { createRemoteClient } from './remote-client.js';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');

const serverUrl = process.env.GEMINI_CODER_SERVER_URL;
const serverToken = process.env.GEMINI_CODER_SERVER_TOKEN;

export const client = serverUrl
  ? createRemoteClient(serverUrl, serverToken)
  : createGoogleClient(projectRoot);
