import { DiffHandler } from './src/commands/diff.js';
async function test() {
  const handler = new DiffHandler();
  // @ts-expect-error - testing invalid arguments
  await handler.execute({});
}
test().catch(console.error);
