import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi } from 'vitest';
import { PromptInput } from './PromptInput.js';

describe('PromptInput', () => {
  it('calls onSubmit with the input text when enter is pressed', async () => {
    const onSubmit = vi.fn();
    const { stdin, lastFrame } = render(<PromptInput onSubmit={onSubmit} />);
    
    // Type something
    stdin.write('test prompt');
    
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(lastFrame()).toContain('test prompt');
    
    // Press enter
    stdin.write('\\r');
    
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(onSubmit).toHaveBeenCalledWith('test prompt');
  });
});
