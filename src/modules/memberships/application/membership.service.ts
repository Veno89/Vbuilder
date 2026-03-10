import type { AuditLogWriter } from '@/modules/audit-logs/domain/audit-log.types';
import type { OrgPermissionGuard } from '@/modules/permissions/application/org-permission.service';
import { MembershipRepository, type MembershipRole } from '../infrastructure/membership.repository';
import {
  removeMembershipSchema,
  updateMembershipRoleSchema,
  type RemoveMembershipInput,
  type UpdateMembershipRoleInput
} from '../schemas/membership.schemas';

export class MembershipService {
  constructor(
    private readonly memberships: MembershipRepository,
    private readonly permissions: OrgPermissionGuard,
    private readonly auditLogs: AuditLogWriter
  ) {}

  async updateRole(input: UpdateMembershipRoleInput & { actorUserId: string }): Promise<void> {
    const parsed = updateMembershipRoleSchema.parse(input);

    await this.permissions.requireOrgPermission({
      actorUserId: input.actorUserId,
      organizationId: parsed.organizationId,
      permission: 'members:role.update'
    });

    await this.memberships.updateRole({
      organizationId: parsed.organizationId,
      userId: parsed.targetUserId,
      role: parsed.role as MembershipRole
    });

    await this.auditLogs.write({
      actorUserId: input.actorUserId,
      organizationId: parsed.organizationId,
      action: 'membership.role_updated',
      targetType: 'membership',
      targetId: `${parsed.organizationId}:${parsed.targetUserId}`,
      metadata: { role: parsed.role }
    });
  }

  async remove(input: RemoveMembershipInput & { actorUserId: string }): Promise<void> {
    const parsed = removeMembershipSchema.parse(input);

    await this.permissions.requireOrgPermission({
      actorUserId: input.actorUserId,
      organizationId: parsed.organizationId,
      permission: 'members:remove'
    });

    await this.memberships.remove(parsed.organizationId, parsed.targetUserId);
    await this.auditLogs.write({
      actorUserId: input.actorUserId,
      organizationId: parsed.organizationId,
      action: 'membership.removed',
      targetType: 'membership',
      targetId: `${parsed.organizationId}:${parsed.targetUserId}`
    });
  }
}
