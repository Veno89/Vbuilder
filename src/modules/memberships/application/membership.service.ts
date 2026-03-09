import type { AuditLogWriter } from '@/modules/audit-logs/domain/audit-log.types';
import { requirePermission } from '@/modules/permissions/application/permission-guard.service';
import { AuthorizationError } from '@/modules/shared/domain/errors';
import { MembershipRepository, type MembershipRole } from '../infrastructure/membership.repository';

export class MembershipService {
  constructor(
    private readonly memberships: MembershipRepository,
    private readonly auditLogs: AuditLogWriter
  ) {}

  async updateRole(input: {
    actorUserId: string;
    organizationId: string;
    targetUserId: string;
    role: MembershipRole;
  }): Promise<void> {
    const actor = await this.memberships.findByOrganizationAndUser(
      input.organizationId,
      input.actorUserId
    );

    if (!actor) {
      throw new AuthorizationError('Actor is not a member of this organization.');
    }

    requirePermission(actor.role, 'members:role.update');

    await this.memberships.updateRole({
      organizationId: input.organizationId,
      userId: input.targetUserId,
      role: input.role
    });

    await this.auditLogs.write({
      actorUserId: input.actorUserId,
      organizationId: input.organizationId,
      action: 'membership.role_updated',
      targetType: 'membership',
      targetId: `${input.organizationId}:${input.targetUserId}`,
      metadata: { role: input.role }
    });
  }

  async remove(input: {
    actorUserId: string;
    organizationId: string;
    targetUserId: string;
  }): Promise<void> {
    const actor = await this.memberships.findByOrganizationAndUser(
      input.organizationId,
      input.actorUserId
    );

    if (!actor) {
      throw new AuthorizationError('Actor is not a member of this organization.');
    }

    requirePermission(actor.role, 'members:remove');

    await this.memberships.remove(input.organizationId, input.targetUserId);
    await this.auditLogs.write({
      actorUserId: input.actorUserId,
      organizationId: input.organizationId,
      action: 'membership.removed',
      targetType: 'membership',
      targetId: `${input.organizationId}:${input.targetUserId}`
    });
  }
}
