import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect } from 'vitest';
import { ChatLog, Message } from './ChatLog.js';

describe('ChatLog', () => {
  it('renders a list of messages differentiating user vs assistant', () => {
    const messages: Message[] = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there' },
    ];
    const { lastFrame } = render(<ChatLog messages={messages} />);
    const output = lastFrame();
    expect(output).toContain('user: Hello');
    expect(output).toContain('assistant: Hi there');
  });
});
