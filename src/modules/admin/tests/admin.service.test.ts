import { describe, expect, it, vi } from 'vitest';
import { AdminService } from '../application/admin.service';

describe('AdminService', () => {
  it('returns overview after admin access check', async () => {
    const access = { requirePlatformAdmin: vi.fn().mockResolvedValue(undefined) };
    const repository = {
      getOverview: vi.fn().mockResolvedValue({
        totalUsers: 10,
        totalOrganizations: 5,
        totalSubscriptions: 3
      })
    };
    const audit = { write: vi.fn().mockResolvedValue(undefined) };

    const service = new AdminService(access as never, repository as never, audit as never);
    const result = await service.getOverview('user-1');

    expect(result.totalUsers).toBe(10);
    expect(audit.write).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'admin.overview.viewed' })
    );
  });
});
