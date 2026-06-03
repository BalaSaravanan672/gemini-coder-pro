import { SessionManager } from './src/core/session.js';
import { Orchestrator } from './src/core/orchestrator.js';
async function test() {
  const sm = new SessionManager();
  const session = await sm.createSession('persona-test');
  const orchestrator = new Orchestrator(session, sm);
  await orchestrator.initialize();
  const prompt = session.history[0]?.parts[0]?.text;
  console.log('--- PROMPT START ---');
  console.log(prompt);
  console.log('--- PROMPT END ---');
  if (prompt?.includes('precision coding agent')) {
    console.log('SUCCESS: New persona detected.');
  } else {
    console.log('FAILURE: New persona not detected.');
    process.exit(1);
  }
}
test().catch((e) => {
  console.error(e);
  process.exit(1);
});
