import { describe, expect, it, vi } from 'vitest';
import { MembershipService } from '../application/membership.service';

describe('MembershipService', () => {
  it('updates role when actor has permission', async () => {
    const memberships = {
      findByOrganizationAndUser: vi.fn().mockResolvedValue({ role: 'owner' }),
      updateRole: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined)
    };
    const audit = { write: vi.fn().mockResolvedValue(undefined) };

    const service = new MembershipService(memberships as never, audit);
    await service.updateRole({
      actorUserId: 'u1',
      organizationId: 'org1',
      targetUserId: 'u2',
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
    const audit = { write: vi.fn().mockResolvedValue(undefined) };

    const service = new MembershipService(memberships as never, audit);
    await service.remove({ actorUserId: 'u1', organizationId: 'org1', targetUserId: 'u2' });

    expect(memberships.remove).toHaveBeenCalledWith('org1', 'u2');
  });
});
