import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

export interface ResolvedAuthConfig {
  project: string;
  location: string;
  keyFile?: string;
}

function findFileUpward(startPath: string, fileName: string): string | null {
  let currentPath = startPath;

  while (currentPath !== path.parse(currentPath).root) {
    const candidatePath = path.join(currentPath, fileName);
    if (fs.existsSync(candidatePath)) {
      return candidatePath;
    }
    currentPath = path.dirname(currentPath);
  }

  return null;
}

function loadCredentialsFromFile(filePath: string): Partial<ResolvedAuthConfig> {
  try {
    const config = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return {
      project: config.project_id,
      location: config.location,
    };
  } catch {
    return {};
  }
}

export function resolveAuthConfig(baseDir: string): ResolvedAuthConfig {
  const envCredentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const envProject =
    process.env.GOOGLE_CLOUD_PROJECT ?? process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_PROJECT_ID;
  const envLocation = process.env.GOOGLE_CLOUD_LOCATION;

  if (envCredentialsPath && fs.existsSync(envCredentialsPath)) {
    const fromEnvFile = loadCredentialsFromFile(envCredentialsPath);
    const project = envProject ?? fromEnvFile.project;

    if (!project) {
      throw new Error(
        'GOOGLE_APPLICATION_CREDENTIALS is set, but the file does not contain project_id and no Google Cloud project env var was provided.'
      );
    }

    return {
      project,
      location: envLocation ?? fromEnvFile.location ?? 'global',
      keyFile: envCredentialsPath,
    };
  }

  const localCredentialsPath = findFileUpward(baseDir, 'gemini.json');
  if (localCredentialsPath) {
    const fromLocalFile = loadCredentialsFromFile(localCredentialsPath);
    const project = envProject ?? fromLocalFile.project;

    if (!project) {
      throw new Error(
        `Found ${localCredentialsPath}, but it does not contain project_id and no Google Cloud project env var was provided.`
      );
    }

    return {
      project,
      location: envLocation ?? fromLocalFile.location ?? 'global',
      keyFile: localCredentialsPath,
    };
  }

  if (envProject) {
    return {
      project: envProject,
      location: envLocation ?? 'global',
    };
  }

  throw new Error(
    'No auth source found. Set GOOGLE_APPLICATION_CREDENTIALS, or place gemini.json in the workspace/server root, or configure GOOGLE_CLOUD_PROJECT for ADC.'
  );
}

export function createGoogleClient(baseDir: string): GoogleGenAI {
  const auth = resolveAuthConfig(baseDir);
  const googleAuthOptions = auth.keyFile
    ? {
        keyFile: auth.keyFile,
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      }
    : undefined;

  return new GoogleGenAI({
    project: auth.project,
    location: auth.location,
    vertexai: true,
    ...(googleAuthOptions ? { googleAuthOptions } : {}),
  });
}
