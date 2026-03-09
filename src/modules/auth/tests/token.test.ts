import { describe, expect, it } from 'vitest';
import { expiresAtFromNow, generateRawToken, hashToken } from '../domain/token';

describe('token utilities', () => {
  it('generates non-empty base64url token', () => {
    const token = generateRawToken();
    expect(token.length).toBeGreaterThan(10);
  });

  it('hashes token deterministically', () => {
    const token = 'abc123';
    expect(hashToken(token)).toBe(hashToken(token));
  });

  it('returns future expiry date', () => {
    const date = expiresAtFromNow(5);
    expect(date.getTime()).toBeGreaterThan(Date.now());
  });
});
