import { DiffHandler } from '../commands/diff.js';

async function test() {
  const handler = new DiffHandler();
  // @ts-ignore
  await handler.execute({});
}

test().catch(console.error);
