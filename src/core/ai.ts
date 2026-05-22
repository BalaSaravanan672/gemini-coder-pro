import { GoogleGenAI } from '@google/genai';
import { GoogleAuth } from 'google-auth-library';
import fs from 'fs';

const credentialsPath = './gemini.json';
if (!fs.existsSync(credentialsPath)) {
  console.error('Error: gemini.json not found in root directory.');
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

// Manual Auth Bridge: Generate a short-lived access token
async function getAuthToken() {
  const auth = new GoogleAuth({
    keyFile: credentialsPath,
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return token.token;
}

const token = await getAuthToken();

export const client = new GoogleGenAI({
  project: config.project_id,
  location: 'global',
  vertexai: true,
  headers: {
    'Authorization': 'Bearer ' + token
  }
});
