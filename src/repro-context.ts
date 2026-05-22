import { getContextMap } from './context.js';

async function test() {
  console.log('Testing getContextMap for signatures...');
  const map = await getContextMap();
  
  // Check for signatures (e.g., "[Signature]")
  if (!map.includes('[Signature]')) {
    console.error('FAIL: No signatures found in context map.');
    process.exit(1);
  }
  
  console.log('PASS: Signatures found.');
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});
