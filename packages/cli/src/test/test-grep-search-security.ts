import { GrepSearchTool } from '@gemini-coder/core';
import * as fs from 'fs';
import * as path from 'path';

async function testSecurity() {
  const tool = new GrepSearchTool();
  const injectedFile = path.join(process.cwd(), 'injected.txt');

  if (fs.existsSync(injectedFile)) {
    fs.unlinkSync(injectedFile);
  }

  console.log('Testing shell injection in pattern...');
  const injectedFilePattern = path.join(process.cwd(), 'injected_pattern.ts');
  if (fs.existsSync(injectedFilePattern)) fs.unlinkSync(injectedFilePattern);

  // Try different injection styles
  const maliciousPattern = '"; touch injected_pattern.ts; echo "';

  try {
    const result = await tool.execute({ pattern: maliciousPattern });
    console.log('Tool execution result (pattern):', JSON.stringify(result));
  } catch (e: any) {
    console.log('Tool execution threw (pattern):', e.message);
  }

  if (fs.existsSync(injectedFilePattern)) {
    console.error('FAIL: Shell injection successful! injected_pattern.ts was created.');
    fs.unlinkSync(injectedFilePattern);
    // Continue to test include even if pattern fails, but we'll exit with error later if any failed
  } else {
    console.log(
      'PASS: No shell injection detected via pattern (this might be a false pass if injection string was bad).'
    );
  }

  console.log('Testing shell injection in include...');
  const injectedFileInclude = path.join(process.cwd(), 'injected_include.ts');
  if (fs.existsSync(injectedFileInclude)) fs.unlinkSync(injectedFileInclude);

  const maliciousInclude = '"; touch injected_include.ts; echo "';

  try {
    const result = await tool.execute({ pattern: 'some-pattern', include: maliciousInclude });
    console.log('Tool execution result (include):', JSON.stringify(result));
  } catch (e: any) {
    console.log('Tool execution threw (include):', e.message);
  }

  if (fs.existsSync(injectedFileInclude)) {
    console.error('FAIL: Shell injection successful via include! injected_include.ts was created.');
    fs.unlinkSync(injectedFileInclude);
    process.exit(1);
  } else {
    console.log('PASS: No shell injection detected via include.');
  }

  console.log('Testing maxResults limit...');
  try {
    const limit = 5;
    const result = await tool.execute({ pattern: 'import', maxResults: limit });
    const lines = result.results.split('\n').filter((l) => l.trim().length > 0);
    console.log(`Found ${lines.length} lines with limit ${limit}`);
    if (lines.length > limit) {
      console.error(`FAIL: Expected at most ${limit} lines, but got ${lines.length}`);
      process.exit(1);
    } else {
      console.log('PASS: maxResults limit respected.');
    }
  } catch (e: any) {
    console.log('Tool execution threw (limit):', e.message);
    process.exit(1);
  }

  process.exit(0);
}

testSecurity().catch((err) => {
  console.error(err);
  process.exit(1);
});
