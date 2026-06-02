import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { Content } from '@google/genai';

const SESSIONS_DIR = path.join(os.homedir(), '.gemini-coder', 'sessions');

export function normalizeWorkspaceRoot(workspaceRoot: string): string {
  return path.resolve(workspaceRoot);
}

export interface Session {
  id: string;
  name: string;
  history: Content[];
  updatedAt: string;
  tokens?: {
    prompt: number;
    candidates: number;
    total: number;
  };
  workspaceRoot?: string;
}

export class SessionManager {
  private currentSessionId: string | null = null;

  constructor() {
    this.ensureDirectory();
  }

  private async ensureDirectory() {
    try {
      await fs.mkdir(SESSIONS_DIR, { recursive: true });
    } catch (e: any) {
      console.warn(`\n[System Warning]: Failed to ensure sessions directory at ${SESSIONS_DIR}. Error: ${e.message}`);
    }
  }

  async createSession(name = 'default', workspaceRoot: string = process.cwd()): Promise<Session> {
    const normalizedWorkspaceRoot = normalizeWorkspaceRoot(workspaceRoot);
    const id = Date.now().toString();
    const session: Session = {
      id,
      name,
      history: [],
      updatedAt: new Date().toISOString(),
      tokens: { prompt: 0, candidates: 0, total: 0 },
      workspaceRoot: normalizedWorkspaceRoot,
    };
    await this.saveSession(session);
    this.currentSessionId = id;
    return session;
  }

  async saveSession(session: Session) {
    const filePath = path.join(SESSIONS_DIR, `${session.id}.json`);
    // Ensure the sessions directory exists before writing (constructor calls
    // ensureDirectory but it's async and may not complete before first write).
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(session, null, 2));
  }

  async loadSession(id: string): Promise<Session | null> {
    try {
      const filePath = path.join(SESSIONS_DIR, `${id}.json`);
      const data = await fs.readFile(filePath, 'utf8');
      const session = JSON.parse(data);
      this.currentSessionId = id;
      return session;
    } catch (e) {
      return null;
    }
  }

  async getLatestSessionForWorkspace(workspaceRoot: string): Promise<Session | null> {
    const normalizedWorkspaceRoot = normalizeWorkspaceRoot(workspaceRoot);

    try {
      const files = await fs.readdir(SESSIONS_DIR);
      if (files.length === 0) return null;

      const sessions = await Promise.all(
        files.filter(f => f.endsWith('.json')).map(async f => {
          const data = await fs.readFile(path.join(SESSIONS_DIR, f), 'utf8');
          return JSON.parse(data) as Session;
        })
      );

      return sessions
        .filter(session => session.workspaceRoot && normalizeWorkspaceRoot(session.workspaceRoot) === normalizedWorkspaceRoot)
        .sort((a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )[0] ?? null;
    } catch (e) {
      return null;
    }
  }

  async getLatestSession(): Promise<Session | null> {
    try {
      const files = await fs.readdir(SESSIONS_DIR);
      if (files.length === 0) return null;

      const sessions = await Promise.all(
        files.filter(f => f.endsWith('.json')).map(async f => {
          const data = await fs.readFile(path.join(SESSIONS_DIR, f), 'utf8');
          return JSON.parse(data) as Session;
        })
      );

      return sessions.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )[0];
    } catch (e) {
      return null;
    }
  }

  async listSessions(): Promise<Session[]> {
    try {
      const files = await fs.readdir(SESSIONS_DIR);
      const sessions = await Promise.all(
        files.filter(f => f.endsWith('.json')).map(async f => {
          const data = await fs.readFile(path.join(SESSIONS_DIR, f), 'utf8');
          return JSON.parse(data) as Session;
        })
      );
      return sessions.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    } catch (e) {
      return [];
    }
  }
}
