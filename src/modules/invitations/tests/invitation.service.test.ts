import { describe, expect, it, vi } from 'vitest';
import { InvitationService } from '../application/invitation.service';

describe('InvitationService', () => {
  it('sends invitation when actor can invite', async () => {
    const invitations = { create: vi.fn().mockResolvedValue({}), consumeValidToken: vi.fn() };
    const memberships = {
      findByOrganizationAndUser: vi.fn().mockResolvedValue({ role: 'owner' }),
      create: vi.fn().mockResolvedValue({})
    };
    const notifier = { sendOrganizationInvite: vi.fn().mockResolvedValue(undefined) };
    const audit = { write: vi.fn().mockResolvedValue(undefined) };

    const service = new InvitationService(invitations as never, memberships as never, notifier, audit);

    await service.send({
      actorUserId: '00000000-0000-0000-0000-000000000001',
      organizationId: '00000000-0000-0000-0000-000000000010',
      email: 'invitee@example.com',
      role: 'member',
      token: 'sample-token-value-over-20',
      plan: 'starter',
      currentMemberCount: 2
    });

    expect(invitations.create).toHaveBeenCalledTimes(1);
    expect(notifier.sendOrganizationInvite).toHaveBeenCalledTimes(1);
  });

  it('accepts invitation and creates membership', async () => {
    const invitations = {
      create: vi.fn(),
      consumeValidToken: vi.fn().mockResolvedValue({
        id: 'inv1',
        organizationId: 'org1',
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
    const audit = { write: vi.fn().mockResolvedValue(undefined) };

    const service = new InvitationService(invitations as never, memberships as never, notifier, audit);
    const result = await service.accept({
      actorUserId: '00000000-0000-0000-0000-000000000002',
      token: 'sample-token-value-over-20'
    });

    expect(result.organizationId).toBe('org1');
    expect(memberships.create).toHaveBeenCalledTimes(1);
  });
});
