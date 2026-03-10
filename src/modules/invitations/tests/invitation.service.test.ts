import { describe, expect, it, vi } from 'vitest';
import { InvitationService } from '../application/invitation.service';

describe('InvitationService', () => {
  it('sends invitation when actor can invite', async () => {
    const invitations = {
      create: vi.fn().mockResolvedValue({}),
      acceptValidToken: vi.fn(),
      declineValidToken: vi.fn()
    };
    const memberships = {
      findByOrganizationAndUser: vi.fn().mockResolvedValue({ role: 'owner' }),
      create: vi.fn().mockResolvedValue({})
    };
    const permissions = { requireOrgPermission: vi.fn().mockResolvedValue(undefined) };
    const entitlements = { assertCanAddMember: vi.fn().mockResolvedValue(undefined) };
    const notifier = { sendOrganizationInvite: vi.fn().mockResolvedValue(undefined) };
    const audit = { write: vi.fn().mockResolvedValue(undefined) };

    const service = new InvitationService(
      invitations as never,
      memberships as never,
      permissions,
      entitlements as never,
      notifier,
      audit
    );

    await service.send({
      actorUserId: '00000000-0000-0000-0000-000000000001',
      organizationId: '00000000-0000-0000-0000-000000000010',
      email: 'invitee@example.com',
      role: 'member',
      token: 'sample-token-value-over-20'
    });

    expect(invitations.create).toHaveBeenCalledTimes(1);
    expect(notifier.sendOrganizationInvite).toHaveBeenCalledTimes(1);
  });

  it('accepts invitation and creates membership', async () => {
    const invitations = {
      create: vi.fn(),
      acceptValidToken: vi.fn().mockResolvedValue({
        id: 'inv1',
        organizationId: '00000000-0000-0000-0000-000000000010',
        role: 'member',
        email: 'a',
        invitedByUserId: 'u1',
        tokenHash: 'x',
        expiresAt: new Date()
      }),
      declineValidToken: vi.fn()
    };
    const memberships = {
      findByOrganizationAndUser: vi.fn(),
      create: vi.fn().mockResolvedValue({})
    };
    const notifier = { sendOrganizationInvite: vi.fn() };
    const permissions = { requireOrgPermission: vi.fn().mockResolvedValue(undefined) };
    const entitlements = { assertCanAddMember: vi.fn().mockResolvedValue(undefined) };
    const audit = { write: vi.fn().mockResolvedValue(undefined) };

    const service = new InvitationService(
      invitations as never,
      memberships as never,
      permissions,
      entitlements as never,
      notifier,
      audit
    );
    const result = await service.accept({
      actorUserId: '00000000-0000-0000-0000-000000000002',
      token: 'sample-token-value-over-20'
    });

    expect(result.organizationId).toBe('00000000-0000-0000-0000-000000000010');
    expect(memberships.create).toHaveBeenCalledTimes(1);
  });

  it('declines invitation without creating membership', async () => {
    const invitations = {
      create: vi.fn(),
      acceptValidToken: vi.fn(),
      declineValidToken: vi.fn().mockResolvedValue({
        id: 'inv1',
        organizationId: '00000000-0000-0000-0000-000000000010',
        role: 'member',
        email: 'a',
        invitedByUserId: 'u1',
        tokenHash: 'x',
        expiresAt: new Date()
      })
    };
    const memberships = {
      findByOrganizationAndUser: vi.fn(),
      create: vi.fn().mockResolvedValue({})
    };
    const notifier = { sendOrganizationInvite: vi.fn() };
    const permissions = { requireOrgPermission: vi.fn().mockResolvedValue(undefined) };
    const entitlements = { assertCanAddMember: vi.fn().mockResolvedValue(undefined) };
    const audit = { write: vi.fn().mockResolvedValue(undefined) };

    const service = new InvitationService(
      invitations as never,
      memberships as never,
      permissions,
      entitlements as never,
      notifier,
      audit
    );
    const result = await service.decline({
      actorUserId: '00000000-0000-0000-0000-000000000002',
      token: 'sample-token-value-over-20'
    });

    expect(result.organizationId).toBe('00000000-0000-0000-0000-000000000010');
    expect(memberships.create).not.toHaveBeenCalled();
    expect(audit.write).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'invitation.declined', targetId: 'inv1' })
    );
  });

  it('rejects send when actor lacks invite permission', async () => {
    const invitations = {
      create: vi.fn().mockResolvedValue({}),
      acceptValidToken: vi.fn(),
      declineValidToken: vi.fn()
    };
    const memberships = {
      findByOrganizationAndUser: vi.fn().mockResolvedValue({ role: 'viewer' }),
      create: vi.fn().mockResolvedValue({})
    };
    const permissions = {
      requireOrgPermission: vi.fn().mockRejectedValue(new Error('Missing permission: members:invite'))
    };
    const entitlements = { assertCanAddMember: vi.fn().mockResolvedValue(undefined) };
    const notifier = { sendOrganizationInvite: vi.fn().mockResolvedValue(undefined) };
    const audit = { write: vi.fn().mockResolvedValue(undefined) };

    const service = new InvitationService(
      invitations as never,
      memberships as never,
      permissions,
      entitlements as never,
      notifier,
      audit
    );

    await expect(
      service.send({
        actorUserId: '00000000-0000-0000-0000-000000000001',
        organizationId: '00000000-0000-0000-0000-000000000010',
        email: 'invitee@example.com',
        role: 'member',
        token: 'sample-token-value-over-20'
      })
    ).rejects.toThrow('Missing permission: members:invite');

    expect(invitations.create).not.toHaveBeenCalled();
  });

  it('rejects send when organization has reached entitlement member limit', async () => {
    const invitations = {
      create: vi.fn().mockResolvedValue({}),
      acceptValidToken: vi.fn(),
      declineValidToken: vi.fn()
    };
    const memberships = {
      findByOrganizationAndUser: vi.fn().mockResolvedValue({ role: 'owner' }),
      create: vi.fn().mockResolvedValue({})
    };
    const permissions = { requireOrgPermission: vi.fn().mockResolvedValue(undefined) };
    const entitlements = {
      assertCanAddMember: vi.fn().mockRejectedValue(new Error('Plan member limit reached.'))
    };
    const notifier = { sendOrganizationInvite: vi.fn().mockResolvedValue(undefined) };
    const audit = { write: vi.fn().mockResolvedValue(undefined) };

    const service = new InvitationService(
      invitations as never,
      memberships as never,
      permissions,
      entitlements as never,
      notifier,
      audit
    );

    await expect(
      service.send({
        actorUserId: '00000000-0000-0000-0000-000000000001',
        organizationId: '00000000-0000-0000-0000-000000000010',
        email: 'invitee@example.com',
        role: 'member',
        token: 'sample-token-value-over-20'
      })
    ).rejects.toThrow('Plan member limit reached.');

    expect(invitations.create).not.toHaveBeenCalled();
  });
});
