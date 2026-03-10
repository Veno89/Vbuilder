import type { AuditLogWriter } from '@/modules/audit-logs/domain/audit-log.types';
import { hashToken } from '@/modules/auth/domain/token';
import type { EntitlementEnforcementService } from '@/modules/entitlements/application/entitlement-enforcement.service';
import type { OrgPermissionGuard } from '@/modules/permissions/application/org-permission.service';
import { AuthorizationError } from '@/modules/shared/domain/errors';
import { MembershipRepository } from '@/modules/memberships/infrastructure/membership.repository';
import {
  sendInvitationSchema,
  acceptInvitationSchema,
  declineInvitationSchema,
  type AcceptInvitationInput,
  type DeclineInvitationInput,
  type SendInvitationInput
} from '../schemas/invitation.schemas';
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
    private readonly permissions: OrgPermissionGuard,
    private readonly entitlements: EntitlementEnforcementService,
    private readonly notifier: InvitationNotifier,
    private readonly auditLogs: AuditLogWriter
  ) {}

  async send(
    rawInput: SendInvitationInput & {
      actorUserId: string;
      token: string;
    }
  ): Promise<void> {
    const input = sendInvitationSchema.parse(rawInput);
    const actorUserId = rawInput.actorUserId;

    await this.permissions.requireOrgPermission({
      actorUserId,
      organizationId: input.organizationId,
      permission: 'members:invite'
    });

    await this.entitlements.assertCanAddMember(input.organizationId);

    await this.invitations.create({
      organizationId: input.organizationId,
      email: input.email,
      role: input.role,
      invitedByUserId: actorUserId,
      tokenHash: hashToken(rawInput.token),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7)
    });

    await this.notifier.sendOrganizationInvite({
      email: input.email,
      organizationId: input.organizationId,
      invitedByUserId: actorUserId,
      token: rawInput.token,
      role: input.role
    });

    await this.auditLogs.write({
      actorUserId,
      organizationId: input.organizationId,
      action: 'invitation.sent',
      targetType: 'invitation',
      targetId: `${input.organizationId}:${input.email}`,
      metadata: { role: input.role }
    });
  }

  async accept(rawInput: AcceptInvitationInput & { actorUserId: string }): Promise<{ organizationId: string }> {
    const input = acceptInvitationSchema.parse(rawInput);
    const actorUserId = rawInput.actorUserId;
    const invitation = await this.invitations.acceptValidToken(hashToken(input.token));

    if (!invitation) {
      throw new AuthorizationError('Invalid or expired invitation token.');
    }

    await this.memberships.create({
      organizationId: invitation.organizationId,
      userId: actorUserId,
      role: invitation.role
    });

    await this.auditLogs.write({
      actorUserId,
      organizationId: invitation.organizationId,
      action: 'invitation.accepted',
      targetType: 'invitation',
      targetId: invitation.id
    });

    return { organizationId: invitation.organizationId };
  }

  async decline(rawInput: DeclineInvitationInput & { actorUserId: string }): Promise<{ organizationId: string }> {
    const input = declineInvitationSchema.parse(rawInput);
    const actorUserId = rawInput.actorUserId;
    const invitation = await this.invitations.declineValidToken(hashToken(input.token));

    if (!invitation) {
      throw new AuthorizationError('Invalid or expired invitation token.');
    }

    await this.auditLogs.write({
      actorUserId,
      organizationId: invitation.organizationId,
      action: 'invitation.declined',
      targetType: 'invitation',
      targetId: invitation.id
    });

    return { organizationId: invitation.organizationId };
  }
}
