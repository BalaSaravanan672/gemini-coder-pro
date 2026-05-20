import { glob } from 'glob';

export async function getContextMap(): Promise<string> {
  const files = await glob('**/*', { 
    ignore: ['node_modules/**', 'dist/**', '.git/**', 'gemini.json'],
    nodir: true 
  });
  return files.join('\n');
}
