import { describe, expect, it } from 'vitest';
import { OrganizationService } from '../application/organization.service';
import { InvitationService } from '@/modules/invitations/application/invitation.service';
import { MembershipService } from '@/modules/memberships/application/membership.service';
import { hashToken } from '@/modules/auth/domain/token';
import { AuthorizationError } from '@/modules/shared/domain/errors';
import type { MembershipRole } from '@/modules/memberships/infrastructure/membership.repository';

type OrganizationRecord = {
  id: string;
  name: string;
  slug: string;
  ownerUserId: string;
};

type MembershipRecord = {
  id: string;
  organizationId: string;
  userId: string;
  role: MembershipRole;
};

type InvitationRecord = {
  id: string;
  organizationId: string;
  email: string;
  role: MembershipRole;
  invitedByUserId: string;
  tokenHash: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  declinedAt: Date | null;
};

function createStore() {
  return {
    organizations: new Map<string, OrganizationRecord>(),
    memberships: new Map<string, MembershipRecord>(),
    invitations: new Map<string, InvitationRecord>(),
    auditEvents: [] as string[]
  };
}

function membershipKey(organizationId: string, userId: string): string {
  return `${organizationId}:${userId}`;
}

describe('Organization/Invitation/Membership integration invariants', () => {
  it('enforces owner transfer invariants and keeps exactly one owner', async () => {
    const store = createStore();

    const memberships = {
      async create(input: { organizationId: string; userId: string; role: MembershipRole }) {
        const record: MembershipRecord = {
          id: `mem-${store.memberships.size + 1}`,
          organizationId: input.organizationId,
          userId: input.userId,
          role: input.role
        };
        store.memberships.set(membershipKey(input.organizationId, input.userId), record);
        return record;
      },
      async findByOrganizationAndUser(organizationId: string, userId: string) {
        return store.memberships.get(membershipKey(organizationId, userId)) ?? null;
      },
      async updateRole(input: { organizationId: string; userId: string; role: MembershipRole }) {
        const key = membershipKey(input.organizationId, input.userId);
        const existing = store.memberships.get(key);
        if (existing) {
          store.memberships.set(key, { ...existing, role: input.role });
        }
      },
      async remove(organizationId: string, userId: string) {
        store.memberships.delete(membershipKey(organizationId, userId));
      }
    };

    const organizations = {
      async create(input: { name: string; slug: string; ownerUserId: string }) {
        const record: OrganizationRecord = {
          id: '00000000-0000-0000-0000-000000000010',
          name: input.name,
          slug: input.slug,
          ownerUserId: input.ownerUserId
        };
        store.organizations.set(record.id, record);
        return record;
      },
      async findBySlug(slug: string) {
        return Array.from(store.organizations.values()).find((org) => org.slug === slug) ?? null;
      },
      async transferOwnership(input: {
        organizationId: string;
        currentOwnerUserId: string;
        targetOwnerUserId: string;
      }) {
        const org = store.organizations.get(input.organizationId);
        if (!org || org.ownerUserId !== input.currentOwnerUserId) {
          throw new Error('Ownership transfer failed due to stale owner state.');
        }

        const currentOwnerKey = membershipKey(input.organizationId, input.currentOwnerUserId);
        const targetOwnerKey = membershipKey(input.organizationId, input.targetOwnerUserId);
        const currentOwnerMembership = store.memberships.get(currentOwnerKey);
        const targetMembership = store.memberships.get(targetOwnerKey);

        if (!currentOwnerMembership || currentOwnerMembership.role !== 'owner') {
          throw new Error('Current owner membership was not in owner role.');
        }

        if (!targetMembership) {
          throw new Error('Target user is not a member of this organization.');
        }

        store.organizations.set(input.organizationId, {
          ...org,
          ownerUserId: input.targetOwnerUserId
        });
        store.memberships.set(currentOwnerKey, { ...currentOwnerMembership, role: 'admin' });
        store.memberships.set(targetOwnerKey, { ...targetMembership, role: 'owner' });
      }
    };

    const invitations = {
      async create(input: {
        organizationId: string;
        email: string;
        role: MembershipRole;
        invitedByUserId: string;
        tokenHash: string;
        expiresAt: Date;
      }) {
        const record: InvitationRecord = {
          id: `inv-${store.invitations.size + 1}`,
          ...input,
          acceptedAt: null,
          declinedAt: null
        };
        store.invitations.set(input.tokenHash, record);
        return record;
      },
      async acceptValidToken(tokenHash: string) {
        const invitation = store.invitations.get(tokenHash);
        if (!invitation || invitation.acceptedAt || invitation.declinedAt || invitation.expiresAt <= new Date()) {
          return null;
        }
        const accepted = { ...invitation, acceptedAt: new Date() };
        store.invitations.set(tokenHash, accepted);
        return accepted;
      },
      async declineValidToken(tokenHash: string) {
        const invitation = store.invitations.get(tokenHash);
        if (!invitation || invitation.acceptedAt || invitation.declinedAt || invitation.expiresAt <= new Date()) {
          return null;
        }
        const declined = { ...invitation, declinedAt: new Date() };
        store.invitations.set(tokenHash, declined);
        return declined;
      }
    };

    const notifier = { async sendOrganizationInvite() { return; } };
    const audit = {
      async write(event: { action: string }) {
        store.auditEvents.push(event.action);
      }
    };

    const permissions = {
      async requireOrgPermission(input: {
        actorUserId: string;
        organizationId: string;
        permission: 'members:invite' | 'members:remove' | 'members:role.update' | 'organization:ownership.transfer';
      }) {
        const membership = await memberships.findByOrganizationAndUser(
          input.organizationId,
          input.actorUserId
        );
        if (!membership) {
          throw new AuthorizationError('Actor is not a member of this organization.');
        }

        if (input.permission === 'members:invite' && membership.role === 'viewer') {
          throw new AuthorizationError('Missing permission: members:invite');
        }

        if (input.permission === 'members:remove' && !['owner', 'admin'].includes(membership.role)) {
          throw new AuthorizationError('Missing permission: members:remove');
        }

        if (input.permission === 'members:role.update' && !['owner', 'admin'].includes(membership.role)) {
          throw new AuthorizationError('Missing permission: members:role.update');
        }

        if (input.permission === 'organization:ownership.transfer' && membership.role !== 'owner') {
          throw new AuthorizationError('Missing permission: organization:ownership.transfer');
        }
      }
    };

    const organizationService = new OrganizationService(
      organizations as never,
      memberships as never,
      permissions,
      audit as never
    );
    const entitlements = {
      async assertCanAddMember() {
        return;
      }
    };
    const invitationService = new InvitationService(
      invitations as never,
      memberships as never,
      permissions,
      entitlements as never,
      notifier,
      audit as never
    );
    const membershipService = new MembershipService(memberships as never, permissions, audit as never);

    const ownerUserId = '00000000-0000-0000-0000-000000000001';
    const targetUserId = '00000000-0000-0000-0000-000000000002';

    const created = await organizationService.create({
      actorUserId: ownerUserId,
      name: 'Acme',
      slug: 'acme'
    });

    const invitationToken = 'raw-invite-token-value-over-20';
    await invitationService.send({
      actorUserId: ownerUserId,
      organizationId: created.organizationId,
      email: 'new-owner@example.com',
      role: 'member',
      token: invitationToken
    });

    await invitationService.accept({
      actorUserId: targetUserId,
      token: invitationToken
    });

    await membershipService.updateRole({
      actorUserId: ownerUserId,
      organizationId: created.organizationId,
      targetUserId,
      role: 'admin'
    });

    await organizationService.transferOwnership({
      actorUserId: ownerUserId,
      organizationId: created.organizationId,
      targetUserId
    });

    const updatedOrg = store.organizations.get(created.organizationId);
    expect(updatedOrg?.ownerUserId).toBe(targetUserId);

    const oldOwner = store.memberships.get(membershipKey(created.organizationId, ownerUserId));
    const newOwner = store.memberships.get(membershipKey(created.organizationId, targetUserId));
    expect(oldOwner?.role).toBe('admin');
    expect(newOwner?.role).toBe('owner');

    const ownerMemberships = Array.from(store.memberships.values()).filter(
      (membership) => membership.organizationId === created.organizationId && membership.role === 'owner'
    );
    expect(ownerMemberships).toHaveLength(1);

    expect(store.auditEvents).toEqual(
      expect.arrayContaining([
        'organization.created',
        'invitation.sent',
        'invitation.accepted',
        'membership.role_updated',
        'organization.ownership_transferred'
      ])
    );
  });

  it('enforces invitation decline single-use and blocks subsequent accept', async () => {
    const store = createStore();

    const memberships = {
      async create(input: { organizationId: string; userId: string; role: MembershipRole }) {
        const record: MembershipRecord = {
          id: `mem-${store.memberships.size + 1}`,
          organizationId: input.organizationId,
          userId: input.userId,
          role: input.role
        };
        store.memberships.set(membershipKey(input.organizationId, input.userId), record);
        return record;
      },
      async findByOrganizationAndUser(organizationId: string, userId: string) {
        return store.memberships.get(membershipKey(organizationId, userId)) ?? null;
      },
      async updateRole() {
        return;
      },
      async remove() {
        return;
      }
    };

    const organizations = {
      async create(input: { name: string; slug: string; ownerUserId: string }) {
        const record: OrganizationRecord = {
          id: '00000000-0000-0000-0000-000000000020',
          name: input.name,
          slug: input.slug,
          ownerUserId: input.ownerUserId
        };
        store.organizations.set(record.id, record);
        return record;
      },
      async findBySlug(slug: string) {
        return Array.from(store.organizations.values()).find((org) => org.slug === slug) ?? null;
      },
      async transferOwnership() {
        return;
      }
    };

    const invitations = {
      async create(input: {
        organizationId: string;
        email: string;
        role: MembershipRole;
        invitedByUserId: string;
        tokenHash: string;
        expiresAt: Date;
      }) {
        const record: InvitationRecord = {
          id: `inv-${store.invitations.size + 1}`,
          ...input,
          acceptedAt: null,
          declinedAt: null
        };
        store.invitations.set(input.tokenHash, record);
        return record;
      },
      async acceptValidToken(tokenHash: string) {
        const invitation = store.invitations.get(tokenHash);
        if (!invitation || invitation.acceptedAt || invitation.declinedAt || invitation.expiresAt <= new Date()) {
          return null;
        }
        const accepted = { ...invitation, acceptedAt: new Date() };
        store.invitations.set(tokenHash, accepted);
        return accepted;
      },
      async declineValidToken(tokenHash: string) {
        const invitation = store.invitations.get(tokenHash);
        if (!invitation || invitation.acceptedAt || invitation.declinedAt || invitation.expiresAt <= new Date()) {
          return null;
        }
        const declined = { ...invitation, declinedAt: new Date() };
        store.invitations.set(tokenHash, declined);
        return declined;
      }
    };

    const notifier = { async sendOrganizationInvite() { return; } };
    const audit = {
      async write(event: { action: string }) {
        store.auditEvents.push(event.action);
      }
    };

    const permissions = {
      async requireOrgPermission(input: {
        actorUserId: string;
        organizationId: string;
        permission: 'members:invite' | 'members:remove' | 'members:role.update' | 'organization:ownership.transfer';
      }) {
        const membership = await memberships.findByOrganizationAndUser(
          input.organizationId,
          input.actorUserId
        );
        if (!membership) {
          throw new AuthorizationError('Actor is not a member of this organization.');
        }

        if (input.permission === 'members:invite' && membership.role === 'viewer') {
          throw new AuthorizationError('Missing permission: members:invite');
        }
      }
    };

    const organizationService = new OrganizationService(
      organizations as never,
      memberships as never,
      permissions,
      audit as never
    );
    const entitlements = {
      async assertCanAddMember() {
        return;
      }
    };
    const invitationService = new InvitationService(
      invitations as never,
      memberships as never,
      permissions,
      entitlements as never,
      notifier,
      audit as never
    );

    const ownerUserId = '00000000-0000-0000-0000-000000000011';
    const inviteeUserId = '00000000-0000-0000-0000-000000000012';

    const created = await organizationService.create({
      actorUserId: ownerUserId,
      name: 'Beta',
      slug: 'beta'
    });

    const invitationToken = 'decline-invite-token-over-20';
    await invitationService.send({
      actorUserId: ownerUserId,
      organizationId: created.organizationId,
      email: 'invitee@example.com',
      role: 'member',
      token: invitationToken
    });

    await invitationService.decline({
      actorUserId: inviteeUserId,
      token: invitationToken
    });

    await expect(
      invitationService.accept({
        actorUserId: inviteeUserId,
        token: invitationToken
      })
    ).rejects.toThrow(AuthorizationError);

    expect(store.memberships.get(membershipKey(created.organizationId, inviteeUserId))).toBeUndefined();
    const invitation = store.invitations.get(hashToken(invitationToken));
    expect(invitation?.declinedAt).not.toBeNull();

    expect(store.auditEvents).toContain('invitation.declined');
  });
});
