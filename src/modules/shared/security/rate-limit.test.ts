import { describe, expect, it } from 'vitest';
import { enforceRateLimit } from './rate-limit';

describe('rate limit utility', () => {
  it('blocks requests after configured limit', async () => {
    const key = `test-${Date.now()}`;
    expect((await enforceRateLimit({ key, limit: 2, windowMs: 1000 })).allowed).toBe(true);
    expect((await enforceRateLimit({ key, limit: 2, windowMs: 1000 })).allowed).toBe(true);
    expect((await enforceRateLimit({ key, limit: 2, windowMs: 1000 })).allowed).toBe(false);
  });
});
