import fs from 'fs/promises';
import path from 'path';
import { Content } from '@google/generative-ai';

const SESSIONS_DIR = path.join(process.cwd(), '.gemini-coder', 'sessions');

export interface Session {
  id: string;
  name: string;
  history: Content[];
  updatedAt: string;
}

export class SessionManager {
  private currentSessionId: string | null = null;

  constructor() {
    this.ensureDirectory();
  }

  private async ensureDirectory() {
    try {
      await fs.mkdir(SESSIONS_DIR, { recursive: true });
    } catch (e) {}
  }

  async createSession(name = 'default'): Promise<Session> {
    const id = Date.now().toString();
    const session: Session = {
      id,
      name,
      history: [],
      updatedAt: new Date().toISOString()
    };
    await this.saveSession(session);
    this.currentSessionId = id;
    return session;
  }

  async saveSession(session: Session) {
    const filePath = path.join(SESSIONS_DIR, `${session.id}.json`);
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

  async getLatestSession(): Promise<Session | null> {
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
