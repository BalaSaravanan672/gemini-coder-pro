import { tools } from './tools.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function testTools() {
  console.log('Testing tools...');

  // Test read_files
  const testFilePath = fileURLToPath(import.meta.url);
  const results = await (tools as any).read_files({ paths: [testFilePath] });
  
  if (results.length !== 1) {
    throw new Error(`Expected 1 result, got ${results.length}`);
  }
  if (results[0].path !== testFilePath) {
    throw new Error(`Expected path ${testFilePath}, got ${results[0].path}`);
  }
  if (!results[0].content.includes('Testing tools...')) {
    throw new Error('Content does not include expected string');
  }
  console.log('✅ read_files test passed');

  // Test propose_edits
  const edits = [{ file: 'foo.ts', old: 'bar', new: 'baz' }];
  const response = await (tools as any).propose_edits({ edits });
  if (response.status !== 'pending_approval') {
    throw new Error(`Expected status pending_approval, got ${response.status}`);
  }
  if (JSON.stringify(response.edits) !== JSON.stringify(edits)) {
    throw new Error('Edits do not match');
  }
  console.log('✅ propose_edits test passed');

  console.log('All tests passed!');
}

testTools().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
