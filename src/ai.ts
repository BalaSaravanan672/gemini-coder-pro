import { VertexAI } from '@google-cloud/vertexai';
import fs from 'fs';

function loadCredentials() {
  const credentialsPath = './gemini.json';
  if (!fs.existsSync(credentialsPath)) {
    console.error('Error: gemini.json not found in root directory.');
    process.exit(1);
  }
  try {
    const data = fs.readFileSync(credentialsPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error: Failed to parse gemini.json: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

const credentials = loadCredentials();

export const vertexAI = new VertexAI({
  project: credentials.project_id,
  location: 'us-central1',
  googleAuthOptions: {
    credentials: credentials
  }
});

export const model = vertexAI.getGenerativeModel({
  model: 'gemini-2.0-flash-001', // Using the stable Gemini 2.0 Flash model
});
