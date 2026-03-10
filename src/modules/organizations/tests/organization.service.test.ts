import { describe, expect, it, vi } from 'vitest';
import { OrganizationService } from '../application/organization.service';

describe('OrganizationService', () => {
  it('creates organization and owner membership', async () => {
    const organizations = {
      findBySlug: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'org1', name: 'Acme', slug: 'acme', ownerUserId: 'u1' })
    };
    const memberships = { create: vi.fn().mockResolvedValue({}) };
    const permissions = { requireOrgPermission: vi.fn().mockResolvedValue(undefined) };
    const audit = { write: vi.fn().mockResolvedValue(undefined) };

    const service = new OrganizationService(
      organizations as never,
      memberships as never,
      permissions,
      audit
    );
    const result = await service.create({ actorUserId: '00000000-0000-0000-0000-000000000001', name: 'Acme', slug: 'acme' });

    expect(result.organizationId).toBe('org1');
    expect(memberships.create).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: 'org1', role: 'owner' })
    );
  });

  it('transfers ownership when actor is owner and target is member', async () => {
    const organizations = {
      findBySlug: vi.fn(),
      create: vi.fn(),
      transferOwnership: vi.fn().mockResolvedValue(undefined)
    };
    const memberships = {
      create: vi.fn(),
      findByOrganizationAndUser: vi
        .fn()
        .mockResolvedValueOnce({ role: 'owner' })
        .mockResolvedValueOnce({ role: 'admin' })
    };
    const permissions = { requireOrgPermission: vi.fn().mockResolvedValue(undefined) };
    const audit = { write: vi.fn().mockResolvedValue(undefined) };

    const service = new OrganizationService(
      organizations as never,
      memberships as never,
      permissions,
      audit
    );
    await service.transferOwnership({
      actorUserId: '00000000-0000-0000-0000-000000000001',
      organizationId: '00000000-0000-0000-0000-000000000010',
      targetUserId: '00000000-0000-0000-0000-000000000002'
    });

    expect(organizations.transferOwnership).toHaveBeenCalledWith({
      organizationId: '00000000-0000-0000-0000-000000000010',
      currentOwnerUserId: '00000000-0000-0000-0000-000000000001',
      targetOwnerUserId: '00000000-0000-0000-0000-000000000002'
    });
    expect(audit.write).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'organization.ownership_transferred' })
    );
  });

  it('rejects ownership transfer when actor is not owner', async () => {
    const organizations = {
      findBySlug: vi.fn(),
      create: vi.fn(),
      transferOwnership: vi.fn()
    };
    const memberships = {
      create: vi.fn(),
      findByOrganizationAndUser: vi.fn().mockResolvedValue({ role: 'admin' })
    };
    const permissions = {
      requireOrgPermission: vi
        .fn()
        .mockRejectedValue(new Error('Missing permission: organization:ownership.transfer'))
    };
    const audit = { write: vi.fn() };

    const service = new OrganizationService(
      organizations as never,
      memberships as never,
      permissions,
      audit
    );

    await expect(
      service.transferOwnership({
        actorUserId: '00000000-0000-0000-0000-000000000001',
        organizationId: '00000000-0000-0000-0000-000000000010',
        targetUserId: '00000000-0000-0000-0000-000000000002'
      })
    ).rejects.toThrow('Missing permission: organization:ownership.transfer');
  });

  it('rejects ownership transfer for cross-tenant target', async () => {
    const organizations = {
      findBySlug: vi.fn(),
      create: vi.fn(),
      transferOwnership: vi.fn()
    };
    const memberships = {
      create: vi.fn(),
      findByOrganizationAndUser: vi.fn().mockResolvedValue(null)
    };
    const permissions = { requireOrgPermission: vi.fn().mockResolvedValue(undefined) };
    const audit = { write: vi.fn() };

    const service = new OrganizationService(
      organizations as never,
      memberships as never,
      permissions,
      audit
    );

    await expect(
      service.transferOwnership({
        actorUserId: '00000000-0000-0000-0000-000000000001',
        organizationId: '00000000-0000-0000-0000-000000000010',
        targetUserId: '00000000-0000-0000-0000-000000000099'
      })
    ).rejects.toThrow('Target user must already be a member of this organization.');

    expect(organizations.transferOwnership).not.toHaveBeenCalled();
  });
});
