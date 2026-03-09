import type { AuditLogWriter } from '@/modules/audit-logs/domain/audit-log.types';
import { canAddMember } from '@/modules/entitlements/domain/entitlements';
import { hashToken } from '@/modules/auth/domain/token';
import { requirePermission } from '@/modules/permissions/application/permission-guard.service';
import { AuthorizationError } from '@/modules/shared/domain/errors';
import { MembershipRepository } from '@/modules/memberships/infrastructure/membership.repository';
import { sendInvitationSchema, acceptInvitationSchema, type AcceptInvitationInput, type SendInvitationInput } from '../schemas/invitation.schemas';
import { InvitationRepository } from '../infrastructure/invitation.repository';

export type InvitationNotifier = {
  sendOrganizationInvite(input: {
    email: string;
    organizationId: string;
    invitedByUserId: string;
    token: string;
    role: 'admin' | 'member' | 'viewer';
  }): Promise<void>;
};

export class InvitationService {
  constructor(
    private readonly invitations: InvitationRepository,
    private readonly memberships: MembershipRepository,
    private readonly notifier: InvitationNotifier,
    private readonly auditLogs: AuditLogWriter
  ) {}

  async send(rawInput: SendInvitationInput & { token: string; plan: 'free' | 'starter' | 'pro'; currentMemberCount: number }): Promise<void> {
    const input = sendInvitationSchema.parse(rawInput);

    const senderMembership = await this.memberships.findByOrganizationAndUser(
      input.organizationId,
      input.actorUserId
    );

    if (!senderMembership) {
      throw new AuthorizationError('Actor is not a member of this organization.');
    }

    requirePermission(senderMembership.role, 'members:invite');

    if (!canAddMember(rawInput.currentMemberCount, rawInput.plan)) {
      throw new AuthorizationError('Plan member limit reached.');
    }

    await this.invitations.create({
      organizationId: input.organizationId,
      email: input.email,
      role: input.role,
      invitedByUserId: input.actorUserId,
      tokenHash: hashToken(rawInput.token),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7)
    });

    await this.notifier.sendOrganizationInvite({
      email: input.email,
      organizationId: input.organizationId,
      invitedByUserId: input.actorUserId,
      token: rawInput.token,
      role: input.role
    });

    await this.auditLogs.write({
      actorUserId: input.actorUserId,
      organizationId: input.organizationId,
      action: 'invitation.sent',
      targetType: 'invitation',
      targetId: `${input.organizationId}:${input.email}`,
      metadata: { role: input.role }
    });
  }

  async accept(rawInput: AcceptInvitationInput): Promise<{ organizationId: string }> {
    const input = acceptInvitationSchema.parse(rawInput);
    const invitation = await this.invitations.consumeValidToken(hashToken(input.token));

    if (!invitation) {
      throw new AuthorizationError('Invalid or expired invitation token.');
    }

    await this.memberships.create({
      organizationId: invitation.organizationId,
      userId: input.actorUserId,
      role: invitation.role
    });

    await this.auditLogs.write({
      actorUserId: input.actorUserId,
      organizationId: invitation.organizationId,
      action: 'invitation.accepted',
      targetType: 'invitation',
      targetId: invitation.id
    });

    return { organizationId: invitation.organizationId };
  }
}
