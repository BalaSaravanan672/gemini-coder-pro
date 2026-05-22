import { GoogleGenAI } from '@google/genai';
import fs from 'fs';

const credentialsPath = './gemini.json';
if (!fs.existsSync(credentialsPath)) {
  console.error('Error: gemini.json not found in root directory.');
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

export const client = new GoogleGenAI({
  project: config.project_id,
  location: 'us-central1',
  vertexai: true,
  googleAuthOptions: {
    keyFile: credentialsPath,
  },
});
