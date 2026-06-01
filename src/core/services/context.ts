import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';

export class ContextService {
  public static readonly REFERENCED_FILE_PATTERN = /\b(?:[\w.-]+\/)+[\w.-]+\.(?:ts|tsx|js|jsx|json|md|txt)\b/g;
  public static readonly MAX_FILE_CONTEXT_CHARS = 12000;
  public static readonly AUTO_DISCOVERY_MAX_FILES = 30;
  public static readonly AUTO_DISCOVERY_READ_LIMIT = 6;
  public static readonly BOOTSTRAP_PATTERNS = [
    '**/README.md',
    '**/README.*',
    '**/package.json',
    '**/package-lock.json',
    '**/pyproject.toml',
    '**/requirements.txt',
    '**/Pipfile',
    '**/poetry.lock',
    '**/go.mod',
    '**/Cargo.toml',
    '**/pom.xml',
    '**/build.gradle',
    '**/build.gradle.kts',
    '**/Makefile',
    '**/Dockerfile',
    '**/docker-compose.yml',
    '**/docker-compose.yaml',
    '**/tsconfig.json',
    '**/vite.config.*',
    '**/next.config.*',
    '**/nuxt.config.*',
    '**/svelte.config.*',
    '**/angular.json',
    '**/*.csproj',
    '**/*.sln',
    '**/*.rb',
    '**/*.php',
    '**/*.go',
    '**/*.rs',
    '**/*.java',
    '**/*.kt',
    '**/*.swift',
    '**/*.sh',
    '**/main.py',
    '**/app.py',
    '**/agent.py',
    '**/analyst.py',
    '**/analyst_agent.py',
    '**/quant.py',
    '**/quant_agent.py',
    '**/index.*',
    '**/main.*',
    '**/app.*',
    '**/src/**/*.{ts,tsx,js,jsx}',
    '**/src/**/*.{py,rb,go,rs,java,kt,swift,php,cs}',
    '**/app/**/*.{py,rb,go,rs,java,kt,swift,php,cs,ts,tsx,js,jsx}',
    '**/lib/**/*.{py,rb,go,rs,java,kt,swift,php,cs,ts,tsx,js,jsx}',
    '**/backend/**/*.{py,ts,tsx,js,jsx,json,rb,go,rs,java,kt,swift,php,cs}',
    '**/frontend/**/*.{ts,tsx,js,jsx,json,css,scss,html}',
    '**/server/**/*.{py,ts,tsx,js,jsx,json,rb,go,rs,java,kt,swift,php,cs}',
    '**/services/**/*.{py,ts,tsx,js,jsx,json,rb,go,rs,java,kt,swift,php,cs}',
    '**/packages/**/*.{py,ts,tsx,js,jsx,json,rb,go,rs,java,kt,swift,php,cs}',
    '**/modules/**/*.{py,ts,tsx,js,jsx,json,rb,go,rs,java,kt,swift,php,cs}',
  ].map(pattern => pattern.replace(/\s+/g, ''));

  public static isCodeTask(userText: string): boolean {
    return /\b(code|file|folder|directory|repo|repository|workspace|project|architecture|architectural|overview|design|structure|system|bug|error|fix|build|test|lint|compile|refactor|implement|edit|patch|command|function|class|ts|tsx|js|json|md|python|py|fastapi|api|backend|frontend|analyze|analyst|agent)\b/i.test(userText);
  }

  public static looksLikeContextRequest(text: string): boolean {
    const normalized = text.toLowerCase();
    // Match narration/planning/asking-for-context patterns
    return /\b(need to inspect|need to understand|need more context|please provide|paste the code|share the code|let's search|let us search|i will run|i'll run|i need to inspect|first need to inspect|run a command to|let's get started|i will start|i will list|i'll list|i will check|i'll check|i will read|i'll read|let me start|let me explore|let me check|i'm going to|i need to|let's examine|i should|i'll begin|let me begin|first i|initially i|i'll first|let me first|start by|beginning with|here's what|what i'll|what i will|let's look|let's analyze)\b/i.test(normalized);
  }

  public static shouldInjectContextMap(userText: string): boolean {
    const normalized = userText.toLowerCase();

    if (normalized.trim().length === 0) {
      return false;
    }

    const casualGreetingPattern = /^(hi|hello|hey|hola|thanks|thank you|good morning|good afternoon|good evening)([!.?\s]|$)/i;
    if (casualGreetingPattern.test(normalized)) {
      return false;
    }

    return /\b(code|file|folder|directory|repo|repository|workspace|project|architecture|architectural|overview|design|structure|system|how it works|how does it work|bug|error|fix|build|test|lint|compile|refactor|implement|edit|patch|command|function|class|ts|tsx|js|json|md)\b/i.test(normalized);
  }

  public static extractReferencedPaths(userText: string): string[] {
    const matches = userText.match(this.REFERENCED_FILE_PATTERN) ?? [];
    return Array.from(new Set(matches));
  }

  public static async loadReferencedFileContext(workspaceRoot: string, userText: string): Promise<string> {
    const referencedPaths = this.extractReferencedPaths(userText);

    if (referencedPaths.length === 0) {
      return '';
    }

    const entries: string[] = [];

    for (const referencedPath of referencedPaths.slice(0, 3)) {
      const absolutePath = path.isAbsolute(referencedPath)
        ? referencedPath
        : path.resolve(workspaceRoot, referencedPath);

      try {
        const content = await fs.readFile(absolutePath, 'utf8');
        const excerpt = content.length > this.MAX_FILE_CONTEXT_CHARS
          ? `${content.slice(0, this.MAX_FILE_CONTEXT_CHARS)}\n...[truncated]...`
          : content;

        entries.push(`FILE: ${referencedPath}\n${excerpt}`);
      } catch (error: any) {
        entries.push(`FILE: ${referencedPath}\n[Unable to read file: ${error?.message || String(error)}]`);
      }
    }

    return entries.length > 0 ? `FILE_CONTEXT:\n${entries.join('\n\n')}` : '';
  }

