import { describe, expect, it, vi } from 'vitest';
import { AdminAccessService } from '../application/admin-access.service';

describe('AdminAccessService', () => {
  it('allows configured platform admin email', async () => {
    const users = { findById: vi.fn().mockResolvedValue({ email: 'admin@example.com' }) };
    const access = new AdminAccessService(users as never, new Set(['admin@example.com']));

    await expect(access.requirePlatformAdmin('user-1')).resolves.toBeUndefined();
  });

  it('rejects user outside admin allowlist', async () => {
    const users = { findById: vi.fn().mockResolvedValue({ email: 'member@example.com' }) };
    const access = new AdminAccessService(users as never, new Set(['admin@example.com']));

    await expect(access.requirePlatformAdmin('user-1')).rejects.toThrow('Admin access is required.');
  });
});
