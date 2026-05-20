import { getContextMap } from './context.js';

async function test() {
  console.log('Testing getContextMap...');
  try {
    const map = await getContextMap();
    console.log('Result:');
    console.log(map);
    if (typeof map !== 'string') {
      throw new Error('Expected string output');
    }
    if (map.length === 0) {
       console.warn('Warning: Context map is empty');
    }
    console.log('Test passed!');
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

test();
