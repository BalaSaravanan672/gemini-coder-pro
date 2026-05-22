import { SessionManager } from './src/core/session.js';
import { Orchestrator } from './src/core/orchestrator.js';
async function test() {
    const sm = new SessionManager();
    const session = await sm.createSession('smoke-test');
    const orchestrator = new Orchestrator(session, sm);
    console.log('Initializing orchestrator...');
    await orchestrator.initialize();
    console.log('System Prompt loaded:');
    console.log(session.history[0]?.parts[0]?.text);
    if (session.history[0]?.parts[0]?.text?.includes('RESEARCH')) {
        console.log('\nSUCCESS: Claude-style persona detected in history.');
        process.exit(0);
    }
    else {
        console.log('\nFAILURE: System prompt not correctly injected.');
        process.exit(1);
    }
}
test().catch(e => { console.error(e); process.exit(1); });
