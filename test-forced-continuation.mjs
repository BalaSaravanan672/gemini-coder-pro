import { SessionManager } from './dist/core/session.js';
import { Orchestrator } from './dist/core/orchestrator.js';

const sm = new SessionManager();
const session = await sm.createSession();
const orch = new Orchestrator(session, sm, 'gemini-3.5-flash', process.cwd());

await orch.initialize();

// Inject a test message asking for analysis
orch['session'].history.push({
  role: 'user',
  parts: [{ text: 'analyze this project briefly' }],
});

// Manually trigger processTurn to test the forced continuation
console.log('Testing forced continuation prompt after tool execution...\n');
await orch['processTurn'](0);

console.log('\n✓ Test complete. Check if model generated visible text after tool calls.');
