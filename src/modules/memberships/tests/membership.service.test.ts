import { describe, expect, it, vi } from 'vitest';
import { MembershipService } from '../application/membership.service';

type MembershipDeps = ConstructorParameters<typeof MembershipService>[0];
type PermissionDeps = ConstructorParameters<typeof MembershipService>[1];
type AuditDeps = ConstructorParameters<typeof MembershipService>[2];

function createService(overrides?: {
  memberships?: Partial<MembershipDeps>;
  permissions?: Partial<PermissionDeps>;
  audit?: Partial<AuditDeps>;
}) {
  const memberships: MembershipDeps = {
    findByOrganizationAndUser: vi.fn().mockResolvedValue({ role: 'member' }),
    updateRole: vi.fn().mockResolvedValue(true),
    remove: vi.fn().mockResolvedValue(true),
    ...overrides?.memberships
  };

  const permissions: PermissionDeps = {
    requireOrgPermission: vi.fn().mockResolvedValue(undefined),
    ...overrides?.permissions
  };

  const audit: AuditDeps = {
    write: vi.fn().mockResolvedValue(undefined),
    ...overrides?.audit
  };

  const service = new MembershipService(memberships, permissions, audit);

  return { service, memberships, permissions, audit };
}

describe('MembershipService', () => {
  it('updates role when actor has permission', async () => {
    const { service, memberships, permissions, audit } = createService();

    await service.updateRole({
      actorUserId: 'u1',
      organizationId: '00000000-0000-0000-0000-000000000010',
      targetUserId: '00000000-0000-0000-0000-000000000011',
      role: 'member'
    });

    expect(permissions.requireOrgPermission).toHaveBeenCalledTimes(1);
    expect(permissions.requireOrgPermission).toHaveBeenCalledWith({
      actorUserId: 'u1',
      organizationId: '00000000-0000-0000-0000-000000000010',
      permission: 'members:role.update'
    });
    expect(memberships.findByOrganizationAndUser).toHaveBeenCalledTimes(1);
    expect(memberships.findByOrganizationAndUser).toHaveBeenCalledWith(
      '00000000-0000-0000-0000-000000000010',
      '00000000-0000-0000-0000-000000000011'
    );
    expect(memberships.updateRole).toHaveBeenCalledTimes(1);
    expect(memberships.updateRole).toHaveBeenCalledWith({
      organizationId: '00000000-0000-0000-0000-000000000010',
      userId: '00000000-0000-0000-0000-000000000011',
      role: 'member'
    });
    expect(audit.write).toHaveBeenCalledTimes(1);
    expect(audit.write).toHaveBeenCalledWith({
      actorUserId: 'u1',
      organizationId: '00000000-0000-0000-0000-000000000010',
      action: 'membership.role_updated',
      targetType: 'membership',
      targetId: '00000000-0000-0000-0000-000000000010:00000000-0000-0000-0000-000000000011',
      metadata: { role: 'member' }
    });
  });

  it('removes member when actor has permission', async () => {
    const { service, memberships, permissions, audit } = createService();

    await service.remove({
      actorUserId: 'u1',
      organizationId: '00000000-0000-0000-0000-000000000010',
      targetUserId: '00000000-0000-0000-0000-000000000011'
    });

    expect(permissions.requireOrgPermission).toHaveBeenCalledTimes(1);
    expect(permissions.requireOrgPermission).toHaveBeenCalledWith({
      actorUserId: 'u1',
      organizationId: '00000000-0000-0000-0000-000000000010',
      permission: 'members:remove'
    });
    expect(memberships.findByOrganizationAndUser).toHaveBeenCalledTimes(1);
    expect(memberships.findByOrganizationAndUser).toHaveBeenCalledWith(
      '00000000-0000-0000-0000-000000000010',
      '00000000-0000-0000-0000-000000000011'
    );
    expect(memberships.remove).toHaveBeenCalledTimes(1);
    expect(memberships.remove).toHaveBeenCalledWith(
      '00000000-0000-0000-0000-000000000010',
      '00000000-0000-0000-0000-000000000011'
    );
    expect(audit.write).toHaveBeenCalledTimes(1);
    expect(audit.write).toHaveBeenCalledWith({
      actorUserId: 'u1',
      organizationId: '00000000-0000-0000-0000-000000000010',
      action: 'membership.removed',
      targetType: 'membership',
      targetId: '00000000-0000-0000-0000-000000000010:00000000-0000-0000-0000-000000000011'
    });
  });

  it('rejects remove when actor lacks permission', async () => {
    const { service, memberships, permissions, audit } = createService({
      permissions: {
        requireOrgPermission: vi
          .fn()
          .mockRejectedValue(new Error('Missing permission: members:remove'))
      }
    });

    await expect(
      service.remove({
        actorUserId: 'u1',
        organizationId: '00000000-0000-0000-0000-000000000010',
        targetUserId: '00000000-0000-0000-0000-000000000011'
      })
    ).rejects.toThrow('Missing permission: members:remove');

    expect(permissions.requireOrgPermission).toHaveBeenCalledTimes(1);
    expect(permissions.requireOrgPermission).toHaveBeenCalledWith({
      actorUserId: 'u1',
      organizationId: '00000000-0000-0000-0000-000000000010',
      permission: 'members:remove'
    });
    expect(memberships.findByOrganizationAndUser).not.toHaveBeenCalled();
    expect(memberships.remove).not.toHaveBeenCalled();
    expect(audit.write).not.toHaveBeenCalled();
  });

  it('rejects role update when actor lacks permission', async () => {
    const { service, memberships, permissions, audit } = createService({
      permissions: {
        requireOrgPermission: vi
          .fn()
          .mockRejectedValue(new Error('Missing permission: members:role.update'))
      }
    });

    await expect(
      service.updateRole({
        actorUserId: 'u1',
        organizationId: '00000000-0000-0000-0000-000000000010',
        targetUserId: '00000000-0000-0000-0000-000000000011',
        role: 'admin'
      })
    ).rejects.toThrow('Missing permission: members:role.update');

    expect(permissions.requireOrgPermission).toHaveBeenCalledTimes(1);
    expect(permissions.requireOrgPermission).toHaveBeenCalledWith({
      actorUserId: 'u1',
      organizationId: '00000000-0000-0000-0000-000000000010',
      permission: 'members:role.update'
    });
    expect(memberships.findByOrganizationAndUser).not.toHaveBeenCalled();
    expect(memberships.updateRole).not.toHaveBeenCalled();
    expect(audit.write).not.toHaveBeenCalled();
  });

  it('rejects generic owner role update path', async () => {
    const { service, memberships, permissions, audit } = createService({
      memberships: { findByOrganizationAndUser: vi.fn().mockResolvedValue({ role: 'owner' }) }
    });

    await expect(
      service.updateRole({
        actorUserId: 'u1',
        organizationId: '00000000-0000-0000-0000-000000000010',
        targetUserId: '00000000-0000-0000-0000-000000000011',
        role: 'admin'
      })
    ).rejects.toThrow('Owner role updates must be performed through the ownership transfer workflow.');

    expect(permissions.requireOrgPermission).toHaveBeenCalledTimes(1);
    expect(permissions.requireOrgPermission).toHaveBeenCalledWith({
      actorUserId: 'u1',
      organizationId: '00000000-0000-0000-0000-000000000010',
      permission: 'members:role.update'
    });
    expect(memberships.findByOrganizationAndUser).toHaveBeenCalledTimes(1);
    expect(memberships.findByOrganizationAndUser).toHaveBeenCalledWith(
      '00000000-0000-0000-0000-000000000010',
      '00000000-0000-0000-0000-000000000011'
    );
    expect(memberships.updateRole).not.toHaveBeenCalled();
    expect(audit.write).not.toHaveBeenCalled();
  });

  it('rejects generic owner removal path', async () => {
    const { service, memberships, permissions, audit } = createService({
      memberships: { findByOrganizationAndUser: vi.fn().mockResolvedValue({ role: 'owner' }) }
    });

    await expect(
      service.remove({
        actorUserId: 'u1',
        organizationId: '00000000-0000-0000-0000-000000000010',
        targetUserId: '00000000-0000-0000-0000-000000000011'
      })
    ).rejects.toThrow('Owner removal must be performed through the ownership transfer workflow.');

    expect(permissions.requireOrgPermission).toHaveBeenCalledTimes(1);
    expect(permissions.requireOrgPermission).toHaveBeenCalledWith({
      actorUserId: 'u1',
      organizationId: '00000000-0000-0000-0000-000000000010',
      permission: 'members:remove'
    });
    expect(memberships.findByOrganizationAndUser).toHaveBeenCalledTimes(1);
    expect(memberships.findByOrganizationAndUser).toHaveBeenCalledWith(
      '00000000-0000-0000-0000-000000000010',
      '00000000-0000-0000-0000-000000000011'
    );
    expect(memberships.remove).not.toHaveBeenCalled();
    expect(audit.write).not.toHaveBeenCalled();
  });

  it('rejects role update for missing membership', async () => {
    const { service, memberships, permissions, audit } = createService({
      memberships: {
        findByOrganizationAndUser: vi.fn().mockResolvedValue(null),
        updateRole: vi.fn().mockResolvedValue(false)
      }
    });

    await expect(
      service.updateRole({
        actorUserId: 'u1',
        organizationId: '00000000-0000-0000-0000-000000000010',
        targetUserId: '00000000-0000-0000-0000-000000000099',
        role: 'admin'
      })
    ).rejects.toThrow('Target membership was not found.');

    expect(permissions.requireOrgPermission).toHaveBeenCalledTimes(1);
    expect(permissions.requireOrgPermission).toHaveBeenCalledWith({
      actorUserId: 'u1',
      organizationId: '00000000-0000-0000-0000-000000000010',
      permission: 'members:role.update'
    });
    expect(memberships.findByOrganizationAndUser).toHaveBeenCalledTimes(1);
    expect(memberships.findByOrganizationAndUser).toHaveBeenCalledWith(
      '00000000-0000-0000-0000-000000000010',
      '00000000-0000-0000-0000-000000000099'
    );
    expect(memberships.updateRole).not.toHaveBeenCalled();
    expect(audit.write).not.toHaveBeenCalled();
  });

  it('rejects role update when membership disappears before persistence', async () => {
    const { service, memberships, permissions, audit } = createService({
      memberships: { updateRole: vi.fn().mockResolvedValue(false) }
    });

    await expect(
      service.updateRole({
        actorUserId: 'u1',
        organizationId: '00000000-0000-0000-0000-000000000010',
        targetUserId: '00000000-0000-0000-0000-000000000099',
        role: 'admin'
      })
    ).rejects.toThrow('Target membership was not found.');

    expect(permissions.requireOrgPermission).toHaveBeenCalledTimes(1);
    expect(permissions.requireOrgPermission).toHaveBeenCalledWith({
      actorUserId: 'u1',
      organizationId: '00000000-0000-0000-0000-000000000010',
      permission: 'members:role.update'
    });
    expect(memberships.findByOrganizationAndUser).toHaveBeenCalledTimes(1);
    expect(memberships.findByOrganizationAndUser).toHaveBeenCalledWith(
      '00000000-0000-0000-0000-000000000010',
      '00000000-0000-0000-0000-000000000099'
    );
    expect(memberships.updateRole).toHaveBeenCalledTimes(1);
    expect(memberships.updateRole).toHaveBeenCalledWith({
      organizationId: '00000000-0000-0000-0000-000000000010',
      userId: '00000000-0000-0000-0000-000000000099',
      role: 'admin'
    });
    expect(audit.write).not.toHaveBeenCalled();
  });

  it('rejects removal for missing membership', async () => {
    const { service, memberships, permissions, audit } = createService({
      memberships: {
        findByOrganizationAndUser: vi.fn().mockResolvedValue(null),
        remove: vi.fn().mockResolvedValue(false)
      }
    });

    await expect(
      service.remove({
        actorUserId: 'u1',
        organizationId: '00000000-0000-0000-0000-000000000010',
        targetUserId: '00000000-0000-0000-0000-000000000099'
      })
    ).rejects.toThrow('Target membership was not found.');

    expect(permissions.requireOrgPermission).toHaveBeenCalledTimes(1);
    expect(permissions.requireOrgPermission).toHaveBeenCalledWith({
      actorUserId: 'u1',
      organizationId: '00000000-0000-0000-0000-000000000010',
      permission: 'members:remove'
    });
    expect(memberships.findByOrganizationAndUser).toHaveBeenCalledTimes(1);
    expect(memberships.findByOrganizationAndUser).toHaveBeenCalledWith(
      '00000000-0000-0000-0000-000000000010',
      '00000000-0000-0000-0000-000000000099'
    );
    expect(memberships.remove).not.toHaveBeenCalled();
    expect(audit.write).not.toHaveBeenCalled();
  });

  it('rejects removal when membership disappears before persistence', async () => {
    const { service, memberships, permissions, audit } = createService({
      memberships: { remove: vi.fn().mockResolvedValue(false) }
    });

    await expect(
      service.remove({
        actorUserId: 'u1',
        organizationId: '00000000-0000-0000-0000-000000000010',
        targetUserId: '00000000-0000-0000-0000-000000000099'
      })
    ).rejects.toThrow('Target membership was not found.');

    expect(permissions.requireOrgPermission).toHaveBeenCalledTimes(1);
    expect(permissions.requireOrgPermission).toHaveBeenCalledWith({
      actorUserId: 'u1',
      organizationId: '00000000-0000-0000-0000-000000000010',
      permission: 'members:remove'
    });
    expect(memberships.findByOrganizationAndUser).toHaveBeenCalledTimes(1);
    expect(memberships.findByOrganizationAndUser).toHaveBeenCalledWith(
      '00000000-0000-0000-0000-000000000010',
      '00000000-0000-0000-0000-000000000099'
    );
    expect(memberships.remove).toHaveBeenCalledTimes(1);
    expect(memberships.remove).toHaveBeenCalledWith(
      '00000000-0000-0000-0000-000000000010',
      '00000000-0000-0000-0000-000000000099'
    );
    expect(audit.write).not.toHaveBeenCalled();
  });
});
