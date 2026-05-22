import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAuth } from 'google-auth-library';

async function getAccessToken() {
  try {
    const auth = new GoogleAuth({
      keyFile: './gemini.json',
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    return tokenResponse.token;
  } catch (error) {
    console.error(`Error: Failed to get access token: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

const token = await getAccessToken();
if (!token) {
  console.error('Error: Failed to retrieve access token.');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(token);

export const model = genAI.getGenerativeModel({ 
  model: 'gemini-2.0-flash-001' 
});
