import { describe, expect, it } from 'vitest';
import { hasPermission } from '../domain/permissions';

describe('permissions matrix', () => {
  it('allows owners to manage billing', () => {
    expect(hasPermission('owner', 'organization:billing.manage')).toBe(true);
  });

  it('prevents admins from managing billing', () => {
    expect(hasPermission('admin', 'organization:billing.manage')).toBe(false);
  });

  it('prevents viewers from using app features requiring write', () => {
    expect(hasPermission('viewer', 'app:use')).toBe(false);
  });

  it('allows only owners to transfer organization ownership', () => {
    expect(hasPermission('owner', 'organization:ownership.transfer')).toBe(true);
    expect(hasPermission('admin', 'organization:ownership.transfer')).toBe(false);
  });
});
