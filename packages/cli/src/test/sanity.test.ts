import { describe, it, expect } from 'vitest';

describe('Quality Foundation Sanity Check', () => {
  it('should pass a basic math check', () => {
    expect(1 + 1).toBe(2);
  });

  it('should verify the environment is node', () => {
    expect(typeof process).toBe('object');
  });
});
