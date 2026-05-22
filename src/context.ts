import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile } from 'fs/promises';
import { glob } from 'glob';

const execAsync = promisify(exec);

async function getSignature(filePath: string): Promise<string | null> {
    const keyExtensions = ['.ts', '.js', '.json', '.md'];
    if (!keyExtensions.some(ext => filePath.endsWith(ext))) {
        return null;
    }

    try {
        const content = await readFile(filePath, 'utf-8');
        const lines = content.split('\n').slice(0, 10);
        return lines.join('\n');
    } catch (e) {
        return null;
    }
}

export async function getContextMap(): Promise<string> {
    let files: string[] = [];
    try {
        const { stdout } = await execAsync('git ls-files --cached --others --exclude-standard');
        files = stdout.split('\n').filter(f => f.trim().length > 0);
    } catch (e) {
        // Fallback to glob if not a git repository
        files = await glob('**/*', { 
            ignore: ['node_modules/**', 'dist/**', '.git/**', 'package-lock.json'],
            nodir: true 
        });
    }
  
    const results = await Promise.all(files.map(async (file) => {
        const signature = await getSignature(file);
        if (signature) {
            return `${file}:\n[Signature]\n${signature}\n---`;
        }
        return file;
    }));

    return results.join('\n');
}
