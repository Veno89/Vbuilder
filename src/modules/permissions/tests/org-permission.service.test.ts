import { describe, expect, it, vi } from 'vitest';
import { OrgPermissionService } from '../application/org-permission.service';

describe('OrgPermissionService', () => {
  it('allows actor with required org permission', async () => {
    const memberships = {
      findByOrganizationAndUser: vi.fn().mockResolvedValue({ role: 'owner' })
    };
    const service = new OrgPermissionService(memberships as never);

    await expect(
      service.requireOrgPermission({
        actorUserId: 'u1',
        organizationId: 'org1',
        permission: 'members:invite'
      })
    ).resolves.toBeUndefined();
  });

  it('rejects actor without membership', async () => {
    const memberships = {
      findByOrganizationAndUser: vi.fn().mockResolvedValue(null)
    };
    const service = new OrgPermissionService(memberships as never);

    await expect(
      service.requireOrgPermission({
        actorUserId: 'u1',
        organizationId: 'org1',
        permission: 'members:invite'
      })
    ).rejects.toThrow('Actor is not a member of this organization.');
  });
});
