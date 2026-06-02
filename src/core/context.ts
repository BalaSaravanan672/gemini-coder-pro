import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, readdir } from 'fs/promises';
import path from 'path';
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

async function findWorkspaceRoot(startPath: string): Promise<{ root: string; isGitRepo: boolean } | null> {
    let currentPath = startPath;
    while (currentPath !== path.parse(currentPath).root) {
        try {
            await readFile(path.join(currentPath, 'package.json'), 'utf8');
            return { root: currentPath, isGitRepo: false };
        } catch {
            // Keep walking upward.
        }

        try {
            await readFile(path.join(currentPath, '.git'), 'utf8');
            return { root: currentPath, isGitRepo: true };
        } catch {
            // Keep walking upward.
        }

        currentPath = path.dirname(currentPath);
    }

    return null;
}

export async function getContextMap(workspaceRoot: string = process.cwd()): Promise<string> {
    const workspace = await findWorkspaceRoot(workspaceRoot);

    if (!workspace) {
        return '';
    }

    const { root, isGitRepo } = workspace;

    let files: string[] = [];
    try {
        if (isGitRepo) {
            const { stdout } = await execAsync('git ls-files --cached --others --exclude-standard', { cwd: root });
            files = stdout.split('\n').filter(f => f.trim().length > 0);
        } else {
            const entries = await readdir(root, { withFileTypes: true });
            files = entries
                .filter(entry => entry.isFile())
                .map(entry => entry.name)
                .filter(name => ['.ts', '.js', '.json', '.md', '.txt'].some(ext => name.endsWith(ext)));
        }
    } catch (e) {
        // Final fallback: only inspect the current directory, never the full home tree.
        files = await glob('*', {
            cwd: root,
            ignore: ['node_modules/**', 'dist/**', '.git/**', 'package-lock.json'],
            nodir: true 
        });
    }
  
    const results: string[] = [];
    const SIGNATURE_LIMIT = 50;
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (i < SIGNATURE_LIMIT) {
            const signature = await getSignature(path.join(root, file));
            if (signature) {
                results.push(`${file}:\n[Signature]\n${signature}\n---`);
                continue;
            }
        }
        results.push(file);
    }

    return results.join('\n');
}