  public static async buildAutoDiscoveryContext(workspaceRoot: string, userText: string): Promise<string> {
    if (!this.isCodeTask(userText)) {
      return '';
    }

    try {
      const entries = await fs.readdir(workspaceRoot, { withFileTypes: true });
      const visible = entries
        .filter(entry => !entry.name.startsWith('.git'))
        .map(entry => ({
          name: entry.name,
          isDir: entry.isDirectory(),
          priority:
            entry.name === 'README.md' ? 0 :
            entry.name.startsWith('README.') ? 0 :
            entry.name === 'package.json' ? 1 :
            entry.name === 'pyproject.toml' ? 1 :
            entry.name === 'go.mod' ? 1 :
            entry.name === 'Cargo.toml' ? 1 :
            entry.name === 'pom.xml' ? 1 :
            entry.name === 'build.gradle' ? 1 :
            entry.name === 'build.gradle.kts' ? 1 :
            entry.name === 'tsconfig.json' ? 1 :
            entry.name === 'Makefile' ? 1 :
            entry.name === 'Dockerfile' ? 1 :
            entry.name === 'docker-compose.yml' ? 1 :
            entry.name === 'docker-compose.yaml' ? 1 :
            entry.name === 'pyproject.toml' ? 1 :
            entry.name === 'requirements.txt' ? 1 :
            entry.name === 'src' ? 2 :
            entry.name === 'app' ? 2 :
            entry.name === 'lib' ? 2 :
            entry.name === 'backend' ? 2 :
            entry.name === 'frontend' ? 2 :
            entry.name === 'server' ? 2 :
            entry.name === 'services' ? 2 :
            entry.name === 'packages' ? 2 :
            entry.name === 'modules' ? 2 :
            entry.name === 'tests' ? 3 :
            entry.name === 'test' ? 3 :
            entry.name === 'docs' ? 3 :
            4,
        }))
        .sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name))
        .slice(0, this.AUTO_DISCOVERY_MAX_FILES);

      const bootstrapFiles = Array.from(new Set(
        await glob(this.BOOTSTRAP_PATTERNS, {
          cwd: workspaceRoot,
          nodir: true,
          absolute: false,
          ignore: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
        })
      ))
        .filter(file => !file.includes('node_modules') && !file.includes('dist') && !file.includes('.git'))
        .sort((a, b) => {
          const rank = (file: string) => {
            if (file.endsWith('README.md')) return 0;
            if (/README\./i.test(file)) return 0;
            if (file.endsWith('package.json') || file.endsWith('pyproject.toml') || file.endsWith('requirements.txt')) return 1;
            if (file.endsWith('go.mod') || file.endsWith('Cargo.toml') || file.endsWith('pom.xml') || file.endsWith('build.gradle') || file.endsWith('build.gradle.kts')) return 1;
            if (file.endsWith('Makefile') || file.endsWith('Dockerfile') || file.endsWith('docker-compose.yml') || file.endsWith('docker-compose.yaml')) return 1;
            if (/(^|\/)analyst(_agent)?\.py$/.test(file)) return 2;
            if (/(^|\/)quant(_agent)?\.py$/.test(file)) return 2;
            if (/(^|\/)agent\.py$/.test(file)) return 3;
            if (/(^|\/)main\.py$/.test(file) || /(^|\/)app\.py$/.test(file)) return 4;
            if (file.includes('/src/')) return 5;
            if (file.includes('/app/')) return 5;
            if (file.includes('/lib/')) return 6;
            if (file.includes('/backend/')) return 7;
            if (file.includes('/server/')) return 7;
            if (file.includes('/services/')) return 7;
            if (file.includes('/frontend/')) return 8;
            return 8;
          };
          return rank(a) - rank(b) || a.localeCompare(b);
        })
        .slice(0, this.AUTO_DISCOVERY_READ_LIMIT);

      const focusFiles = [...new Set([
        ...visible.filter(entry => !entry.isDir).map(entry => entry.name),
        ...bootstrapFiles,
      ])].slice(0, this.AUTO_DISCOVERY_READ_LIMIT);

      const focusReadmes: string[] = [];
      for (const file of focusFiles) {
        try {
          const content = await fs.readFile(path.join(workspaceRoot, file), 'utf8');
          focusReadmes.push(`FILE: ${file}\n${content.slice(0, 2000)}${content.length > 2000 ? '\n...[truncated]...' : ''}`);
        } catch {
          // ignore unreadable files
        }
      }

      const directoryTree = visible
        .map(entry => `${entry.isDir ? 'DIR ' : 'FILE'} ${entry.name}`)
        .join('\n');

      return [
        'AUTO_DISCOVERY:',
        `USER_REQUEST: ${userText}`,
        'ROOT_ENTRIES:',
        directoryTree || '(empty)',
        focusReadmes.length > 0 ? `FOCUS_FILES:\n${focusReadmes.join('\n\n')}` : '',
      ].filter(Boolean).join('\n\n');
    } catch (error: any) {
      return `AUTO_DISCOVERY_ERROR: ${error?.message ?? String(error)}`;
    }
  }
}
