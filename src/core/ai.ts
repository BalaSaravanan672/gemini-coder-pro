import { GoogleGenAI } from '@google/genai';
import { GoogleAuth } from 'google-auth-library';
import fs from 'fs';
import path from 'path';

const credentialsPath = path.resolve(process.cwd(), 'gemini.json');
if (!fs.existsSync(credentialsPath)) {
  console.error(`Error: gemini.json not found at expected path: ${credentialsPath}`);
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

// Manual Auth Bridge: Generate a short-lived access token
async function getAuthToken() {
  try {
    const auth = new GoogleAuth({
      keyFile: credentialsPath,
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
    const client = await auth.getClient();
    const token = await client.getAccessToken();
    if (!token || !token.token) {
      throw new Error('Failed to retrieve access token.');
    }
    return token.token;
  } catch (error: any) {
    console.error(`[Auth Error] Failed to get auth token: ${error.message}`);
    process.exit(1);
  }
}

const token = await getAuthToken();

export const client = new GoogleGenAI({
  project: config.project_id,
  location: 'global',
  vertexai: true,
  httpOptions: {
    headers: {
      'Authorization': 'Bearer ' + token
    }
  }
});
