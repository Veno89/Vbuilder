import { describe, expect, it } from 'vitest';
import { canAddMember, resolveEntitlements } from '../domain/entitlements';

describe('entitlements', () => {
  it('returns pro with highest limits and priority support', () => {
    const pro = resolveEntitlements('pro');
    expect(pro.maxMembers).toBe(100);
    expect(pro.features.prioritySupport).toBe(true);
  });

  it('blocks member creation once free plan limit is reached', () => {
    expect(canAddMember(3, 'free')).toBe(false);
  });

  it('allows member creation when under starter limit', () => {
    expect(canAddMember(10, 'starter')).toBe(true);
  });
});
