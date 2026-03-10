import { describe, expect, it, vi } from 'vitest';
import { MembershipService } from '../application/membership.service';

describe('MembershipService', () => {
  it('updates role when actor has permission', async () => {
    const memberships = {
      findByOrganizationAndUser: vi.fn().mockResolvedValue({ role: 'owner' }),
      updateRole: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined)
    };
    const permissions = { requireOrgPermission: vi.fn().mockResolvedValue(undefined) };
    const audit = { write: vi.fn().mockResolvedValue(undefined) };

    const service = new MembershipService(memberships as never, permissions, audit);
    await service.updateRole({
      actorUserId: 'u1',
      organizationId: '00000000-0000-0000-0000-000000000010',
      targetUserId: '00000000-0000-0000-0000-000000000011',
      role: 'member'
    });

    expect(memberships.updateRole).toHaveBeenCalledTimes(1);
  });

  it('removes member when actor has permission', async () => {
    const memberships = {
      findByOrganizationAndUser: vi.fn().mockResolvedValue({ role: 'owner' }),
      updateRole: vi.fn(),
      remove: vi.fn().mockResolvedValue(undefined)
    };
    const permissions = { requireOrgPermission: vi.fn().mockResolvedValue(undefined) };
    const audit = { write: vi.fn().mockResolvedValue(undefined) };

    const service = new MembershipService(memberships as never, permissions, audit);
    await service.remove({
      actorUserId: 'u1',
      organizationId: '00000000-0000-0000-0000-000000000010',
      targetUserId: '00000000-0000-0000-0000-000000000011'
    });

    expect(memberships.remove).toHaveBeenCalledWith(
      '00000000-0000-0000-0000-000000000010',
      '00000000-0000-0000-0000-000000000011'
    );
  });

  it('rejects owner role assignment through generic update role flow', async () => {
    const memberships = {
      findByOrganizationAndUser: vi.fn().mockResolvedValue({ role: 'owner' }),
      updateRole: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined)
    };
    const permissions = { requireOrgPermission: vi.fn().mockResolvedValue(undefined) };
    const audit = { write: vi.fn().mockResolvedValue(undefined) };

    const service = new MembershipService(memberships as never, permissions, audit);

    await expect(
      service.updateRole({
        actorUserId: 'u1',
        organizationId: '00000000-0000-0000-0000-000000000010',
        targetUserId: '00000000-0000-0000-0000-000000000011',
        role: 'owner' as never
      })
    ).rejects.toThrow();
  });

  it('rejects remove when actor lacks permission', async () => {
    const memberships = {
      findByOrganizationAndUser: vi.fn().mockResolvedValue({ role: 'member' }),
      updateRole: vi.fn(),
      remove: vi.fn().mockResolvedValue(undefined)
    };
    const permissions = {
      requireOrgPermission: vi.fn().mockRejectedValue(new Error('Missing permission: members:remove'))
    };
    const audit = { write: vi.fn().mockResolvedValue(undefined) };

    const service = new MembershipService(memberships as never, permissions, audit);

    await expect(
      service.remove({
        actorUserId: 'u1',
        organizationId: '00000000-0000-0000-0000-000000000010',
        targetUserId: '00000000-0000-0000-0000-000000000011'
      })
    ).rejects.toThrow('Missing permission: members:remove');

    expect(memberships.remove).not.toHaveBeenCalled();
  });
});
