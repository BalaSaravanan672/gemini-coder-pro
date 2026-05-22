import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function getContextMap(): Promise<string> {
  const { stdout } = await execAsync('git ls-files --cached --others --exclude-standard');
  const files = stdout.split('\n').filter(f => f.trim().length > 0);
  
  return files.join('\n');
}
