import { describe, it, expect } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { showDiff } from '../core/diff.js';

describe('AST-Based Robust Editing', () => {
  it('should correctly replace code using AST matching', async () => {
    // 1. Setup a temporary file
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gemini-diff-test-'));
    const tempFile = path.join(tempDir, 'test-file.ts');
    
    const initialContent = `
export function calculate(a: number, b: number) {
  // Add two numbers
  return a + b;
}
    `.trim();
    
    await fs.writeFile(tempFile, initialContent, 'utf8');

    // 2. Setup mock orchestrator
    const mockOrchestrator = {
      rl: {
        question: async () => 'y' // Auto-apply yes
      }
    } as any;

    // 3. The search string is slightly mismatched with whitespace compared to actual AST body, 
    // but in our implementation, flexibleSearch matches exact or regex, and then we VERIFY it with AST.
    // Let's test the verification flow.
    const search = 'return a + b;';
    const replace = 'return a * b; // multiplied';

    const result = await showDiff(
      mockOrchestrator,
      tempFile,
      search,
      replace,
      'Test AST edit',
      'Reason',
      true // autoApply
    );

    expect(result.success).toBe(true);

    const finalContent = await fs.readFile(tempFile, 'utf8');
    expect(finalContent).toContain('return a * b; // multiplied');

    // Cleanup
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should fallback and reject invalid AST transformations safely', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gemini-diff-test-2-'));
    const tempFile = path.join(tempDir, 'test-invalid.ts');
    
    const initialContent = `const x = 10;`;
    await fs.writeFile(tempFile, initialContent, 'utf8');

    const mockOrchestrator = {} as any;

    // The replace string introduces a syntax error (missing closing brace/paren)
    const search = '10;';
    const replace = '10; function { broken(';

    // The AST parser in showDiff should catch this and reject it.
    const result = await showDiff(
      mockOrchestrator,
      tempFile,
      search,
      replace,
      'Test invalid AST edit',
      'Reason',
      true
    );

    // It should fail to apply because the syntax is broken
    expect(result.success).toBe(false);

    // The file should remain unchanged
    const finalContent = await fs.readFile(tempFile, 'utf8');
    expect(finalContent).toBe(initialContent);

    // Cleanup
    await fs.rm(tempDir, { recursive: true, force: true });
  });
});
